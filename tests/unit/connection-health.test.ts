import { describe, expect, it } from "vitest";
import {
	refreshEnabledPaymentConnectionHealth,
	testPaymentConnection,
} from "#/features/payment-settings/server/connection-health";
import { loadPaymentConnectionHealthTargets } from "#/features/payment-settings/server/method-adapter";

describe("payment connection health concurrency", () => {
	it("returns the stable not-found contract for a missing connection", async () => {
		const db = {
			prepare: () => ({
				bind: () => ({ first: async () => null }),
			}),
		} as unknown as D1Database;

		await expect(testPaymentConnection(db, "missing")).rejects.toMatchObject({
			code: "payment_connection_not_found",
			status: 404,
		});
	});

	it("checks at most three external connections concurrently", async () => {
		let active = 0;
		let maximum = 0;
		let batchSize = 0;
		const db = {
			prepare: () => ({ bind: () => ({}) }),
			batch: async (statements: unknown[]) => {
				batchSize = statements.length;
				return [];
			},
		} as unknown as D1Database;
		const targets = Array.from({ length: 8 }, (_, index) => ({
			id: `connection-${index}`,
			adapter: {
				healthCheck: async () => {
					active += 1;
					maximum = Math.max(maximum, active);
					await new Promise((resolve) => setTimeout(resolve, 5));
					active -= 1;
					if (index === 7) throw new Error("network");
					return {
						healthy: index !== 6,
						latencyMs: 1,
						checkedAt: new Date(),
					};
				},
			},
		}));
		const loadTargets = (async () =>
			targets) as unknown as typeof loadPaymentConnectionHealthTargets;

		const result = await refreshEnabledPaymentConnectionHealth(
			db,
			20,
			loadTargets,
		);

		expect(result).toEqual({ checked: 8, healthy: 6, unhealthy: 2 });
		expect(maximum).toBe(3);
		expect(batchSize).toBe(8);
	});

	it("loads all enabled chain adapters with one D1 query", async () => {
		let statements = 0;
		let query = "";
		let bindings: unknown[] = [];
		const db = {
			prepare: (sql: string) => {
				statements += 1;
				query = sql;
				return {
					bind: (...values: unknown[]) => {
						bindings = values;
						return {
							all: async () => ({
								results: [
									{
										connection_id: "tron-http",
										adapter: "tron",
										transport: "http",
										endpoint: "https://api.trongrid.io",
										api_key: null,
										asset_code: "TRX",
										rail_code: "tron",
										asset_kind: "native",
										contract_address: null,
										decimals: 6,
										native_symbol: "TRX",
									},
								],
							}),
						};
					},
				};
			},
		} as unknown as D1Database;

		const targets = await loadPaymentConnectionHealthTargets(
			db,
			20,
			1_000_000,
			60_000,
		);
		expect(statements).toBe(1);
		expect(bindings).toEqual([940_000, 20]);
		expect(query).toContain(
			"pc.last_checked_at IS NULL OR pc.last_checked_at <= ?",
		);
		expect(query).toContain(
			"ORDER BY pc.last_checked_at IS NOT NULL, pc.last_checked_at",
		);
		expect(targets).toHaveLength(1);
		expect(targets[0]?.id).toBe("tron-http");
		expect(targets[0]?.adapter).not.toBeNull();
	});
});
