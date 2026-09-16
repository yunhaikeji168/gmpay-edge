import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rotateApiKeyCredential } from "#/features/api-keys/server/rotate";
import { decryptSecret } from "#/lib/secrets";
import { applyMigrations } from "./migrations";

describe("API key rotation", () => {
	let miniflare: Miniflare;
	let db: D1Database;
	const pepper = "test-api-key-pepper-that-is-long-enough";

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-api-key-rotation" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		const now = Date.now();
		await db.batch([
			db
				.prepare(
					"INSERT INTO api_keys (id, name, pid, secret_encrypted, scopes, created_at, updated_at) VALUES ('old-key', 'Production', 'gmp_old', 'old-secret', '[\"orders:create\",\"orders:read\"]', ?, ?)",
				)
				.bind(now, now),
			db
				.prepare(
					"INSERT INTO api_keys (id, name, pid, secret_encrypted, scopes, created_at, updated_at) VALUES ('secondary-key', 'Secondary', 'gmp_secondary', 'old-secret', '[\"orders:read\"]', ?, ?)",
				)
				.bind(now, now),
		]);
	});

	afterAll(async () => miniflare.dispose());

	it("atomically rotates the secret in place and preserves PID and scopes", async () => {
		await db
			.prepare("UPDATE api_keys SET enabled = 0 WHERE id = 'old-key'")
			.run();
		const now = Date.now();
		const replacement = await rotateApiKeyCredential(db, {
			id: "old-key",

			pepper,
			now,
		});
		const key = await db
			.prepare(
				"SELECT name, pid, secret_encrypted, scopes, enabled, revoked_at FROM api_keys WHERE id = ?",
			)
			.bind(replacement.id)
			.first<{
				name: string;
				pid: string;
				secret_encrypted: string;
				scopes: string;
				enabled: number;
				revoked_at: number | null;
			}>();

		expect(replacement.id).toBe("old-key");
		expect(key).toMatchObject({
			name: "Production",
			pid: "gmp_old",
			scopes: '["orders:create","orders:read"]',
			enabled: 0,
			revoked_at: null,
		});
		expect(await decryptSecret(key?.secret_encrypted ?? "", pepper)).toBe(
			replacement.secret,
		);
		const count = await db
			.prepare("SELECT COUNT(*) AS value FROM api_keys")
			.first<{ value: number }>();
		expect(count?.value).toBe(2);
	});

	it("rejects rotation of a missing credential", async () => {
		await expect(
			rotateApiKeyCredential(db, {
				id: "missing-key",

				pepper,
			}),
		).rejects.toMatchObject({ code: "api_key_not_found", status: 404 });
	});

	it("reports a revoked credential as a stable conflict", async () => {
		await db
			.prepare("UPDATE api_keys SET revoked_at = ? WHERE id = ?")
			.bind(Date.now(), "secondary-key")
			.run();

		await expect(
			rotateApiKeyCredential(db, { id: "secondary-key", pepper }),
		).rejects.toMatchObject({ code: "api_key_revoked", status: 409 });
	});
});
