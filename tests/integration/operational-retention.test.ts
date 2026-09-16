import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
	hasOperationalRetentionWork,
	runOperationalRetentionCleanup,
} from "#/features/operations/server/operational-retention";
import { applyMigrations } from "./migrations";

const DAY_MS = 86_400_000;
const NOW = Date.UTC(2026, 6, 1);
const RETENTION_MS = 30 * DAY_MS;
const OLD = NOW - RETENTION_MS - 1;

describe("operational retention", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-operational-retention" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		await seedDependencies(db);
	});

	afterAll(async () => miniflare.dispose());

	it("deletes only terminal Webhook history in FK-safe order", async () => {
		await seedWebhookHistory(db);
		const remove = vi.fn().mockResolvedValue(undefined);
		const plans = await Promise.all([
			explain(
				db,
				`SELECT attempt.id FROM webhook_attempts attempt INDEXED BY webhook_attempts_retention_idx
				 JOIN webhook_deliveries delivery ON delivery.id = attempt.delivery_id
				 WHERE attempt.attempted_at < ${NOW} AND delivery.status IN ('succeeded', 'dead')
				 AND delivery.completed_at < ${NOW} ORDER BY attempt.attempted_at, attempt.id LIMIT 250`,
			),
			explain(
				db,
				`SELECT delivery.id FROM webhook_deliveries delivery INDEXED BY webhook_deliveries_retention_idx
				 WHERE delivery.status IN ('succeeded', 'dead') AND delivery.completed_at < ${NOW}
				 ORDER BY delivery.completed_at, delivery.id LIMIT 250`,
			),
			explain(
				db,
				`SELECT event.id FROM webhook_events event INDEXED BY webhook_events_retention_idx
				 WHERE event.created_at < ${NOW} ORDER BY event.created_at, event.id LIMIT 250`,
			),
		]);
		expect(plans[0]).toContain("webhook_attempts_retention_idx");
		expect(plans[1]).toContain("webhook_deliveries_retention_idx");
		expect(plans[2]).toContain("webhook_events_retention_idx");
		for (const plan of plans) expect(plan).not.toContain("USE TEMP B-TREE");

		await expect(
			hasOperationalRetentionWork(db, NOW, RETENTION_MS),
		).resolves.toBe(true);
		const result = await runOperationalRetentionCleanup({
			db,
			bucket: { delete: remove },
			now: NOW,
			retentionMs: RETENTION_MS,
		});

		expect(result).toEqual({
			affectedRows: 3,
			webhookRows: 3,
			auditExports: 0,
		});
		expect(remove).not.toHaveBeenCalled();
		await expect(ids(db, "webhook_attempts")).resolves.toEqual([
			"attempt-active",
		]);
		await expect(ids(db, "webhook_deliveries")).resolves.toEqual([
			"delivery-active",
		]);
		await expect(ids(db, "webhook_events")).resolves.toEqual(["event-active"]);
		await expect(
			hasOperationalRetentionWork(db, NOW, RETENTION_MS),
		).resolves.toBe(false);
	});

	it("converges a backlog across bounded runs", async () => {
		await db.batch(
			Array.from({ length: 12 }, (_, index) =>
				db
					.prepare(
						"INSERT INTO webhook_events (id, type, deduplication_key, payload, created_at, updated_at) VALUES (?, 'order.paid', ?, '{}', ?, ?)",
					)
					.bind(`backlog-${index}`, `backlog:${index}`, OLD, OLD),
			),
		);
		const bucket = { delete: vi.fn().mockResolvedValue(undefined) };
		const candidates = await db
			.prepare(
				`SELECT event.id FROM webhook_events event INDEXED BY webhook_events_retention_idx
				 WHERE event.created_at < ? AND NOT EXISTS (
				  SELECT 1 FROM webhook_deliveries delivery WHERE delivery.event_id = event.id
				 ) ORDER BY event.created_at, event.id LIMIT 5`,
			)
			.bind(NOW - RETENTION_MS)
			.all<{ id: string }>();
		expect(candidates.results).toHaveLength(5);
		expect(candidates.meta.rows_read).toBeLessThanOrEqual(10);

		for (const expected of [5, 5, 2]) {
			const result = await runOperationalRetentionCleanup({
				db,
				bucket,
				now: NOW,
				retentionMs: RETENTION_MS,
				maxRows: 5,
			});
			expect(result.webhookRows).toBe(expected);
		}

		expect(bucket.delete).not.toHaveBeenCalled();
		await expect(
			hasOperationalRetentionWork(db, NOW, RETENTION_MS),
		).resolves.toBe(false);
	});

	it("deletes R2 before marking audit export metadata", async () => {
		await db
			.prepare(
				`INSERT INTO audit_exports
				 (id, object_key, exported_by, record_count, delete_after, created_at, updated_at)
				 VALUES ('export-old', 'exports/audit-logs/old.ndjson', 'root-user', 2, ?, ?, ?)`,
			)
			.bind(OLD, OLD, OLD)
			.run();
		const remove = vi.fn(async () => {
			const before = await db
				.prepare("SELECT deleted_at FROM audit_exports WHERE id = 'export-old'")
				.first<{ deleted_at: number | null }>();
			expect(before?.deleted_at).toBeNull();
		});

		const result = await runOperationalRetentionCleanup({
			db,
			bucket: { delete: remove },
			now: NOW,
			retentionMs: RETENTION_MS,
		});

		expect(remove).toHaveBeenCalledWith(["exports/audit-logs/old.ndjson"]);
		expect(result.auditExports).toBe(1);
		const after = await db
			.prepare("SELECT deleted_at FROM audit_exports WHERE id = 'export-old'")
			.first<{ deleted_at: number | null }>();
		expect(after?.deleted_at).toBe(NOW);
	});

	it("leaves D1 metadata due when R2 deletion fails", async () => {
		await db
			.prepare(
				`INSERT INTO audit_exports
				 (id, object_key, exported_by, record_count, delete_after, created_at, updated_at)
				 VALUES ('export-retry', 'exports/audit-logs/retry.ndjson', 'root-user', 1, ?, ?, ?)`,
			)
			.bind(OLD, OLD, OLD)
			.run();

		await expect(
			runOperationalRetentionCleanup({
				db,
				bucket: {
					delete: vi.fn().mockRejectedValue(new Error("R2 unavailable")),
				},
				now: NOW,
				retentionMs: RETENTION_MS,
			}),
		).rejects.toThrow("R2 unavailable");
		const row = await db
			.prepare("SELECT deleted_at FROM audit_exports WHERE id = 'export-retry'")
			.first<{ deleted_at: number | null }>();
		expect(row?.deleted_at).toBeNull();
		await expect(
			hasOperationalRetentionWork(db, NOW, RETENTION_MS),
		).resolves.toBe(true);
	});
});

