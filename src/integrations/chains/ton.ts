import { z } from "zod";
import {
	observeProviderOperation,
	type ProviderOperationCounters,
} from "../provider-observability";
import { operationDeadline, operationSignal } from "./operation-deadline";
import type {
	AdapterErrorKind,
	AdapterHealth,
	NormalizedTransaction,
	PaymentAdapter,
	PaymentTarget,
	TransactionLookup,
} from "./types";

const configSchema = z.object({
	apiUrl: z.url().default("https://toncenter.com/api/v3"),
	nativeAsset: z.string().default("GRAM"),
	tokens: z
		.record(
			z.string(),
			z.object({
				master: z.string(),
				decimals: z.number().int().min(0).max(30),
			}),
		)
		.default({}),
	apiKey: z.string().optional(),
	timeoutMs: z.number().int().min(1000).max(30_000).default(8000),
	maxPages: z.number().int().min(1).max(500).default(50),
});
export type TonConfig = z.infer<typeof configSchema>;

const messageSchema = z.object({
	source: z.string().optional(),
	destination: z.string().optional(),
	value: z.string().optional(),
});
const transactionSchema = z.object({
	hash: z.string(),
	lt: z.string(),
	now: z.number(),
	in_msg: messageSchema.optional(),
	success: z.boolean().optional(),
});
const jettonSchema = z.object({
	// TON amounts are atomic values and must remain strings until BigInt.
	amount: z.string(),
	destination: z.string().optional(),
	jetton_master: z.string(),
	query_id: z.union([z.string(), z.number()]).optional(),
	source: z.string().optional(),
	transaction_hash: z.string(),
	transaction_lt: z.string().optional(),
	transaction_now: z.number(),
});

