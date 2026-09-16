import { z } from "zod";
import { hasOnlySafeTelegramTemplateVariables } from "#/features/telegram/template";

const telegramTemplateContent = z
	.string()
	.trim()
	.min(1)
	.max(4_000)
	.refine(
		hasOnlySafeTelegramTemplateVariables,
		"Template contains an unsupported variable",
	);

export const telegramTemplateTranslationsInput = z.object({
	"en-US": telegramTemplateContent,
	"ja-JP": telegramTemplateContent,
	"ko-KR": telegramTemplateContent,
	"ru-RU": telegramTemplateContent,
	"zh-TW": telegramTemplateContent,
	"zh-CN": telegramTemplateContent,
});
