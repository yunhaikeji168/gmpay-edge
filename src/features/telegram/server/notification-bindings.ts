import { DomainError } from "#/lib/domain-error";

export async function updateTelegramNotificationEnabled(
	db: D1Database,
	input: { id: string; enabled: boolean; now?: number },
) {
	const result = await db
		.prepare(
			"UPDATE telegram_notification_bindings SET enabled = ?, updated_at = ? WHERE id = ?",
		)
		.bind(input.enabled, input.now ?? Date.now(), input.id)
		.run();
	if ((result.meta.changes ?? 0) !== 1)
		throw new DomainError(
			"telegram_notification_not_found",
			404,
			"Telegram notification target not found",
		);
	return { id: input.id, enabled: input.enabled };
}
