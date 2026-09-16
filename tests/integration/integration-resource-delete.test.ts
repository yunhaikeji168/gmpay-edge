import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteTelegramBot } from "#/features/telegram/server/delete";
import { applyMigrations } from "./migrations";

describe("integration resource deletion", () => {
	let miniflare: Miniflare;
	let db: D1Database;
	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-integration-resource-delete" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		const now = Date.now();
		await db.batch([
			db
				.prepare(
					"INSERT INTO telegram_bots (id, name, token_encrypted, webhook_secret_encrypted, enabled, created_at, updated_at) VALUES ('bot', 'Bot', 'token', 'secret', 1, ?, ?)",
				)
				.bind(now, now),
		]);
	});
	afterAll(async () => miniflare.dispose());
	it("requires a disabled Telegram bot and cascades its targets", async () => {
		await expect(deleteTelegramBot(db, "missing")).rejects.toMatchObject({
			code: "telegram_bot_not_found",
			status: 404,
		});
		await expect(deleteTelegramBot(db, "bot")).rejects.toMatchObject({
			code: "telegram_bot_enabled",
			status: 409,
		});
		await db
			.prepare("UPDATE telegram_bots SET enabled = 0 WHERE id = 'bot'")
			.run();
		await expect(deleteTelegramBot(db, "bot")).resolves.toEqual({ id: "bot" });
	});
});
