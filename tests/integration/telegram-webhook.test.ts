import { Miniflare } from "miniflare";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { handleTelegramWebhookRequest } from "#/features/telegram/server/webhook";
import { encryptSecret } from "#/lib/secrets";
import {
	createDatastoreCounters,
	instrumentD1,
} from "../helpers/datastore-counters";
import { applyMigrations } from "./migrations";

const botId = "11111111-1111-4111-8111-111111111111";
const configSecret = "telegram-webhook-config-secret-with-enough-entropy";
const webhookSecret = "telegram-webhook-secret";

describe("Telegram webhook request budget", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-telegram-webhook-budget" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		const now = Date.now();
		await db.batch([
			db
				.prepare(
					"INSERT INTO system_settings (key, value, is_secret, created_at, updated_at) VALUES ('runtime.integration_config_secret', ?, 1, ?, ?)",
				)
				.bind(JSON.stringify(configSecret), now, now),
			db
				.prepare(
					"INSERT INTO telegram_bots (id, name, token_encrypted, webhook_secret_encrypted, enabled, created_at, updated_at) VALUES (?, 'Budget Bot', ?, ?, 1, ?, ?)",
				)
				.bind(
					botId,
					await encryptSecret("100:telegram-token", configSecret),
					await encryptSecret(webhookSecret, configSecret),
					now,
					now,
				),
		]);
	});

	afterAll(async () => miniflare.dispose());
	afterEach(() => vi.unstubAllGlobals());

	it("processes a valid no-op update with one bot/runtime/receipt pass", async () => {
		const counters = createDatastoreCounters();
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const response = await handleTelegramWebhookRequest(
			request("telegram-valid", webhookSecret, {
				update_id: 1,
				message: { chat: { id: 1, type: "private" } },
			}),
			botId,
			{ DB: instrumentD1(db, counters) } as Env,
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(fetchMock).not.toHaveBeenCalled();
		expect(counters).toMatchObject({
			d1Prepare: 3,
			d1StatementFirst: 1,
			d1StatementAll: 1,
			d1StatementRun: 1,
			d1Batch: 0,
		});
	});

	it("records an invalid secret without parsing or processing the update", async () => {
		const counters = createDatastoreCounters();
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const response = await handleTelegramWebhookRequest(
			request("telegram-invalid", "wrong-secret", { invalid: true }),
			botId,
			{ DB: instrumentD1(db, counters) } as Env,
		);

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(counters).toMatchObject({
			d1Prepare: 3,
			d1StatementFirst: 1,
			d1StatementAll: 1,
			d1StatementRun: 1,
			d1Batch: 0,
		});
	});
});

function request(requestId: string, secret: string, body: unknown) {
	return new Request(`https://pay.example/api/telegram/${botId}/webhook`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-request-id": requestId,
			"x-telegram-bot-api-secret-token": secret,
		},
		body: JSON.stringify(body),
	});
}
