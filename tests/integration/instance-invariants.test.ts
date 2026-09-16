import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyMigrations } from "./migrations";

describe("D1 instance and deduplication invariants", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-instance-invariants" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		await seed(db);
	});

	afterAll(async () => miniflare.dispose());

	it("initializes the external order schema and scoped indexes", async () => {
		const columns = await db
			.prepare("PRAGMA table_info(orders)")
			.all<{ name: string }>();
		const names = columns.results.map((column) => column.name);
		expect(names).toContain("external_order_id");

		const indexes = await db
			.prepare(
				"SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'orders' ORDER BY name",
			)
			.all<{ name: string; sql: string }>();
		expect(indexes.results).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "orders_api_key_external_id_uidx",
					sql: expect.stringContaining("api_key_id"),
				}),
				expect.objectContaining({
					name: "orders_internal_external_id_uidx",
					sql: expect.stringContaining("api_key_id"),
				}),
			]),
		);
		await expect(
			db.prepare("PRAGMA foreign_key_check").all(),
		).resolves.toMatchObject({ results: [] });
	});

	it("scopes external order IDs to their API credential", async () => {
		await insertOrder(db, "order-a", "shared-number");
		await expect(insertOrder(db, "order-b", "shared-number")).rejects.toThrow();
		await insertOrder(db, "order-key-a", "api-shared", "api-key");
		await expect(
			insertOrder(db, "order-key-a-duplicate", "api-shared", "api-key"),
		).rejects.toThrow();
		await insertOrder(db, "order-key-b", "api-shared", "api-key-b");
	});

	it("keeps idempotency keys instance-wide", async () => {
		await insertIdempotency(db, "idem-a", "same-key");
		await expect(insertIdempotency(db, "idem-b", "same-key")).rejects.toThrow();
	});

	it("deduplicates chain events, webhook events, and order deliveries", async () => {
		const now = Date.now();
		await db
			.prepare(
				"INSERT INTO blockchain_transactions (id, network, tx_hash, event_index, from_address, to_address, asset_code, amount_units, block_number, block_hash, confirmations, status, observed_at, created_at, updated_at) VALUES (?, 'tron', 'tx-1', 0, 'from', 'to', 'USDT', '1', '1', 'block', 1, 'confirmed', ?, ?, ?)",
			)
			.bind("tx-a", now, now, now)
			.run();
		await expect(
			db
				.prepare(
					"INSERT INTO blockchain_transactions (id, network, tx_hash, event_index, from_address, to_address, asset_code, amount_units, block_number, block_hash, confirmations, status, observed_at, created_at, updated_at) VALUES (?, 'tron', 'tx-1', 0, 'from', 'to', 'USDT', '1', '1', 'block', 1, 'confirmed', ?, ?, ?)",
				)
				.bind("tx-b", now, now, now)
				.run(),
		).rejects.toThrow();

		await db
			.prepare(
				"INSERT INTO webhook_events (id, order_id, type, deduplication_key, payload, created_at, updated_at) VALUES ('event-a', 'order-a', 'order.paid', 'order-a:paid:1', '{}', ?, ?)",
			)
			.bind(now, now)
			.run();
		await expect(
			db
				.prepare(
					"INSERT INTO webhook_events (id, order_id, type, deduplication_key, payload, created_at, updated_at) VALUES ('event-b', 'order-a', 'order.paid', 'order-a:paid:1', '{}', ?, ?)",
				)
				.bind(now, now)
				.run(),
		).rejects.toThrow();
		await db
			.prepare(
				"INSERT INTO webhook_deliveries (id, event_id, order_id, api_key_id, status, attempt_count, created_at, updated_at) VALUES ('delivery-a', 'event-a', 'order-a', 'api-key', 'queued', 0, ?, ?)",
			)
			.bind(now, now)
			.run();
		await expect(
			db
				.prepare(
					"INSERT INTO webhook_deliveries (id, event_id, order_id, api_key_id, status, attempt_count, created_at, updated_at) VALUES ('delivery-b', 'event-a', 'order-a', 'api-key', 'queued', 0, ?, ?)",
				)
				.bind(now, now)
				.run(),
		).rejects.toThrow();
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
				"INSERT INTO payment_assets (id, rail_code, code, symbol, kind, decimals, created_at, updated_at) VALUES ('asset', 'tron', 'USDT', 'USDT', 'token', 6, ?, ?)",
			)
			.bind(now, now),
		db
			.prepare(
				"INSERT INTO api_keys (id, name, pid, secret_encrypted, scopes, created_at, updated_at) VALUES ('api-key', 'Test', 'gm_test', 'secret', '[]', ?, ?)",
			)
			.bind(now, now),
		db
			.prepare(
				"INSERT INTO api_keys (id, name, pid, secret_encrypted, scopes, created_at, updated_at) VALUES ('api-key-b', 'Test B', 'gm_test_b', 'secret', '[]', ?, ?)",
			)
			.bind(now, now),
	]);
}

async function insertOrder(
	db: D1Database,
	id: string,
	externalOrderId: string,
	apiKeyId?: string,
) {
	const now = Date.now();
	return db
		.prepare(
			"INSERT INTO orders (id, external_order_id, api_key_id, status, amount_minor, currency, currency_decimals, payment_asset_id, received_amount_units, expires_at, version, created_at, updated_at) VALUES (?, ?, ?, 'pending', '100', 'USD', 2, 'asset', '0', ?, 0, ?, ?)",
		)
		.bind(id, externalOrderId, apiKeyId ?? null, now + 60_000, now, now)
		.run();
}

async function insertIdempotency(db: D1Database, id: string, key: string) {
	const now = Date.now();
	return db
		.prepare(
			"INSERT INTO idempotency_keys (id, key, request_hash, expires_at, created_at, updated_at) VALUES (?, ?, 'hash', ?, ?, ?)",
		)
		.bind(id, key, now + 60_000, now, now)
		.run();
}
