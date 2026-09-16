import { Miniflare } from "miniflare";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { notifyTelegram } from "#/features/telegram/server/telegram";
import { encryptSecret } from "#/lib/secrets";
import { applyMigrations } from "./migrations";

describe("Telegram notification delivery", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-telegram-notifications" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		await seed(db);
	});

	beforeEach(async () => {
		vi.unstubAllGlobals();
		await db.prepare("DELETE FROM audit_logs").run();
	});

	afterAll(async () => miniflare.dispose());

	it("renders the template selected by each notification binding", async () => {
		const fetchMock = vi
			.fn()
			.mockImplementation(() =>
				Promise.resolve(Response.json({ ok: true, result: {} })),
			);
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			notifyTelegram(db, "order.paid", {
				externalOrderId: "merchant-1001",
				status: "paid",
				amount: "12.50",
				currency: "USD",
				payment: { amount: "12.50", asset: "USDT" },
			}),
		).resolves.toEqual({ delivered: 2, failed: 0 });

		const requests = fetchMock.mock.calls.map(([, init]) =>
			JSON.parse(String((init as RequestInit).body)),
		);
		expect(requests).toEqual(
			expect.arrayContaining([
				{
					chat_id: "1001",
					parse_mode: "Markdown",
					text: "已付款 merchant-1001 · 12.50 USDT",
				},
				{
					chat_id: "1002",
					parse_mode: "Markdown",
					text: "預設 paid · merchant-1001",
				},
			]),
		);
	});

	it("records only redacted delivery context when Telegram rejects a message", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockImplementation(() =>
					Promise.resolve(new Response("bot token leaked", { status: 500 })),
				),
		);
		await expect(
			notifyTelegram(db, "order.paid", {
				externalOrderId: "merchant-secret-order",
				status: "paid",
			}),
		).resolves.toEqual({ delivered: 0, failed: 2 });

		const audits = await db
			.prepare("SELECT action, after FROM audit_logs ORDER BY target_id")
			.all<{ action: string; after: string }>();
		expect(audits.results).toHaveLength(2);
		for (const audit of audits.results) {
			expect(audit.action).toBe("telegram.delivery_failed");
			expect(JSON.parse(audit.after)).toEqual({ eventType: "order.paid" });
			expect(audit.after).not.toContain("merchant-secret-order");
			expect(audit.after).not.toContain("bot-token");
		}
	});
});

async function seed(db: D1Database) {
	const now = Date.now();
	const pepper = "telegram-notification-test-pepper";
	const token = await encryptSecret(
		"100:test-bot-token-with-enough-length",
		pepper,
	);
	await db.batch([
		db
			.prepare(
				"INSERT INTO system_settings (key, value, is_secret, created_at, updated_at) VALUES ('runtime.integration_config_secret', ?, 1, ?, ?)",
			)
			.bind(JSON.stringify(pepper), now, now),
		db
			.prepare(
				"INSERT INTO telegram_bots (id, name, token_encrypted, webhook_secret_encrypted, enabled, created_at, updated_at) VALUES ('bot', 'Payments', ?, 'unused', 1, ?, ?)",
			)
			.bind(token, now, now),
		db
			.prepare(
				"INSERT INTO telegram_notification_bindings (id, bot_id, template_translations, name, target_type, target_id, locale, events, enabled, created_at, updated_at) VALUES ('target-cn', 'bot', ?, 'CN operations', 'private', '1001', 'zh-CN', '[\"order.paid\"]', 1, ?, ?)",
			)
			.bind(
				JSON.stringify({
					"zh-CN":
						"已付款 {{externalOrderId}} · {{payment.amount}} {{payment.asset}}",
				}),
				now,
				now,
			),
		db
			.prepare(
				"INSERT INTO telegram_notification_bindings (id, bot_id, template_translations, name, target_type, target_id, locale, events, enabled, created_at, updated_at) VALUES ('target-tw', 'bot', ?, 'TW operations', 'group', '1002', 'zh-TW', '[\"order.paid\"]', 1, ?, ?)",
			)
			.bind(
				JSON.stringify({
					"zh-TW": "預設 {{status}} · {{externalOrderId}}",
				}),
				now,
				now,
			),
	]);
}
