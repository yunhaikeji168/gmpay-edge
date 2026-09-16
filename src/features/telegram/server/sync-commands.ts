import type { BotCommandScope, LanguageCode } from "grammy/types";
import { createTelegramApi } from "#/features/telegram/server/client";
import { DomainError } from "#/lib/domain-error";
import { type SupportedLocale, supportedLocales } from "#/lib/locales";
import { decryptSecret } from "#/lib/secrets";

type TelegramCommandScope = "default" | "private" | "group" | "admin";
const telegramCommandLocales = supportedLocales.filter(
	(locale) => locale !== "zh-TW",
);

export async function syncTelegramCommandCatalog(
	db: D1Database,
	botId: string,
	configSecret: string,
	request: typeof fetch = fetch,
) {
	const bot = await db
		.prepare("SELECT token_encrypted FROM telegram_bots WHERE id = ? LIMIT 1")
		.bind(botId)
		.first<{ token_encrypted: string }>();
	if (!bot)
		throw new DomainError(
			"telegram_bot_not_found",
			404,
			"Telegram bot not found",
		);
	const commands = await db
		.prepare(
			`SELECT command, description_en_us, description_ja_jp, description_ko_kr,
			 description_ru_ru, description_zh_tw, description_zh_cn, scope
			 FROM telegram_bot_commands WHERE enabled = 1
			 ORDER BY scope, sort_order, command`,
		)
		.all<{
			command: string;
			description_en_us: string;
			description_ja_jp: string;
			description_ko_kr: string;
			description_ru_ru: string;
			description_zh_tw: string;
			description_zh_cn: string;
			scope: TelegramCommandScope;
		}>();
	const token = await decryptSecret(bot.token_encrypted, configSecret);
	const api = createTelegramApi(token, request);
	let synced = 0;
	for (const scope of ["default", "private", "group", "admin"] as const) {
		const scoped = commands.results.filter((item) => item.scope === scope);
		await api.setMyCommands(
			scoped.map((item) => ({
				command: item.command,
				description: commandDescription(item, "en-US"),
			})),
			{ scope: telegramCommandScope(scope) },
		);
		synced += scoped.length;
		for (const locale of telegramCommandLocales) {
			await api.setMyCommands(
				scoped.map((item) => ({
					command: item.command,
					description: commandDescription(item, locale),
				})),
				{
					scope: telegramCommandScope(scope),
					language_code: telegramLanguageCode(locale),
				},
			);
			synced += scoped.length;
		}
	}
	return { synced };
}

export async function syncAllTelegramCommandCatalogs(
	db: D1Database,
	configSecret: string,
	request: typeof fetch = fetch,
) {
	const bots = await db
		.prepare("SELECT id, name FROM telegram_bots ORDER BY name, id")
		.all<{ id: string; name: string }>();
	const results = [];
	for (const bot of bots.results) {
		try {
			const result = await syncTelegramCommandCatalog(
				db,
				bot.id,
				configSecret,
				request,
			);
			results.push({
				botId: bot.id,
				botName: bot.name,
				ok: true as const,
				...result,
			});
		} catch {
			results.push({
				botId: bot.id,
				botName: bot.name,
				ok: false as const,
				errorCode: "telegram_command_sync_failed" as const,
			});
		}
	}
	return { results };
}

function commandDescription(
	item: {
		description_en_us: string;
		description_ja_jp: string;
		description_ko_kr: string;
		description_ru_ru: string;
		description_zh_tw: string;
		description_zh_cn: string;
	},
	locale: SupportedLocale,
) {
	return {
		"en-US": item.description_en_us,
		"ja-JP": item.description_ja_jp,
		"ko-KR": item.description_ko_kr,
		"ru-RU": item.description_ru_ru,
		"zh-TW": item.description_zh_tw,
		"zh-CN": item.description_zh_cn,
	}[locale];
}

function telegramLanguageCode(locale: SupportedLocale): LanguageCode {
	const codes = {
		"en-US": "en",
		"ja-JP": "ja",
		"ko-KR": "ko",
		"ru-RU": "ru",
		"zh-TW": "zh",
		"zh-CN": "zh",
	} satisfies Record<SupportedLocale, LanguageCode>;
	return codes[locale];
}

function telegramCommandScope(scope: TelegramCommandScope): BotCommandScope {
	return {
		type:
			scope === "private"
				? "all_private_chats"
				: scope === "group"
					? "all_group_chats"
					: scope === "admin"
						? "all_chat_administrators"
						: "default",
	};
}
