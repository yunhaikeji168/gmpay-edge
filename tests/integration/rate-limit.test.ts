import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { claimCheckoutRateLimit } from "#/features/checkout/server/rate-limit";
import {
	createDatastoreCounters,
	instrumentD1,
} from "../helpers/datastore-counters";
import { applyMigrations } from "./migrations";

describe("D1 rate limit counters", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-rate-limit" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
	});

	afterAll(async () => miniflare.dispose());

	it("allows exactly the configured number under concurrent contention", async () => {
		const results = await Promise.all(
			Array.from({ length: 20 }, () =>
				claimCheckoutRateLimit(db, {
					action: "transaction",
					orderId: "order-1",
					clientAddress: "203.0.113.10",
					now: 1_700_000_000_001,
				}),
			),
		);

		expect(results.filter((result) => result.allowed)).toHaveLength(5);
		expect(results.filter((result) => !result.allowed)).toHaveLength(15);
		expect(
			await db
				.prepare("SELECT bucket_key, count FROM rate_limit_counters LIMIT 1")
				.first<{ bucket_key: string; count: number }>(),
		).toEqual({
			bucket_key: expect.stringMatching(/^[a-f0-9]{64}$/),
			count: 5,
		});
	});

	it("fails closed when the required rate-limit table is missing", async () => {
		const emptySchema = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-rate-limit-empty-schema" },
		});
		try {
			const emptyDatabase = await emptySchema.getD1Database("DB");
			await expect(
				claimCheckoutRateLimit(emptyDatabase, {
					action: "review",
					orderId: "missing-schema",
					clientAddress: "203.0.113.10",
					now: 1_700_000_000_001,
				}),
			).rejects.toBeTruthy();
			const tables = await emptyDatabase
				.prepare(
					"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'rate_limit_counters'",
				)
				.all();
			expect(tables.results).toEqual([]);
		} finally {
			await emptySchema.dispose();
		}
	});

	it("enforces each action policy, isolates orders, and permits the next window", async () => {
		const optionResults = await Promise.all(
			Array.from({ length: 11 }, () =>
				claimCheckoutRateLimit(db, {
					action: "option",
					orderId: "order-2",
					clientAddress: "203.0.113.10",
					now: 1_700_000_000_001,
				}),
			),
		);
		expect(optionResults.filter(({ allowed }) => allowed)).toHaveLength(10);
		expect(optionResults.filter(({ allowed }) => !allowed)).toHaveLength(1);

		const reviewResults = await Promise.all(
			Array.from({ length: 4 }, () =>
				claimCheckoutRateLimit(db, {
					action: "review",
					orderId: "order-2",
					clientAddress: "203.0.113.10",
					now: 1_700_000_000_001,
				}),
			),
		);
		expect(reviewResults.filter(({ allowed }) => allowed)).toHaveLength(3);
		expect(reviewResults.filter(({ allowed }) => !allowed)).toHaveLength(1);

		await expect(
			claimCheckoutRateLimit(db, {
				action: "option",
				orderId: "order-3",
				clientAddress: "203.0.113.10",
				now: 1_700_000_000_001,
			}),
		).resolves.toMatchObject({ allowed: true });
		await expect(
			claimCheckoutRateLimit(db, {
				action: "option",
				orderId: "order-2",
				clientAddress: "203.0.113.10",
				now: 1_700_000_060_001,
			}),
		).resolves.toMatchObject({ allowed: true });
	});

	it("uses one authoritative D1 statement for successful and denied claims", async () => {
		const counters = createDatastoreCounters();
		const countedDb = instrumentD1(db, counters);
		const results = await Promise.all(
			Array.from({ length: 4 }, () =>
				claimCheckoutRateLimit(countedDb, {
					action: "review",
					orderId: "counted-order",
					clientAddress: "203.0.113.11",
					now: 1_700_000_000_001,
				}),
			),
		);

		expect(results.filter((result) => result.allowed)).toHaveLength(3);
		expect(results.filter((result) => !result.allowed)).toHaveLength(1);
		expect(counters).toMatchObject({
			d1Prepare: 4,
			d1StatementBind: 4,
			d1StatementFirst: 4,
			d1Batch: 0,
		});
	});
});
