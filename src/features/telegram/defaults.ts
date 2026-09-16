import { parseTelegramTemplateTranslations } from "#/features/telegram/template-translations";
import type { SupportedLocale } from "#/lib/locales";

export const defaultTelegramCommands = [
	{
		command: "start",
		descriptions: {
			"en-US": "Open GMPay Edge",
			"ja-JP": "GMPay Edge を開く",
			"ko-KR": "GMPay Edge 열기",
			"ru-RU": "Открыть GMPay Edge",
			"zh-TW": "開啟 GMPay Edge",
			"zh-CN": "打开 GMPay Edge",
		},
		handlerType: "start",
	},
	{
		command: "help",
		descriptions: {
			"en-US": "Show available commands",
			"ja-JP": "利用可能なコマンドを表示",
			"ko-KR": "사용 가능한 명령 보기",
			"ru-RU": "Показать доступные команды",
			"zh-TW": "顯示可用指令",
			"zh-CN": "显示可用指令",
		},
		handlerType: "help",
	},
	{
		command: "new",
		descriptions: {
			"en-US": "Create a payment order",
			"ja-JP": "支払い注文を作成",
			"ko-KR": "결제 주문 만들기",
			"ru-RU": "Создать платёжный заказ",
			"zh-TW": "建立支付訂單",
			"zh-CN": "创建支付订单",
		},
		handlerType: "new",
	},
	{
		command: "status",
		descriptions: {
			"en-US": "Check an order status",
			"ja-JP": "注文ステータスを確認",
			"ko-KR": "주문 상태 확인",
			"ru-RU": "Проверить статус заказа",
			"zh-TW": "查詢訂單狀態",
			"zh-CN": "查询订单状态",
		},
		handlerType: "status",
	},
] as const;

type DefaultTelegramTemplateTranslation = {
	locale: SupportedLocale;
	content: string;
};

const defaultNotificationTemplates: ReadonlyArray<DefaultTelegramTemplateTranslation> =
	[
		{
			locale: "en-US",
			content:
				"*GMPay Edge*\n\n*Order:* {{externalOrderId}}\n*Status:* {{status}}\n*Amount:* {{amount}} {{currency}}\n*Payment:* {{payment.amount}} {{payment.asset}}",
		},
		{
			locale: "ja-JP",
			content:
				"*GMPay Edge*\n\n*注文：* {{externalOrderId}}\n*ステータス：* {{status}}\n*金額：* {{amount}} {{currency}}\n*支払い：* {{payment.amount}} {{payment.asset}}",
		},
		{
			locale: "ko-KR",
			content:
				"*GMPay Edge*\n\n*주문:* {{externalOrderId}}\n*상태:* {{status}}\n*금액:* {{amount}} {{currency}}\n*결제:* {{payment.amount}} {{payment.asset}}",
		},
		{
			locale: "ru-RU",
			content:
				"*GMPay Edge*\n\n*Заказ:* {{externalOrderId}}\n*Статус:* {{status}}\n*Сумма:* {{amount}} {{currency}}\n*Платёж:* {{payment.amount}} {{payment.asset}}",
		},
		{
			locale: "zh-TW",
			content:
				"*GMPay Edge*\n\n*訂單：* {{externalOrderId}}\n*狀態：* {{status}}\n*金額：* {{amount}} {{currency}}\n*付款：* {{payment.amount}} {{payment.asset}}",
		},
		{
			locale: "zh-CN",
			content:
				"*GMPay Edge*\n\n*订单：* {{externalOrderId}}\n*状态：* {{status}}\n*金额：* {{amount}} {{currency}}\n*付款：* {{payment.amount}} {{payment.asset}}",
		},
	];

