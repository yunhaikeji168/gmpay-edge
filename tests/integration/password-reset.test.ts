import { verifyPassword } from "better-auth/crypto";
import { drizzle } from "drizzle-orm/d1";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "#/db/schema";
import { createUser, resetUserPassword } from "#/features/users/server/users";
import { applyMigrations } from "./migrations";

describe("administrator password reset", () => {
	let miniflare: Miniflare;
	let database: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-password-reset" },
		});
		database = await miniflare.getD1Database("DB");
		await applyMigrations(database);
	});

	afterAll(async () => miniflare.dispose());

	it("replaces the credential and revokes every active session", async () => {
		const db = drizzle(database, { schema });
		const initialPassword = "  old-password-123  ";
		const user = await createUser(db, {
			name: "Reset user",
			email: "reset@example.com",
			enabled: true,
			password: initialPassword,
		});
		const now = Date.now();
		await database
			.prepare(
				"INSERT INTO sessions (id, user_id, token, expires_at, created_at, updated_at) VALUES ('session-a', ?, 'token-a', ?, ?, ?)",
			)
			.bind(user.id, now + 60_000, now, now)
			.run();

		const initialCredential = await database
			.prepare(
				"SELECT password FROM accounts WHERE user_id = ? AND provider_id = 'credential'",
			)
			.bind(user.id)
			.first<{ password: string }>();
		if (!initialCredential) throw new Error("Credential was not created");
		await expect(
			verifyPassword({
				hash: initialCredential.password,
				password: initialPassword,
			}),
		).resolves.toBe(true);
		await expect(
			verifyPassword({
				hash: initialCredential.password,
				password: initialPassword.trim(),
			}),
		).resolves.toBe(false);

		const exactPassword = "  new-password-456  ";
		await resetUserPassword(db, {
			id: user.id,
			password: exactPassword,
		});

		const credential = await database
			.prepare(
				"SELECT password FROM accounts WHERE user_id = ? AND provider_id = 'credential'",
			)
			.bind(user.id)
			.first<{ password: string }>();
		if (!credential) throw new Error("Credential was not created");
		await expect(
			verifyPassword({
				hash: credential.password,
				password: initialPassword,
			}),
		).resolves.toBe(false);
		await expect(
			verifyPassword({
				hash: credential.password,
				password: exactPassword,
			}),
		).resolves.toBe(true);
		await expect(
			verifyPassword({
				hash: credential.password,
				password: exactPassword.trim(),
			}),
		).resolves.toBe(false);
		const sessions = await database
			.prepare("SELECT COUNT(*) AS count FROM sessions WHERE user_id = ?")
			.bind(user.id)
			.first<{ count: number }>();
		expect(sessions?.count).toBe(0);
	});
});
