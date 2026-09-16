import { describe, expect, it } from "vitest";
import { telegramTemplateTranslationsInput } from "#/features/telegram/schema";

describe("Telegram direct message content", () => {
	it("requires content for every supported locale", () => {
		const translations = Object.fromEntries(
			["en-US", "ja-JP", "ko-KR", "ru-RU", "zh-TW", "zh-CN"].map((locale) => [
				locale,
				"Order {{externalOrderId}} is {{status}}",
			]),
		);
		expect(telegramTemplateTranslationsInput.parse(translations)).toEqual(
			translations,
		);
		expect(
			telegramTemplateTranslationsInput.safeParse({
				...translations,
				"zh-CN": "",
			}).success,
		).toBe(false);
	});

	it("rejects unsupported variables", () => {
		expect(
			telegramTemplateTranslationsInput.safeParse({
				"en-US": "Safe",
				"ja-JP": "Safe",
				"ko-KR": "Safe",
				"ru-RU": "Safe",
				"zh-TW": "Safe",
				"zh-CN": "{{process.env.SECRET}}",
			}).success,
		).toBe(false);
	});
});