async function seedDependencies(db: D1Database) {
	await db.batch([
		db
			.prepare(
				"INSERT INTO users (id, name, email, email_verified, enabled, created_at, updated_at) VALUES ('root-user', 'Root', 'root@example.com', 1, 1, ?, ?)",
			)
			.bind(NOW, NOW),
		db
			.prepare(
				"INSERT INTO api_keys (id, name, pid, secret_encrypted, scopes, enabled, created_at, updated_at) VALUES ('api-key', 'Test', 'gm_test', 'ciphertext', '[]', 1, ?, ?)",
			)
			.bind(NOW, NOW),
		db
			.prepare(
				`INSERT INTO orders
				 (id, external_order_id, api_key_id, api_protocol, status, amount_minor,
				 currency, currency_decimals, expires_at, created_at, updated_at)
				 VALUES ('order', 'external', 'api-key', 'gmpay', 'paid', '100',
				 'USD', 2, ?, ?, ?)`,
			)
			.bind(NOW, OLD, OLD),
	]);
}

async function seedWebhookHistory(db: D1Database) {
	await db.batch([
		db
			.prepare(
				"INSERT INTO webhook_events (id, order_id, type, deduplication_key, payload, created_at, updated_at) VALUES ('event-terminal', 'order', 'order.paid', 'terminal', '{}', ?, ?), ('event-active', 'order', 'order.paid', 'active', '{}', ?, ?)",
			)
			.bind(OLD, OLD, OLD, OLD),
		db
			.prepare(
				"INSERT INTO webhook_deliveries (id, event_id, order_id, api_key_id, status, attempt_count, completed_at, created_at, updated_at) VALUES ('delivery-terminal', 'event-terminal', 'order', 'api-key', 'succeeded', 1, ?, ?, ?), ('delivery-active', 'event-active', 'order', 'api-key', 'failed', 1, NULL, ?, ?)",
			)
			.bind(OLD, OLD, OLD, OLD, OLD),
		db
			.prepare(
				"INSERT INTO webhook_attempts (id, delivery_id, attempt, request_id, attempted_at) VALUES ('attempt-terminal', 'delivery-terminal', 1, 'request-terminal', ?), ('attempt-active', 'delivery-active', 1, 'request-active', ?)",
			)
			.bind(OLD, OLD),
	]);
}

async function ids(db: D1Database, table: string) {
	const result = await db.prepare(`SELECT id FROM ${table} ORDER BY id`).all<{
		id: string;
	}>();
	return result.results.map((row) => row.id);
}

async function explain(db: D1Database, query: string) {
	const result = await db
		.prepare(`EXPLAIN QUERY PLAN ${query}`)
		.all<{ detail: string }>();
	return result.results.map((row) => row.detail).join("\n");
}