const defaultCommandTemplateCatalogs = [
	{
		command: "start",
		name: "Start command",
		contents: {
			"en-US":
				"*Welcome to GMPay Edge*\n\nYour Telegram account is ready. Use /help to view available commands.",
			"ja-JP":
				"*GMPay Edge へようこそ*\n\nTelegram アカウントを利用できます。/help でコマンドを確認してください。",
			"ko-KR":
				"*GMPay Edge에 오신 것을 환영합니다*\n\nTelegram 계정이 준비되었습니다. /help로 명령을 확인하세요.",
			"ru-RU":
				"*Добро пожаловать в GMPay Edge*\n\nАккаунт Telegram готов. Используйте /help для просмотра команд.",
			"zh-TW":
				"*歡迎使用 GMPay Edge*\n\nTelegram 帳戶已就緒，使用 /help 查看可用指令。",
			"zh-CN":
				"*欢迎使用 GMPay Edge*\n\nTelegram 账户已就绪，使用 /help 查看可用指令。",
		},
	},
	{
		command: "help",
		name: "Help command",
		contents: {
			"en-US":
				"*Available commands*\n\n/start — Initialize Telegram\n/help — Show commands\n/new — Create an order\n/status — Check an order",
			"ja-JP":
				"*利用可能なコマンド*\n\n/start — Telegram を初期化\n/help — コマンドを表示\n/new — 注文を作成\n/status — 注文を確認",
			"ko-KR":
				"*사용 가능한 명령*\n\n/start — Telegram 초기화\n/help — 명령 보기\n/new — 주문 만들기\n/status — 주문 확인",
			"ru-RU":
				"*Доступные команды*\n\n/start — Инициализировать Telegram\n/help — Показать команды\n/new — Создать заказ\n/status — Проверить заказ",
			"zh-TW":
				"*可用指令*\n\n/start — 初始化 Telegram\n/help — 顯示指令\n/new — 建立訂單\n/status — 查詢訂單",
			"zh-CN":
				"*可用指令*\n\n/start — 初始化 Telegram\n/help — 显示指令\n/new — 创建订单\n/status — 查询订单",
		},
	},
	{
		command: "new",
		name: "New order command",
		contents: {
			"en-US":
				"*Create an order*\n\nOpen Inline mode, enter the amount and currency, then choose a receiving method.",
			"ja-JP":
				"*注文を作成*\n\nInline モードで金額と通貨を入力し、受取方法を選択してください。",
			"ko-KR":
				"*주문 만들기*\n\nInline 모드에서 금액과 통화를 입력한 다음 수취 방법을 선택하세요.",
			"ru-RU":
				"*Создание заказа*\n\nОткройте Inline-режим, введите сумму и валюту, затем выберите способ получения.",
			"zh-TW":
				"*建立訂單*\n\n開啟 Inline 模式，輸入金額與幣別，然後選擇收款方式。",
			"zh-CN":
				"*创建订单*\n\n打开 Inline 模式，输入金额与币种，然后选择收款方式。",
		},
	},
	{
		command: "status",
		name: "Order status command",
		contents: {
			"en-US": "*Check an order*\n\nSend /status followed by the order number.",
			"ja-JP": "*注文を確認*\n\n/status の後に注文番号を入力してください。",
			"ko-KR": "*주문 확인*\n\n/status 뒤에 주문 번호를 입력하세요.",
			"ru-RU": "*Проверка заказа*\n\nОтправьте /status и номер заказа.",
			"zh-TW": "*查詢訂單*\n\n傳送 /status，後面加上訂單編號。",
			"zh-CN": "*查询订单*\n\n发送 /status，后面加上订单号。",
		},
	},
] as const satisfies ReadonlyArray<{
	command: string;
	name: string;
	contents: Record<SupportedLocale, string>;
}>;

export const defaultTelegramNotificationTranslations = Object.fromEntries(
	defaultNotificationTemplates.map((template) => [
		template.locale,
		template.content,
	]),
) as Record<SupportedLocale, string>;

const defaultCommandTranslations = new Map<
	string,
	Record<SupportedLocale, string>
>(
	defaultCommandTemplateCatalogs.map((catalog) => [
		catalog.command,
		catalog.contents,
	]),
);

