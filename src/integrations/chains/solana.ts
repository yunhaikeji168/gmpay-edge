import { z } from "zod";
import {
	observeProviderOperation,
	type ProviderOperationCounters,
} from "../provider-observability";
import { JsonRpcRequestError, requestJsonRpc } from "./json-rpc";
import { operationDeadline, remainingOperationMs } from "./operation-deadline";
import type {
	AdapterErrorKind,
	AdapterHealth,
	NormalizedTransaction,
	PaymentAdapter,
	PaymentTarget,
	TransactionLookup,
} from "./types";

const configSchema = z.object({
	rpcUrl: z.url().default("https://api.mainnet-beta.solana.com"),
	nativeAsset: z.string().default("SOL"),
	tokens: z
		.record(
			z.string(),
			z.object({ mint: z.string(), decimals: z.number().int().min(0).max(30) }),
		)
		.default({}),
	apiKey: z.string().optional(),
	timeoutMs: z.number().int().min(1000).max(30_000).default(8000),
	commitment: z.enum(["confirmed", "finalized"]).default("finalized"),
	signaturePageSize: z.number().int().min(1).max(1000).default(1000),
	maxPages: z.number().int().min(1).max(500).default(50),
	maxTokenAccounts: z.number().int().min(1).max(128).default(16),
	maxScanSignatures: z.number().int().min(1).max(10_000).default(1000),
});
export type SolanaConfig = z.infer<typeof configSchema>;
type ScanBudget = { remainingSignatures: number };

const signatureSchema = z.object({
	blockTime: z.number().nullable().optional(),
	confirmationStatus: z.string().nullable().optional(),
	err: z.unknown().nullable().optional(),
	signature: z.string(),
	slot: z.number(),
});

