import { describe, expect, it } from "vitest";
import { TelegramApiRequestError } from "#/features/telegram/server/client";

describe("Telegram provider errors", () => {
	it("does not retain an unknown provider message", () => {
		const error = new TelegramApiRequestError(
			new Error("HTTP 401 token=secret provider body"),
		);

		expect(error).toMatchObject({
			name: "TelegramApiRequestError",
			code: "request_failed",
			message: "Telegram Bot API request failed",
		});
		expect(JSON.stringify(error)).not.toContain("secret");
	});
});