export function defaultTelegramCommandTranslations(
	command: string,
): Record<SupportedLocale, string> {
	const translations = defaultCommandTranslations.get(command);
	if (!translations)
		throw new Error(`Unknown default Telegram command: ${command}`);
	return translations;
}

export const defaultTelegramSettings = [
	{
		key: "telegram.default_events",
		value: ["*"],
	},
	{
		key: "telegram.default_template_translations",
		value: defaultTelegramNotificationTranslations,
	},
] as const;

export async function reconcileTelegramDefaults(
	db: D1Database,
	now = Date.now(),
) {
	const statements: D1PreparedStatement[] = [];
	const [commands, settings] = await db.batch([
		db.prepare(
			"SELECT command, template_translations FROM telegram_bot_commands WHERE scope = 'default'",
		),
		db.prepare(
			"SELECT key, value FROM system_settings WHERE key IN ('telegram.default_events', 'telegram.default_template_translations')",
		),
	]);
	const existingCommands = new Map(
		(
			commands as D1Result<{ command: string; template_translations: unknown }>
		).results.map((command) => [
			command.command,
			command.template_translations,
		]),
	);
	const existingSettings = new Map(
		(settings as D1Result<{ key: string; value: string }>).results.map(
			(setting) => [setting.key, setting.value],
		),
	);
	for (const [index, command] of defaultTelegramCommands.entries()) {
		const templateTranslations = defaultCommandTranslations.get(
			command.command,
		);
		if (!templateTranslations) continue;
		const existing = existingCommands.get(command.command);
		if (existing) {
			const merged = fillMissingTranslations(existing, templateTranslations);
			if (merged)
				statements.push(
					db
						.prepare(
							"UPDATE telegram_bot_commands SET template_translations = ?, updated_at = ? WHERE command = ? AND scope = 'default'",
						)
						.bind(JSON.stringify(merged), now, command.command),
				);
			continue;
		}
		statements.push(
			db
				.prepare(
					`INSERT OR IGNORE INTO telegram_bot_commands
					 (id, command, description_en_us, description_ja_jp, description_ko_kr,
					  description_ru_ru, description_zh_tw, description_zh_cn, handler_type,
					  template_translations, scope, sort_order, enabled, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'default', ?, 1, ?, ?)`,
				)
				.bind(
					`telegram-command-${command.command}-default`,
					command.command,
					command.descriptions["en-US"],
					command.descriptions["ja-JP"],
					command.descriptions["ko-KR"],
					command.descriptions["ru-RU"],
					command.descriptions["zh-TW"],
					command.descriptions["zh-CN"],
					command.handlerType,
					JSON.stringify(templateTranslations),
					(index + 1) * 10,
					now,
					now,
				),
		);
	}
	for (const setting of defaultTelegramSettings) {
		if (
			setting.key === "telegram.default_template_translations" &&
			existingSettings.has(setting.key)
		) {
			const merged = fillMissingTranslations(
				existingSettings.get(setting.key),
				defaultTelegramNotificationTranslations,
			);
			if (merged)
				statements.push(
					db
						.prepare(
							"UPDATE system_settings SET value = ?, updated_at = ? WHERE key = ?",
						)
						.bind(JSON.stringify(merged), now, setting.key),
				);
			continue;
		}
		statements.push(
			db
				.prepare(
					`INSERT OR IGNORE INTO system_settings
					 (key, value, is_secret, updated_by, created_at, updated_at)
					 VALUES (?, ?, 0, NULL, ?, ?)`,
				)
				.bind(setting.key, JSON.stringify(setting.value), now, now),
		);
	}
	const results = await db.batch(statements);
	return {
		added: results.reduce((total, result) => total + result.meta.changes, 0),
	};
}

function fillMissingTranslations(
	current: unknown,
	fallback: Record<SupportedLocale, string>,
) {
	const translations = parseTelegramTemplateTranslations(current);
	let changed = false;
	for (const [locale, content] of Object.entries(fallback)) {
		if (translations[locale as SupportedLocale]) continue;
		translations[locale as SupportedLocale] = content;
		changed = true;
	}
	return changed ? translations : undefined;
}
