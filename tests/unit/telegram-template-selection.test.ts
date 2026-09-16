import { describe, expect, it } from "vitest";
import { selectTelegramTemplate } from "#/features/telegram/server/telegram";

const translations = { "zh-CN": "中文", "en-US": "English" };

describe("Telegram embedded template selection", () => {
	it("selects target content in the target locale then English", () => {
		expect(selectTelegramTemplate(translations, "zh-CN")?.content).toBe("中文");
		expect(selectTelegramTemplate(translations, "zh-TW")?.content).toBe(
			"English",
		);
	});

	it("does not select missing content", () => {
		expect(selectTelegramTemplate({}, "zh-CN")).toBeUndefined();
	});
});
