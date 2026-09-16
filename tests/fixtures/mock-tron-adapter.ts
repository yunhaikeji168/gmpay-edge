import { z } from "zod";
import type {
	AdapterErrorKind,
	AdapterHealth,
	NormalizedTransaction,
	PaymentAdapter,
	PaymentTarget,
} from "#/integrations/chains/types";

export class MockTronAdapter implements PaymentAdapter<Record<string, never>> {
	readonly id = "mock-tron";
	readonly network = "tron" as const;
	readonly configSchema = z.object({});
	private readonly transactions = new Map<string, NormalizedTransaction>();

	validateConfig(value: unknown) {
		return this.configSchema.parse(value);
	}

	async createPaymentTarget(input: {
		address: string;
		expiresAt: Date;
	}): Promise<PaymentTarget> {
		return { ...input };
	}

	validateAddress(address: string) {
		return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
	}

	validatePayment(
		tx: NormalizedTransaction,
		target: PaymentTarget,
		assetCode: string,
	) {
		return tx.success && tx.to === target.address && tx.assetCode === assetCode;
	}

	async getTransaction(hash: string) {
		return this.transactions.get(hash) ?? null;
	}

	async findTransactions(input: { address: string; assetCode: string }) {
		return [...this.transactions.values()].filter(
			(tx) => tx.to === input.address && tx.assetCode === input.assetCode,
		);
	}

	async getConfirmations(tx: NormalizedTransaction) {
		return tx.confirmations;
	}

	async healthCheck(): Promise<AdapterHealth> {
		return {
			healthy: true,
			latencyMs: 0,
			checkedAt: new Date(),
			detail: "In-memory simulation",
		};
	}

	classifyError(_error: unknown): AdapterErrorKind {
		return "permanent";
	}

	isRetryable(kind: AdapterErrorKind) {
		return kind === "network" || kind === "rate_limit";
	}

	record(transaction: NormalizedTransaction) {
		this.transactions.set(transaction.hash, transaction);
	}
}
