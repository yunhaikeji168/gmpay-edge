import { createTelegramApi } from "#/features/telegram/server/client";
import {
	renderTelegramTemplate,
	telegramTemplateParseMode,
} from "#/features/telegram/template";
import { parseTelegramTemplateTranslations } from "#/features/telegram/template-translations";
import type { SupportedLocale } from "#/lib/locales";
import { decryptSecret } from "#/lib/secrets";
import { loadRuntimeConfig } from "#/server/runtime-config";

type TelegramTarget = {
	target_id: string;
	bot_id: string;
	template_translations: unknown;
	recipient_id: string;
	token_encrypted: string;
	locale: SupportedLocale;
	events: string;
};

export async function notifyTelegram(
	db: D1Database,
	eventType: string,
	payload: Record<string, unknown>,
) {
	const targets = await db
		.prepare(
			`SELECT target.id AS target_id, target.bot_id, target.template_translations, target.target_id AS recipient_id,
		 target.locale, target.events, b.token_encrypted
		 FROM telegram_notification_bindings target
		 JOIN telegram_bots b ON b.id = target.bot_id
		 WHERE b.enabled = 1 AND target.enabled = 1`,
		)
		.all<TelegramTarget>();
	const selected = targets.results.filter((target) => {
		const events = parseEvents(target.events);
		return events.includes("*") || events.includes(eventType);
	});
	if (!selected.length) return { delivered: 0, failed: 0 };
	const configSecret = (await loadRuntimeConfig(db)).integrationConfigSecret;
	if (!configSecret) return { delivered: 0, failed: 0 };
	const results = await Promise.allSettled(
		selected.map(async (target) => {
			const token = await decryptSecret(target.token_encrypted, configSecret);
			const template = selectTelegramTemplate(
				target.template_translations,
				target.locale,
			);
			const text = template
				? renderTelegramTemplate(template.content, payload)
				: formatNotification(eventType, payload, target.locale);
			await createTelegramApi(token).sendMessage(
				target.recipient_id,
				text,
				template ? { parse_mode: telegramTemplateParseMode } : undefined,
			);
		}),
	);
	await persistTelegramDeliveryFailures(db, eventType, selected, results);
	return {
		delivered: results.filter((result) => result.status === "fulfilled").length,
		failed: results.filter((result) => result.status === "rejected").length,
	};
}

export async function persistTelegramDeliveryFailures(
	db: D1Database,
	eventType: string,
	targets: readonly Pick<TelegramTarget, "target_id">[],
	results: readonly PromiseSettledResult<unknown>[],
) {
	const now = Date.now();
	const failures = results.flatMap((result, index) =>
		result.status === "rejected" && targets[index]
			? [{ targetId: targets[index].target_id }]
			: [],
	);
	if (!failures.length) return 0;
	await db.batch(
		failures.map(({ targetId }) =>
			db
				.prepare(
					"INSERT INTO audit_logs (id, action, target_type, target_id, after, created_at) VALUES (?, 'telegram.delivery_failed', 'telegram_notification_target', ?, ?, ?)",
				)
				.bind(
					crypto.randomUUID(),
					targetId,
					JSON.stringify({ eventType }),
					now,
				),
		),
	);
	return failures.length;
}

function formatNotification(
	eventType: string,
	payload: Record<string, unknown>,
	locale: TelegramTarget["locale"],
) {
	const payment = isObject(payload.payment) ? payload.payment : {};
	const labels = notificationLabels[locale];
	return [
		`GMPay Edge · ${eventType}`,
		`${labels.order}: ${String(payload.externalOrderId ?? payload.orderId ?? "—")}`,
		`${labels.status}: ${String(payload.status ?? "—")}`,
		`${labels.amount}: ${String(payload.amount ?? "—")} ${String(payload.currency ?? "")}`.trim(),
		`${labels.payment}: ${String(payment.amount ?? "—")} ${String(payment.asset ?? "")}`.trim(),
	].join("\n");
}

const notificationLabels = {
	"en-US": {
		order: "Order",
		status: "Status",
		amount: "Amount",
		payment: "Payment",
	},
	"ja-JP": {
		order: "注文",
		status: "ステータス",
		amount: "金額",
		payment: "支払い",
	},
	"ko-KR": { order: "주문", status: "상태", amount: "금액", payment: "결제" },
	"ru-RU": {
		order: "Заказ",
		status: "Статус",
		amount: "Сумма",
		payment: "Платёж",
	},
	"zh-CN": { order: "订单", status: "状态", amount: "金额", payment: "付款" },
	"zh-TW": { order: "訂單", status: "狀態", amount: "金額", payment: "付款" },
} as const;

export function selectTelegramTemplate(
	value: unknown,
	locale: TelegramTarget["locale"],
) {
	const translations = parseTelegramTemplateTranslations(value);
	const content = translations[locale] || translations["en-US"];
	return content ? { content } : undefined;
}

function parseEvents(value: string): string[] {
	try {
		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed) &&
			parsed.every((item) => typeof item === "string")
			? parsed
			: [];
	} catch {
		return [];
	}
}

function isObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
