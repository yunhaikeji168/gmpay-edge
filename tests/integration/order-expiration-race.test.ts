import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expireOrder } from "#/features/payments/server/expiration";
import { applyMigrations } from "./migrations";

describe("order expiration concurrency", () => {
	let miniflare: Miniflare;
	let db: D1Database;
	let env: Env;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-expiration-race" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		await seed(db);
		env = {
			DB: db,
			WEBHOOK_QUEUE: { send: async () => undefined },
		} as unknown as Env;
	});

	afterAll(async () => miniflare.dispose());

	it("does not release or emit expiration after a concurrent payment update", async () => {
		await db
			.prepare(
				"UPDATE orders SET status = 'paid', version = 1 WHERE id = 'order-a'",
			)
			.run();
		await expect(
			expireOrder(
				env,
				{
					id: "order-a",
					external_order_id: "expire-a",
					amount: "1.00",
					currency: "USD",
					paymentAmount: "1.000000",
					received_amount_units: "1000000",
					code: "USDT",
					network: "tron",
					version: 0,
					status: "pending",
				},
				Date.now(),
			),
		).resolves.toBe(false);
		const state = await db
			.prepare(`SELECT
			 (SELECT released_at FROM receiving_method_locks WHERE order_id = 'order-a') AS released_at,
			 (SELECT COUNT(*) FROM webhook_events) AS event_count`)
			.first<{ released_at: number | null; event_count: number }>();
		expect(state).toEqual({ released_at: null, event_count: 0 });
	});

	it("expires the matching order version for late-arrival monitoring", async () => {
		const now = Date.now();
		await db
			.prepare(
				"UPDATE orders SET status = 'pending', version = 0 WHERE id = 'order-a'",
			)
			.run();
		await expect(
			expireOrder(
				env,
				{
					id: "order-a",
					external_order_id: "expire-a",
					amount: "1.00",
					currency: "USD",
					paymentAmount: "1.000000",
					received_amount_units: "0",
					code: "USDT",
					network: "tron",
					version: 0,
					status: "pending",
				},
				now,
			),
		).resolves.toBe(true);
		const lock = await db
			.prepare(
				"SELECT released_at FROM receiving_method_locks WHERE order_id = 'order-a'",
			)
			.first<{ released_at: number | null }>();
		expect(lock?.released_at).toBe(now);
	});
});

async function seed(db: D1Database) {
	const now = Date.now();
	await db.batch([
		db
			.prepare(
				"INSERT INTO payment_rails (code, name, kind, adapter, created_at, updated_at) VALUES ('tron', 'TRON', 'chain', 'tron', ?, ?)",
			)
			.bind(now, now),
		db
			.prepare(
				"INSERT INTO payment_assets (id, rail_code, code, symbol, kind, decimals, created_at, updated_at) VALUES ('asset-a', 'tron', 'USDT', 'USDT', 'token', 6, ?, ?)",
			)
			.bind(now, now),
		db
			.prepare(
				"UPDATE payment_assets SET default_confirmations = 1, created_at = ?, updated_at = ? WHERE id = 'asset-a'",
			)
			.bind(now, now),
		db
			.prepare(
				"INSERT INTO receiving_methods (id, name, rail_code, target_type, target_value, normalized_target_value, enabled, created_at, updated_at) VALUES ('asset-a', 'Primary', 'tron', 'address', 'TAddress', 'TAddress', 1, ?, ?)",
			)
			.bind(now, now),
		db
			.prepare(
				"INSERT INTO orders (id, external_order_id, status, amount_minor, currency, currency_decimals, payment_asset_id, received_amount_units, expires_at, version, created_at, updated_at) VALUES ('order-a', 'expire-a', 'pending', '100', 'USD', 2, 'asset-a', '0', ?, 0, ?, ?)",
			)
			.bind(now - 1, now, now),
		db
			.prepare(
				"INSERT INTO receiving_method_locks (id, receiving_method_id, asset_id, order_id, expected_amount_units, expires_at, reusable_at, created_at) VALUES ('lock-a', 'asset-a', 'asset-a', 'order-a', '1000000', ?, ?, ?)",
			)
			.bind(now - 1, now + 86_400_000, now),
	]);
}
