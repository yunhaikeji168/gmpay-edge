export const supportedLocales = [
	"en-US",
	"ja-JP",
	"ko-KR",
	"ru-RU",
	"zh-TW",
	"zh-CN",
] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

/**
 * Native names identify locale choices and intentionally stay independent of
 * the active UI language. They are not Paraglide messages.
 */
export const localeLabels: Record<SupportedLocale, string> = {
	"en-US": "English",
	"ja-JP": "日本語",
	"ko-KR": "한국어",
	"ru-RU": "Русский",
	"zh-TW": "繁體中文",
	"zh-CN": "简体中文",
};