export class SolanaAdapter implements PaymentAdapter<SolanaConfig> {
	readonly id = "solana";
	readonly network = "solana" as const;
	readonly configSchema = configSchema;
	readonly config: SolanaConfig;
	constructor(config: unknown) {
		this.config = this.validateConfig(config);
	}
	validateConfig(value: unknown) {
		return this.configSchema.parse(value);
	}
	async createPaymentTarget(input: { address: string; expiresAt: Date }) {
		if (!this.validateAddress(input.address))
			throw new Error("Invalid Solana address");
		return input;
	}
	validateAddress(address: string) {
		return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
	}
	validatePayment(
		transaction: NormalizedTransaction,
		target: PaymentTarget,
		assetCode: string,
	) {
		return (
			transaction.success &&
			transaction.canonical !== false &&
			transaction.to === target.address &&
			transaction.assetCode.toUpperCase() === assetCode.toUpperCase()
		);
	}
	async getTransaction(hash: string, lookup?: TransactionLookup) {
		return observeProviderOperation(
			{
				adapter: "solana",
				operation: "get_transaction",
				classifyError: (error) => this.classifyError(error),
			},
			(counters) => this.getTransactionObserved(hash, lookup, counters),
		);
	}
	private async getTransactionObserved(
		hash: string,
		lookup: TransactionLookup | undefined,
		counters: ProviderOperationCounters,
	) {
		const transaction = await this.transaction(
			hash,
			operationDeadline(this.config.timeoutMs),
			counters,
		);
		if (!transaction) return null;
		const transfer = this.transfers(transaction, hash).find(
			(item) =>
				(this.token(item.assetCode) ||
					item.assetCode === this.config.nativeAsset.toUpperCase()) &&
				(lookup?.address == null || item.to === lookup.address) &&
				(lookup?.assetCode == null ||
					item.assetCode.toUpperCase() === lookup.assetCode.toUpperCase()) &&
				(lookup?.eventIndex == null || item.eventIndex === lookup.eventIndex),
		);
		return transfer ?? null;
	}
	async findTransactions(input: {
		address: string;
		assetCode: string;
		sinceBlock?: bigint;
	}) {
		if (!this.validateAddress(input.address))
			throw new Error("Invalid Solana address");
		return observeProviderOperation(
			{
				adapter: "solana",
				operation: "find_transactions",
				classifyError: (error) => this.classifyError(error),
			},
			(counters) => this.findTransactionsObserved(input, counters),
		);
	}
	private async findTransactionsObserved(
		input: {
			address: string;
			assetCode: string;
			sinceBlock?: bigint;
		},
		counters: ProviderOperationCounters,
	) {
		const deadlineAt = operationDeadline(this.config.timeoutMs);
		const budget = { remainingSignatures: this.config.maxScanSignatures };
		const token = this.token(input.assetCode);
		if (!token) {
			if (
				input.assetCode.toUpperCase() !== this.config.nativeAsset.toUpperCase()
			)
				return [];
			return this.nativeTransactions(
				input.address,
				input.sinceBlock,
				budget,
				deadlineAt,
				counters,
			);
		}
		const accountsResult = z
			.object({ value: z.array(z.object({ pubkey: z.string() })).default([]) })
			.parse(
				await this.rpc(
					"getTokenAccountsByOwner",
					[
						input.address,
						{ mint: token.mint },
						{ commitment: this.config.commitment, encoding: "jsonParsed" },
					],
					deadlineAt,
					counters,
				),
			);
		const accounts = [
			...new Set(accountsResult.value.map((account) => account.pubkey)),
		];
		if (accounts.length > this.config.maxTokenAccounts)
			throw new Error(
				"Solana token account scan exceeded the configured limit",
			);
		const transactions: NormalizedTransaction[] = [];
		const seen = new Set<string>();
		for (const account of accounts) {
			const signatures = await this.signatures(
				account,
				input.sinceBlock,
				budget,
				deadlineAt,
				counters,
			);
			for (const signature of signatures) {
				if (
					seen.has(signature.signature) ||
					signature.err != null ||
					(input.sinceBlock != null &&
						BigInt(signature.slot) < input.sinceBlock)
				)
					continue;
				seen.add(signature.signature);
				const raw = await this.transaction(
					signature.signature,
					deadlineAt,
					counters,
				);
				if (!raw) continue;
				transactions.push(
					...this.transfers(raw, signature.signature, {
						account,
						owner: input.address,
						assetCode: input.assetCode,
						slot: signature.slot,
						...(signature.confirmationStatus
							? { confirmationStatus: signature.confirmationStatus }
							: {}),
					}),
				);
			}
		}
		return transactions;
	}
	async getConfirmations(transaction: NormalizedTransaction) {
		return observeProviderOperation(
			{
				adapter: "solana",
				operation: "get_confirmations",
				classifyError: (error) => this.classifyError(error),
			},
			async (counters) => {
				const result = z
					.object({
						value: z.array(
							z
								.object({
									confirmationStatus: z.string().nullable().optional(),
									confirmations: z.number().nullable().optional(),
								})
								.nullable(),
						),
					})
					.parse(
						await this.rpc(
							"getSignatureStatuses",
							[[transaction.hash], { searchTransactionHistory: true }],
							undefined,
							counters,
						),
					);
				const status = result.value[0];
				return status?.confirmationStatus === "finalized"
					? 1
					: Math.max(0, status?.confirmations ?? 0);
			},
		);
	}
	async healthCheck(): Promise<AdapterHealth> {
		const started = Date.now();
		try {
			const status = await observeProviderOperation(
				{
					adapter: "solana",
					operation: "health_check",
					classifyError: (error) => this.classifyError(error),
				},
				(counters) => this.rpc<string>("getHealth", [], undefined, counters),
			);
			return {
				healthy: status === "ok",
				latencyMs: Date.now() - started,
				checkedAt: new Date(),
				...(status === "ok"
					? {}
					: { detail: "Solana RPC returned an unexpected health status" }),
			};
		} catch (error) {
			return {
				healthy: false,
				latencyMs: Date.now() - started,
				checkedAt: new Date(),
				detail: `Solana health check failed: ${this.classifyError(error)}`,
			};
		}
	}
	classifyError(error: unknown): AdapterErrorKind {
		if (error instanceof JsonRpcRequestError) {
			if (error.status === 401 || error.status === 403) return "authentication";
			if (error.status === 429) return "rate_limit";
			if (error.status >= 500) return "network";
			return "permanent";
		}
		if (error instanceof z.ZodError) return "invalid_response";
		if (error instanceof TypeError || error instanceof DOMException)
			return "network";
		return "permanent";
	}
	isRetryable(kind: AdapterErrorKind) {
		return (
			kind === "network" || kind === "rate_limit" || kind === "invalid_response"
		);
	}
	private token(assetCode: string) {
		return Object.entries(this.config.tokens).find(
			([symbol]) => symbol.toUpperCase() === assetCode.toUpperCase(),
		)?.[1];
	}
	private symbol(mint: string) {
		return (
			Object.entries(this.config.tokens).find(
				([, token]) => token.mint === mint,
			)?.[0] ?? mint
		);
	}
	private async nativeTransactions(
		address: string,
		sinceBlock: bigint | undefined,
		budget: ScanBudget,
		deadlineAt: number,
		counters: ProviderOperationCounters,
	) {
		const signatures = await this.signatures(
			address,
			sinceBlock,
			budget,
			deadlineAt,
			counters,
		);
		const transactions: NormalizedTransaction[] = [];
		for (const signature of signatures) {
			if (
				signature.err != null ||
				(sinceBlock != null && BigInt(signature.slot) < sinceBlock)
			)
				continue;
			const raw = await this.transaction(
				signature.signature,
				deadlineAt,
				counters,
			);
			if (!raw) continue;
			transactions.push(
				...this.transfers(raw, signature.signature, {
					account: address,
					owner: address,
					assetCode: this.config.nativeAsset,
					slot: signature.slot,
					...(signature.confirmationStatus
						? { confirmationStatus: signature.confirmationStatus }
						: {}),
				}),
			);
		}
		return transactions;
	}
	private async signatures(
		address: string,
		sinceBlock: bigint | undefined,
		budget: ScanBudget,
		deadlineAt: number,
		counters: ProviderOperationCounters,
	) {
		const signatures: z.infer<typeof signatureSchema>[] = [];
		let before: string | undefined;
		for (let page = 0; page < this.config.maxPages; page += 1) {
			counters.page();
			if (budget.remainingSignatures <= 0)
				throw new Error("Solana signature scan exceeded the configured limit");
			const pageSize = Math.min(
				this.config.signaturePageSize,
				budget.remainingSignatures,
			);
			const batch = z.array(signatureSchema).parse(
				await this.rpc(
					"getSignaturesForAddress",
					[
						address,
						{
							commitment: this.config.commitment,
							limit: pageSize,
							...(before ? { before } : {}),
						},
					],
					deadlineAt,
					counters,
				),
			);
			if (batch.length > budget.remainingSignatures)
				throw new Error("Solana RPC exceeded the requested signature limit");
			budget.remainingSignatures -= batch.length;
			signatures.push(...batch);
			const reachedSince =
				sinceBlock != null &&
				batch.some((signature) => BigInt(signature.slot) < sinceBlock);
			if (batch.length < pageSize || reachedSince) return signatures;
			if (budget.remainingSignatures === 0)
				throw new Error("Solana signature scan exceeded the configured limit");
			const next = batch.at(-1)?.signature;
			if (!next || next === before)
				throw new Error("Solana RPC repeated its signature cursor");
			before = next;
		}
		throw new Error(
			"Solana signature pagination exceeded the configured limit",
		);
	}
	private async transaction(
		signature: string,
		deadlineAt = operationDeadline(this.config.timeoutMs),
		counters?: ProviderOperationCounters,
	) {
		const value = await this.rpc<unknown>(
			"getTransaction",
			[
				signature,
				{
					commitment: this.config.commitment,
					encoding: "jsonParsed",
					maxSupportedTransactionVersion: 0,
				},
			],
			deadlineAt,
			counters,
		);
		return value && typeof value === "object"
			? (value as Record<string, unknown>)
			: null;
	}
	private transfers(
		raw: Record<string, unknown>,
		signature: string,
		override?: {
			account: string;
			owner: string;
			assetCode: string;
			slot: number;
			confirmationStatus?: string;
		},
	) {
		const transaction = raw.transaction as
			| {
					message?: {
						accountKeys?: unknown[];
						instructions?: unknown[];
						recentBlockhash?: unknown;
					};
			  }
			| undefined;
		const meta = raw.meta as
			| {
					err?: unknown;
					innerInstructions?: Array<{ instructions?: unknown[] }>;
					postTokenBalances?: Array<{
						accountIndex?: number;
						mint?: string;
						owner?: string;
					}>;
			  }
			| undefined;
		const accountKeys = (transaction?.message?.accountKeys ?? []).map(
			accountKey,
		);
		const owners = new Map(
			(meta?.postTokenBalances ?? []).map((balance) => [
				accountKeys[balance.accountIndex ?? -1],
				{
					mint: String(balance.mint ?? ""),
					owner: String(balance.owner ?? ""),
				},
			]),
		);
		const instructions = [
			...(transaction?.message?.instructions ?? []),
			...(meta?.innerInstructions ?? []).flatMap(
				(group) => group.instructions ?? [],
			),
		];
		const out: NormalizedTransaction[] = [];
		for (const [eventIndex, item] of instructions.entries()) {
			if (!item || typeof item !== "object") continue;
			const parsed = (
				item as { parsed?: { info?: Record<string, unknown>; type?: string } }
			).parsed;
			if (!parsed?.info || !parsed.type?.startsWith("transfer")) continue;
			const destination = String(parsed.info.destination ?? "");
			if (override && destination !== override.account) continue;
			const lamports = parsed.info.lamports;
			if (
				lamports != null &&
				(!override ||
					override.assetCode.toUpperCase() ===
						this.config.nativeAsset.toUpperCase())
			) {
				const amountUnits = safeAtomicAmount(lamports);
				if (amountUnits == null) continue;
				const slot = Number(override?.slot ?? raw.slot ?? 0);
				out.push({
					network: "solana",
					hash: signature,
					eventIndex,
					from: String(parsed.info.source ?? ""),
					to: override?.owner ?? destination,
					assetCode: this.config.nativeAsset.toUpperCase(),
					amountUnits,
					blockNumber: BigInt(slot),
					blockHash: String(transaction?.message?.recentBlockhash ?? signature),
					confirmations:
						(override?.confirmationStatus ?? "finalized") === "finalized"
							? 1
							: 0,
					timestamp: new Date(Number(raw.blockTime ?? 0) * 1000),
					success: meta?.err == null,
					canonical: true,
				});
				continue;
			}
			const balance = owners.get(destination);
			const mint = String(parsed.info.mint ?? balance?.mint ?? "");
			const assetCode = override?.assetCode ?? this.symbol(mint);
			const token = this.token(assetCode);
			if (!token || token.mint !== mint) continue;
			const tokenAmount = parsed.info.tokenAmount as
				| { amount?: unknown }
				| undefined;
			const amountUnits = safeAtomicAmount(
				tokenAmount?.amount ?? parsed.info.amount ?? "0",
			);
			if (amountUnits == null) continue;
			const slot = Number(override?.slot ?? raw.slot ?? 0);
			out.push({
				network: "solana",
				hash: signature,
				eventIndex,
				from: String(parsed.info.source ?? ""),
				to: override?.owner ?? balance?.owner ?? destination,
				assetCode: assetCode.toUpperCase(),
				amountUnits,
				blockNumber: BigInt(slot),
				blockHash: String(transaction?.message?.recentBlockhash ?? signature),
				confirmations:
					(override?.confirmationStatus ?? "finalized") === "finalized" ? 1 : 0,
				timestamp: new Date(Number(raw.blockTime ?? 0) * 1000),
				success: meta?.err == null,
				canonical: true,
			});
		}
		return out;
	}
	private async rpc<T>(
		method: string,
		params: unknown[],
		deadlineAt?: number,
		counters?: ProviderOperationCounters,
	): Promise<T> {
		counters?.request();
		return requestJsonRpc<T>({
			url: this.config.rpcUrl,
			method,
			params,
			timeoutMs:
				deadlineAt == null
					? this.config.timeoutMs
					: remainingOperationMs(deadlineAt, "Solana operation"),
			...(this.config.apiKey ? { apiKey: this.config.apiKey } : {}),
		});
	}
}
function accountKey(value: unknown) {
	return typeof value === "string"
		? value
		: String((value as { pubkey?: unknown } | null)?.pubkey ?? "");
}

function safeAtomicAmount(value: unknown): bigint | null {
	if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
	if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
		return BigInt(value);
	return null;
}
