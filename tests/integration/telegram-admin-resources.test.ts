import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { updateTelegramNotificationEnabled } from "#/features/telegram/server/notification-bindings";
import { applyMigrations } from "./migrations";

describe("Telegram admin resources", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-telegram-admin-resources" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		await db.batch([
			db.prepare(
				"INSERT INTO telegram_bots (id, name, token_encrypted, webhook_secret_encrypted, enabled, created_at, updated_at) VALUES ('bot', 'Bot', 'token', 'secret', 0, 1, 1)",
			),
			db.prepare(
				"INSERT INTO telegram_notification_bindings (id, bot_id, template_translations, name, target_type, target_id, locale, events, enabled, created_at, updated_at) VALUES ('target', 'bot', '{}', 'Target', 'private', '100', 'en-US', '[\"order.paid\"]', 1, 1, 1)",
			),
		]);
	});

	afterAll(async () => miniflare.dispose());

	it("updates an existing notification target", async () => {
		await expect(
			updateTelegramNotificationEnabled(db, {
				id: "target",
				enabled: false,
				now: 10,
			}),
		).resolves.toEqual({ id: "target", enabled: false });
		await expect(
			db
				.prepare(
					"SELECT enabled, updated_at FROM telegram_notification_bindings WHERE id = 'target'",
				)
				.first(),
		).resolves.toEqual({ enabled: 0, updated_at: 10 });
	});

	it("rejects a notification target that no longer exists", async () => {
		await expect(
			updateTelegramNotificationEnabled(db, {
				id: "missing",
				enabled: true,
			}),
		).rejects.toMatchObject({
			code: "telegram_notification_not_found",
			status: 404,
		});
	});
});
