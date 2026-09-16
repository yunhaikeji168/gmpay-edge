import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cancelOrderAtomically } from "#/features/orders/server/cancel";
import { emitOrderStatusEvent } from "#/features/payments/server/order-status-event";
import { applyMigrations } from "./migrations";

describe("atomic order cancellation", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-order-cancellation" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		await seed(db);
	});

	afterAll(async () => miniflare.dispose());

	it("does not release a target lock when the optimistic order update fails", async () => {
		await expect(
			cancelOrderAtomically(db, "order-a", {
				status: "pending",
				version: 9,
			}),
		).resolves.toBe(false);
		await expect(lockReleasedAt(db)).resolves.toBeNull();
		const audits = await db
			.prepare(
				"SELECT COUNT(*) AS count FROM audit_logs WHERE target_id = 'order-a'",
			)
			.first<{ count: number }>();
		expect(audits?.count).toBe(0);
	});

	it("cancels only the matching order version", async () => {
		await expect(
			cancelOrderAtomically(
				db,
				"order-a",
				{
					status: "pending",
					version: 0,
				},
				1_700_000_000_000,
				{
					action: "order.cancelled_by_api",
					apiKeyId: "api-key-a",
					requestId: "cancel-request-a",
					ipAddress: "203.0.113.20",
				},
			),
		).resolves.toBe(true);
		await expect(lockReleasedAt(db)).resolves.toBe(1_700_000_000_000);
		const audit = await db
			.prepare(
				"SELECT action, request_id, ip_address, before, after FROM audit_logs WHERE target_id = 'order-a' LIMIT 1",
			)
			.first<{
				action: string;
				request_id: string;
				ip_address: string;
				before: string;
				after: string;
			}>();
		expect(audit).toMatchObject({
			action: "order.cancelled_by_api",
			request_id: "cancel-request-a",
			ip_address: "203.0.113.20",
		});
		expect(JSON.parse(audit?.before ?? "null")).toEqual({ status: "pending" });
		expect(JSON.parse(audit?.after ?? "null")).toEqual({
			status: "cancelled",
			apiKeyId: "api-key-a",
		});
	});

	it("deletes the lock when cancelling in immediate release mode", async () => {
		await db
			.prepare(
				"INSERT INTO system_settings (key, value, is_secret, created_at, updated_at) VALUES ('orders.immediate_release_mode', 'true', 0, 0, 0)",
			)
			.run();
		await expect(
			cancelOrderAtomically(db, "order-immediate", {
				status: "pending",
				version: 0,
			}),
		).resolves.toBe(true);
		const lock = await db
			.prepare(
				"SELECT 1 AS value FROM receiving_method_locks WHERE order_id = 'order-immediate'",
			)
			.first();
		expect(lock).toBeNull();
		await db
			.prepare(
				"DELETE FROM system_settings WHERE key = 'orders.immediate_release_mode'",
			)
			.run();
	});

	it("persists the cancellation event idempotently for safe API retries", async () => {
		const env = { DB: db } as Env;
		await expect(
			emitOrderStatusEvent(env, "order-a", "cancelled", "order-a:cancelled"),
		).resolves.toBe(true);
		await expect(
			emitOrderStatusEvent(env, "order-a", "cancelled", "order-a:cancelled"),
		).resolves.toBe(false);
		const events = await db
			.prepare(
				"SELECT COUNT(*) AS count FROM webhook_events WHERE deduplication_key = 'order-a:cancelled'",
			)
			.first<{ count: number }>();
		expect(events?.count).toBe(1);
	});

	it("creates a new delivery for every explicit notification resend", async () => {
		const sent: unknown[] = [];
		const env = {
			DB: db,
			WEBHOOK_QUEUE: {
				send: async (message: unknown) => sent.push(message),
			},
		} as unknown as Env;
		await db
			.prepare(
				"UPDATE orders SET api_key_id = 'api-key-a', notify_url = 'https://merchant.example/callback' WHERE id = 'order-a'",
			)
			.run();

		await expect(
			emitOrderStatusEvent(env, "order-a", "cancelled", "manual:resend:1"),
		).resolves.toBe(true);
		await expect(
			emitOrderStatusEvent(env, "order-a", "cancelled", "manual:resend:2"),
		).resolves.toBe(true);

		const counts = await db
			.prepare(
				`SELECT COUNT(DISTINCT e.id) AS events, COUNT(d.id) AS deliveries
				 FROM webhook_events e LEFT JOIN webhook_deliveries d ON d.event_id = e.id
				 WHERE e.deduplication_key IN ('manual:resend:1', 'manual:resend:2')`,
			)
			.first<{ events: number; deliveries: number }>();
		expect(counts).toEqual({ events: 2, deliveries: 2 });
		expect(sent).toHaveLength(2);
	});
});

async function lockReleasedAt(db: D1Database) {
	return db
		.prepare(
			"SELECT released_at FROM receiving_method_locks WHERE order_id = 'order-a'",
		)
		.first<{ released_at: number | null }>()
		.then((row) => row?.released_at ?? null);
}

async function seed(db: D1Database) {
	const now = Date.now();
	await db.batch([
		db
			.prepare(
				"INSERT INTO api_keys (id, name, pid, secret_encrypted, scopes, created_at, updated_at) VALUES ('api-key-a', 'Order API', 'gmp_test', 'encrypted', '[\"orders:read\"]', ?, ?)",
			)
			.bind(now, now),
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
				"INSERT INTO orders (id, external_order_id, status, amount_minor, currency, currency_decimals, payment_asset_id, received_amount_units, expires_at, version, created_at, updated_at) VALUES ('order-a', 'cancel-a', 'pending', '100', 'USD', 2, 'asset-a', '0', ?, 0, ?, ?)",
			)
			.bind(now + 60_000, now, now),
		db
			.prepare(
				"INSERT INTO receiving_method_locks (id, receiving_method_id, asset_id, order_id, expected_amount_units, expires_at, reusable_at, created_at) VALUES ('lock-a', 'asset-a', 'asset-a', 'order-a', '1000000', ?, ?, ?)",
			)
			.bind(now + 60_000, now + 86_460_000, now),
		db
			.prepare(
				"INSERT INTO orders (id, external_order_id, status, amount_minor, currency, currency_decimals, payment_asset_id, received_amount_units, expires_at, version, created_at, updated_at) VALUES ('order-immediate', 'cancel-immediate', 'pending', '100', 'USD', 2, 'asset-a', '0', ?, 0, ?, ?)",
			)
			.bind(now + 60_000, now, now),
		db
			.prepare(
				"INSERT INTO receiving_method_locks (id, receiving_method_id, asset_id, order_id, expected_amount_units, collision_key, expires_at, reusable_at, created_at) VALUES ('lock-immediate', 'asset-a', 'asset-a', 'order-immediate', '1000001', 'asset-a:asset-a:1000001', ?, ?, ?)",
			)
			.bind(now + 60_000, now + 86_460_000, now),
	]);
}