export class TonAdapter implements PaymentAdapter<TonConfig> {
	readonly id = "ton";
	readonly network = "ton" as const;
	readonly configSchema = configSchema;
	readonly config: TonConfig;
	constructor(config: unknown) {
		this.config = this.validateConfig(config);
	}
	validateConfig(value: unknown) {
		return this.configSchema.parse(value);
	}
	async createPaymentTarget(input: { address: string; expiresAt: Date }) {
		if (!this.validateAddress(input.address))
			throw new Error("Invalid TON address");
		return input;
	}
	validateAddress(address: string) {
		return /^(EQ|UQ)[A-Za-z0-9_-]{46}$/.test(address);
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
				adapter: "ton",
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
		const deadlineAt = operationDeadline(this.config.timeoutMs);
		const jettons = await this.jettons(
			`/jetton/transfers?transaction_hash=${encodeURIComponent(hash)}&limit=100`,
			deadlineAt,
			counters,
		);
		const jetton = jettons.find((row) => {
			const assetCode = this.symbol(row.jetton_master);
			return (
				(lookup?.address == null || row.destination === lookup.address) &&
				(lookup?.assetCode == null ||
					assetCode.toUpperCase() === lookup.assetCode.toUpperCase()) &&
				(lookup?.eventIndex == null ||
					safeEventIndex(row.query_id) === lookup.eventIndex)
			);
		});
		if (jetton)
			return this.normalizeJetton(
				jetton,
				jetton.destination ?? "",
				lookup?.assetCode,
			);
		const rows = await this.transactions(
			`/transactions?hash=${encodeURIComponent(hash)}&limit=1`,
			deadlineAt,
			counters,
		);
		const native = rows.find(
			(row) =>
				(lookup?.address == null ||
					row.in_msg?.destination === lookup.address) &&
				(lookup?.assetCode == null ||
					lookup.assetCode.toUpperCase() ===
						this.config.nativeAsset.toUpperCase()) &&
				(lookup?.eventIndex == null || lookup.eventIndex === 0),
		);
		return native
			? this.normalizeNative(native, native.in_msg?.destination ?? "")
			: null;
	}
	async findTransactions(input: {
		address: string;
		assetCode: string;
		sinceBlock?: bigint;
	}) {
		if (!this.validateAddress(input.address))
			throw new Error("Invalid TON address");
		return observeProviderOperation(
			{
				adapter: "ton",
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
		const token = this.token(input.assetCode);
		if (token) {
			const rows = await this.paginatedJettons(
				`/jetton/transfers?owner_address=${encodeURIComponent(input.address)}&direction=in&limit=100`,
				input.sinceBlock,
				deadlineAt,
				counters,
			);
			return rows
				.filter(
					(row) =>
						row.jetton_master === token.master &&
						(input.sinceBlock == null ||
							BigInt(row.transaction_lt ?? 0) >= input.sinceBlock),
				)
				.map((row) =>
					this.normalizeJetton(row, input.address, input.assetCode),
				);
		}
		if (input.assetCode.toUpperCase() !== this.config.nativeAsset.toUpperCase())
			return [];
		const rows = await this.paginatedTransactions(
			`/transactions?account=${encodeURIComponent(input.address)}&limit=100&sort=desc`,
			input.sinceBlock,
			deadlineAt,
			counters,
		);
		return rows
			.filter(
				(row) =>
					row.in_msg?.destination === input.address &&
					(input.sinceBlock == null || BigInt(row.lt) >= input.sinceBlock),
			)
			.map((row) => this.normalizeNative(row, input.address));
	}
	async getConfirmations(transaction: NormalizedTransaction) {
		return transaction.success ? 1 : 0;
	}
	async healthCheck(): Promise<AdapterHealth> {
		const started = Date.now();
		try {
			await observeProviderOperation(
				{
					adapter: "ton",
					operation: "health_check",
					classifyError: (error) => this.classifyError(error),
				},
				(counters) => this.request("/masterchainInfo", undefined, counters),
			);
			return {
				healthy: true,
				latencyMs: Date.now() - started,
				checkedAt: new Date(),
			};
		} catch (error) {
			return {
				healthy: false,
				latencyMs: Date.now() - started,
				checkedAt: new Date(),
				detail: `TON health check failed: ${this.classifyError(error)}`,
			};
		}
	}
	classifyError(error: unknown): AdapterErrorKind {
		if (error instanceof TonHttpError) {
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
	private symbol(master: string) {
		return (
			Object.entries(this.config.tokens).find(
				([, token]) => token.master === master,
			)?.[0] ?? master
		);
	}
	private async transactions(
		path: string,
		deadlineAt = operationDeadline(this.config.timeoutMs),
		counters?: ProviderOperationCounters,
	) {
		const payload = z
			.object({ transactions: z.array(transactionSchema).default([]) })
			.parse(await this.request(path, deadlineAt, counters));
		return payload.transactions;
	}
	private async jettons(
		path: string,
		deadlineAt = operationDeadline(this.config.timeoutMs),
		counters?: ProviderOperationCounters,
	) {
		const payload = z
			.object({ jetton_transfers: z.array(jettonSchema).default([]) })
			.parse(await this.request(path, deadlineAt, counters));
		return payload.jetton_transfers;
	}
	private async paginatedTransactions(
		path: string,
		sinceBlock: bigint | undefined,
		deadlineAt: number,
		counters: ProviderOperationCounters,
	) {
		const rows: z.infer<typeof transactionSchema>[] = [];
		for (let page = 0; page < this.config.maxPages; page += 1) {
			counters.page();
			const batch = await this.transactions(
				`${path}&offset=${page * 100}`,
				deadlineAt,
				counters,
			);
			rows.push(...batch);
			if (
				batch.length < 100 ||
				(sinceBlock != null && batch.some((row) => BigInt(row.lt) < sinceBlock))
			)
				return rows;
		}
		throw new Error("TON transaction pagination exceeded the configured limit");
	}
	private async paginatedJettons(
		path: string,
		sinceBlock: bigint | undefined,
		deadlineAt: number,
		counters: ProviderOperationCounters,
	) {
		const rows: z.infer<typeof jettonSchema>[] = [];
		for (let page = 0; page < this.config.maxPages; page += 1) {
			counters.page();
			const batch = await this.jettons(
				`${path}&offset=${page * 100}`,
				deadlineAt,
				counters,
			);
			rows.push(...batch);
			if (
				batch.length < 100 ||
				(sinceBlock != null &&
					batch.some((row) => BigInt(row.transaction_lt ?? 0) < sinceBlock))
			)
				return rows;
		}
		throw new Error("TON Jetton pagination exceeded the configured limit");
	}
	private normalizeNative(
		row: z.infer<typeof transactionSchema>,
		address: string,
	): NormalizedTransaction {
		return {
			network: "ton",
			hash: row.hash,
			eventIndex: 0,
			from: row.in_msg?.source ?? "",
			to: address,
			assetCode: this.config.nativeAsset.toUpperCase(),
			amountUnits: BigInt(row.in_msg?.value ?? 0),
			blockNumber: BigInt(row.lt),
			blockHash: row.hash,
			confirmations: row.success === false ? 0 : 1,
			timestamp: new Date(row.now * 1000),
			success: row.success !== false,
			canonical: true,
		};
	}
	private normalizeJetton(
		row: z.infer<typeof jettonSchema>,
		address: string,
		assetCode = this.symbol(row.jetton_master),
	): NormalizedTransaction {
		return {
			network: "ton",
			hash: row.transaction_hash,
			eventIndex: safeEventIndex(row.query_id),
			from: row.source ?? "",
			to: address,
			assetCode: assetCode.toUpperCase(),
			amountUnits: BigInt(row.amount),
			blockNumber: BigInt(row.transaction_lt ?? 0),
			blockHash: row.transaction_hash,
			confirmations: 1,
			timestamp: new Date(row.transaction_now * 1000),
			success: true,
			canonical: true,
		};
	}
	private async request(
		path: string,
		deadlineAt = operationDeadline(this.config.timeoutMs),
		counters?: ProviderOperationCounters,
	) {
		counters?.request();
		const response = await fetch(
			`${this.config.apiUrl.replace(/\/$/, "")}${path}`,
			{
				headers: {
					accept: "application/json",
					...(this.config.apiKey ? { "X-API-Key": this.config.apiKey } : {}),
				},
				signal: operationSignal(deadlineAt, "TON operation"),
			},
		);
		if (!response.ok) throw new TonHttpError(response.status);
		return response.json();
	}
}

class TonHttpError extends Error {
	constructor(readonly status: number) {
		super(`TON Center returned HTTP ${status}`);
	}
}
function safeEventIndex(value: string | number | undefined) {
	const parsed = Number(value ?? 0);
	return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}
