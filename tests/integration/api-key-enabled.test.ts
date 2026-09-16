import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setApiKeyEnabled } from "#/features/api-keys/server/enabled";
import { applyMigrations } from "./migrations";

describe("API key enabled state", () => {
	let miniflare: Miniflare;
	let database: D1Database;
	const userId = "00000000-0000-4000-8000-000000000001";
	const apiKeyId = "00000000-0000-4000-8000-000000000002";

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-api-key-enabled" },
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
					 VALUES (?, 'Checkout', 'gmp_enabled_test', 'encrypted', '["orders:create"]', 1, 1)`,
				)
				.bind(apiKeyId),
		]);
	});

	afterAll(async () => miniflare.dispose());

	it("defaults existing credentials to enabled", async () => {
		const row = await database
			.prepare("SELECT enabled FROM api_keys WHERE id = ?")
			.bind(apiKeyId)
			.first<{ enabled: number }>();
		expect(row?.enabled).toBe(1);
	});

	it("toggles reversibly and audits only real state changes", async () => {
		const disabledAt = 1_800_000_000_000;
		await expect(
			setApiKeyEnabled(database, {
				id: apiKeyId,
				enabled: false,
				actorUserId: userId,
				requestId: "request-disable",
				ipAddress: "203.0.113.90",
				now: disabledAt,
			}),
		).resolves.toEqual({ id: apiKeyId, enabled: false });
		await expect(
			setApiKeyEnabled(database, {
				id: apiKeyId,
				enabled: false,
				actorUserId: userId,
				now: disabledAt + 1,
			}),
		).resolves.toEqual({ id: apiKeyId, enabled: false });
		await expect(
			setApiKeyEnabled(database, {
				id: apiKeyId,
				enabled: true,
				actorUserId: userId,
				now: disabledAt + 2,
			}),
		).resolves.toEqual({ id: apiKeyId, enabled: true });

		const audits = await database
			.prepare(
				"SELECT action, after FROM audit_logs WHERE target_id = ? ORDER BY created_at",
			)
			.bind(apiKeyId)
			.all<{ action: string; after: string }>();
		expect(audits.results).toEqual([
			{ action: "api_key.disabled", after: '{"enabled":false}' },
			{ action: "api_key.enabled", after: '{"enabled":true}' },
		]);
	});

	it("rejects revoked and unknown credentials without false audits", async () => {
		await database
			.prepare("UPDATE api_keys SET revoked_at = 1 WHERE id = ?")
			.bind(apiKeyId)
			.run();
		await expect(
			setApiKeyEnabled(database, {
				id: apiKeyId,
				enabled: false,
				actorUserId: userId,
			}),
		).rejects.toMatchObject({ code: "api_key_revoked", status: 409 });
		await expect(
			setApiKeyEnabled(database, {
				id: "00000000-0000-4000-8000-000000000099",
				enabled: false,
				actorUserId: userId,
			}),
		).rejects.toMatchObject({ code: "api_key_not_found", status: 404 });
	});
});
