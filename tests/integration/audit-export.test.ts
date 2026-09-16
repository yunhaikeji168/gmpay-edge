import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { exportAuditLogsToR2 } from "#/features/operations/server/audit-export";
import { applyMigrations } from "./migrations";

describe("audit log R2 export", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-audit-export" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		const now = Date.now();
		await db.batch([
			db
				.prepare(
					"INSERT INTO users (id, name, email, email_verified, enabled, created_at, updated_at) VALUES ('root-user', 'Root', 'root@example.com', 1, 1, ?, ?)",
				)
				.bind(now, now),
			db
				.prepare(
					"INSERT INTO audit_logs (id, action, target_type, before, after, created_at) VALUES ('audit-1', 'settings.updated', 'settings', ?, ?, ?)",
				)
				.bind(
					JSON.stringify({
						nested: {
							apiKey: "before-secret",
							passphrase: "before-passphrase",
							credentials: "before-credentials",
						},
						safe: "before",
					}),
					JSON.stringify({
						password: "after-secret",
						authorization: "Bearer after-token",
						recoveryCodes: ["after-recovery-code"],
						configEncrypted: "after-ciphertext",
						safe: "after",
					}),
					Date.UTC(2026, 0, 2),
				),
		]);
	});

	afterAll(async () => miniflare.dispose());

	it("writes a bounded, redacted NDJSON artifact", async () => {
		let body = "";
		const put = vi.fn(
			async (_key: string, value: ReadableStream, _options?: R2PutOptions) => {
				body = await new Response(value).text();
			},
		);
		const result = await exportAuditLogsToR2({
			db,
			bucket: { put } as unknown as R2Bucket,
			actorUserId: "root-user",
			retentionMs: 30 * 86_400_000,
			now: Date.UTC(2026, 0, 3),
		});

		expect(result.recordCount).toBe(1);
		expect(result.key).toMatch(
			/^exports\/audit-logs\/2026-01-03T00-00-00\.000Z-/,
		);
		expect(put).toHaveBeenCalledOnce();
		const [key, value, options] = put.mock.calls[0] ?? [];
		if (!options) throw new Error("Expected R2 upload options");
		expect(key).toBe(result.key);
		expect(value).toBeInstanceOf(ReadableStream);
		expect(body).toContain('"apiKey":"[REDACTED]"');
		expect(body).toContain('"passphrase":"[REDACTED]"');
		expect(body).toContain('"credentials":"[REDACTED]"');
		expect(body).toContain('"password":"[REDACTED]"');
		expect(body).toContain('"authorization":"[REDACTED]"');
		expect(body).toContain('"recoveryCodes":"[REDACTED]"');
		expect(body).toContain('"configEncrypted":"[REDACTED]"');
		expect(body).not.toContain("before-secret");
		expect(body).not.toContain("after-secret");
		expect(body).not.toContain("before-passphrase");
		expect(body).not.toContain("before-credentials");
		expect(body).not.toContain("after-token");
		expect(body).not.toContain("after-recovery-code");
		expect(body).not.toContain("after-ciphertext");
		expect(options.httpMetadata).toEqual({
			contentType: "application/x-ndjson; charset=utf-8",
		});
		expect(options.customMetadata).toEqual({
			exportedBy: "root-user",
			recordCount: "1",
			deleteAfter: "2026-02-02T00:00:00.000Z",
		});
		const audit = await db
			.prepare(
				"SELECT actor_user_id, target_id, after FROM audit_logs WHERE action = 'audit.exported'",
			)
			.first<{ actor_user_id: string; target_id: string; after: string }>();
		expect(audit?.actor_user_id).toBe("root-user");
		expect(audit?.target_id).toBe(result.key);
		expect(JSON.parse(audit?.after ?? "{}")).toEqual({
			recordCount: 1,
			deleteAfter: Date.UTC(2026, 1, 2),
		});
		const registry = await db
			.prepare(
				"SELECT object_key, exported_by, record_count, delete_after, deleted_at FROM audit_exports WHERE object_key = ?",
			)
			.bind(result.key)
			.first<{
				object_key: string;
				exported_by: string;
				record_count: number;
				delete_after: number;
				deleted_at: number | null;
			}>();
		expect(registry).toEqual({
			object_key: result.key,
			exported_by: "root-user",
			record_count: 1,
			delete_after: Date.UTC(2026, 1, 2),
			deleted_at: null,
		});
	});

	it("returns a stable storage error and does not record a false success", async () => {
		const before = await db
			.prepare(
				"SELECT COUNT(*) AS count FROM audit_logs WHERE action = 'audit.exported'",
			)
			.first<{ count: number }>();
		const put = vi
			.fn()
			.mockRejectedValue(new Error("R2 authorization=storage-secret"));

		await expect(
			exportAuditLogsToR2({
				db,
				bucket: { put } as unknown as R2Bucket,
				actorUserId: "root-user",
				retentionMs: 30 * 86_400_000,
			}),
		).rejects.toMatchObject({
			code: "storage_write_failed",
			status: 502,
			message: "Audit export could not be written to storage",
		});
		expect(put).toHaveBeenCalledOnce();
		const after = await db
			.prepare(
				"SELECT COUNT(*) AS count FROM audit_logs WHERE action = 'audit.exported'",
			)
			.first<{ count: number }>();
		expect(after?.count).toBe(before?.count);
	});

	it("compensates the R2 write when registry persistence fails", async () => {
		const put = vi.fn().mockResolvedValue(undefined);
		const remove = vi.fn().mockResolvedValue(undefined);

		await expect(
			exportAuditLogsToR2({
				db,
				bucket: { put, delete: remove } as unknown as R2Bucket,
				actorUserId: "missing-user",
				retentionMs: 30 * 86_400_000,
			}),
		).rejects.toMatchObject({
			code: "storage_metadata_failed",
			status: 502,
		});
		expect(put).toHaveBeenCalledOnce();
		expect(remove).toHaveBeenCalledOnce();
	});
});
