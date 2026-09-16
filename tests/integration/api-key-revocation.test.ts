import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { revokeApiKeyCredential } from "#/features/api-keys/server/revoke";
import { applyMigrations } from "./migrations";

describe("API key revocation", () => {
	let miniflare: Miniflare;
	let database: D1Database;
	const userId = "00000000-0000-4000-8000-000000000001";
	const apiKeyId = "00000000-0000-4000-8000-000000000002";

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-api-key-revocation" },
		});
		database = await miniflare.getD1Database("DB");
		await applyMigrations(database);
		await database.batch([
			database
				.prepare(
					"INSERT INTO users (id, name, email, email_verified, enabled, created_at, updated_at) VALUES (?, 'Root', 'root@example.com', 1, 1, 1, 1)",
				)
				.bind(userId),
			database
				.prepare(
					`INSERT INTO api_keys
					 (id, name, pid, secret_encrypted, scopes, created_at, updated_at)
					 VALUES (?, 'Checkout', 'gmp_revoke_test', 'encrypted', '["orders:create"]', 1, 1)`,
				)
				.bind(apiKeyId),
		]);
	});

	afterAll(async () => miniflare.dispose());

	it("atomically changes state and writes one attributed audit", async () => {
		const now = 1_800_000_000_000;
		await expect(
			revokeApiKeyCredential(database, {
				id: apiKeyId,
				actorUserId: userId,
				requestId: "request-revoke-a",
				ipAddress: "203.0.113.90",
				now,
			}),
		).resolves.toEqual({
			id: apiKeyId,
			revokedAt: new Date(now).toISOString(),
		});
		const state = await database
			.prepare(
				`SELECT k.revoked_at,
				 (SELECT COUNT(*) FROM audit_logs WHERE action = 'api_key.revoked' AND target_id = k.id) AS audits
				 FROM api_keys k WHERE k.id = ?`,
			)
			.bind(apiKeyId)
			.first<{ revoked_at: number; audits: number }>();
		expect(state).toEqual({ revoked_at: now, audits: 1 });
	});

	it("rejects duplicate or unknown revocation without creating a false audit", async () => {
		await expect(
			revokeApiKeyCredential(database, {
				id: apiKeyId,
				actorUserId: userId,
				now: 1_800_000_000_000,
			}),
		).rejects.toMatchObject({ code: "api_key_revoked", status: 409 });
		await expect(
			revokeApiKeyCredential(database, {
				id: "00000000-0000-4000-8000-000000000099",
				actorUserId: userId,
				now: 1_800_000_000_002,
			}),
		).rejects.toMatchObject({ code: "api_key_not_found", status: 404 });
		const audits = await database
			.prepare(
				"SELECT COUNT(*) AS count FROM audit_logs WHERE action = 'api_key.revoked'",
			)
			.first<{ count: number }>();
		expect(audits?.count).toBe(1);
	});

	it("allows only one concurrent revocation and one attributed audit", async () => {
		const id = "00000000-0000-4000-8000-000000000003";
		await database
			.prepare(
				`INSERT INTO api_keys
				 (id, name, pid, secret_encrypted, scopes, created_at, updated_at)
				 VALUES (?, 'Concurrent', 'gmp_revoke_concurrent', 'encrypted', '["orders:create"]', 1, 1)`,
			)
			.bind(id)
			.run();
		const results = await Promise.allSettled(
			["request-concurrent-a", "request-concurrent-b"].map((requestId) =>
				revokeApiKeyCredential(database, {
					id,
					actorUserId: userId,
					requestId,
					now: 1_800_000_000_010,
				}),
			),
		);
		expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
			1,
		);
		const rejected = results.find(({ status }) => status === "rejected");
		expect(rejected).toMatchObject({
			status: "rejected",
			reason: { code: "api_key_revoked", status: 409 },
		});
		const audits = await database
			.prepare(
				"SELECT request_id FROM audit_logs WHERE action = 'api_key.revoked' AND target_id = ?",
			)
			.bind(id)
			.all<{ request_id: string }>();
		expect(audits.results).toHaveLength(1);
		expect(["request-concurrent-a", "request-concurrent-b"]).toContain(
			audits.results[0]?.request_id,
		);
	});
});
