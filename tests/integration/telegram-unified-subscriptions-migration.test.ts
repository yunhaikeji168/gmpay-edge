import { readdir, readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Telegram unified subscriptions migration", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-telegram-unified-migration" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrationRange(db, (name) => name < "0003_");
		await db.batch([
			db.prepare(
				"INSERT INTO telegram_bots (id, name, token_encrypted, webhook_secret_encrypted, enabled, created_at, updated_at) VALUES ('bot', 'Bot', 'token', 'secret', 0, 1, 1)",
			),
			db.prepare(
				"INSERT INTO telegram_message_templates (id, name, translations, enabled, created_at, updated_at) VALUES ('telegram-template-notifications', 'Default', '{\"en-US\":\"Default content\"}', 1, 1, 1), ('custom', 'Custom', '{\"en-US\":\"Custom content\"}', 1, 2, 2)",
			),
			db.prepare(
				"INSERT INTO system_settings (key, value, is_secret, created_at, updated_at) VALUES ('telegram.default_events', '[\"order.paid\"]', 0, 1, 1), ('telegram.auto_subscribe_on_start', 'true', 0, 1, 1), ('telegram.default_template_id', 'custom', 0, 1, 1)",
			),
			db.prepare(
				"INSERT INTO telegram_notification_bindings (id, bot_id, template_id, name, target_type, target_id, locale, events, enabled, created_at, updated_at) VALUES ('target', 'bot', 'custom', 'Existing', 'private', '100', 'zh-CN', '[\"order.expired\"]', 0, 3, 3)",
			),
			db.prepare(
				"INSERT INTO telegram_bindings (id, bot_id, telegram_user_id, created_at, updated_at) VALUES ('binding-existing', 'bot', '100', 4, 4), ('binding-only', 'bot', '200', 5, 5)",
			),
			db.prepare(
				"INSERT INTO telegram_bot_commands (id, command, description_en_us, description_ja_jp, description_ko_kr, description_ru_ru, description_zh_tw, description_zh_cn, handler_type, template_id, scope, sort_order, enabled, created_at, updated_at) VALUES ('command', 'notice', 'Notice', 'Notice', 'Notice', 'Notice', 'Notice', 'Notice', 'template', 'custom', 'default', 100, 1, 6, 6)",
			),
		]);
		await applyMigrationRange(db, (name) => name.startsWith("0003_"));
	});

	afterAll(async () => miniflare.dispose());

	it("preserves direct notification and command content", async () => {
		await expect(
			db
				.prepare(
					"SELECT template_translations, enabled FROM telegram_notification_bindings WHERE id = 'target'",
				)
				.first(),
		).resolves.toEqual({
			template_translations: '{"en-US":"Custom content"}',
			enabled: 0,
		});
		await expect(
			db
				.prepare(
					"SELECT template_translations FROM telegram_bot_commands WHERE id = 'command'",
				)
				.first(),
		).resolves.toEqual({
			template_translations: '{"en-US":"Custom content"}',
		});
	});

	it("converts binding-only users into enabled private subscriptions", async () => {
		await expect(
			db
				.prepare(
					"SELECT target_type, target_id, events, enabled, template_translations FROM telegram_notification_bindings WHERE target_id = '200'",
				)
				.first(),
		).resolves.toEqual({
			target_type: "private",
			target_id: "200",
			events: '["order.paid"]',
			enabled: 1,
			template_translations: '{"en-US":"Default content"}',
		});
		await expect(
			db
				.prepare(
					"SELECT COUNT(*) AS count FROM telegram_notification_bindings WHERE bot_id = 'bot' AND target_id = '100'",
				)
				.first(),
		).resolves.toEqual({ count: 1 });
	});

	it("stores defaults directly and removes obsolete catalogs and settings", async () => {
		await expect(
			db
				.prepare(
					"SELECT value FROM system_settings WHERE key = 'telegram.default_template_translations'",
				)
				.first(),
		).resolves.toEqual({ value: '{"en-US":"Default content"}' });
		await expect(
			db
				.prepare(
					"SELECT key FROM system_settings WHERE key IN ('telegram.auto_subscribe_on_start', 'telegram.default_template_id')",
				)
				.all(),
		).resolves.toMatchObject({ results: [] });
		await expect(
			db
				.prepare(
					"SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('telegram_bindings', 'telegram_message_templates')",
				)
				.all(),
		).resolves.toMatchObject({ results: [] });
	});
});

async function applyMigrationRange(
	database: D1Database,
	include: (name: string) => boolean,
) {
	const directory = new URL("../../drizzle/", import.meta.url);
	const files = (await readdir(directory))
		.filter((name) => /^\d+_.+\.sql$/.test(name) && include(name))
		.sort();
	for (const file of files) {
		const migration = await readFile(new URL(file, directory), "utf8");
		for (const statement of migration
			.split("--> statement-breakpoint")
			.map((value) => value.trim())
			.filter(Boolean))
			await database.prepare(statement).run();
	}
}
