import { describe, expect, it } from "vitest";
import { createTelegramApi } from "#/features/telegram/server/client";

describe.skip("Telegram platform smoke", () => {
	it("authenticates the Bot against the selected official environment", async () => {
		const identity = await telegramApi().getMe();
		expect(identity.id).toBeTypeOf("number");
	});

	it.skipIf(!process.env.TELEGRAM_SMOKE_CHAT_ID)(
		"delivers a message to an operator-owned test destination",
		async () => {
			await expect(
				telegramApi().sendMessage(
					process.env.TELEGRAM_SMOKE_CHAT_ID ?? "",
					"GMPay Edge platform smoke",
				),
			).resolves.toBeTruthy();
		},
	);
});

function telegramApi() {
	const token = process.env.TELEGRAM_SMOKE_BOT_TOKEN;
	if (!token) throw new Error("TELEGRAM_SMOKE_BOT_TOKEN is required");
	return createTelegramApi(
		token,
		fetch,
		process.env.TELEGRAM_SMOKE_TEST_MODE === "1" ? "test" : "prod",
	);
}
