import { DomainError } from "#/lib/domain-error";

export function requireTelegramResource<T>(
	resource: T | null | undefined,
	kind: "bot" | "command" | "notification",
): T {
	if (resource) return resource;
	if (kind === "bot")
		throw new DomainError(
			"telegram_bot_not_found",
			404,
			"Telegram bot not found",
		);
	if (kind === "notification")
		throw new DomainError(
			"telegram_notification_not_found",
			404,
			"Telegram notification target not found",
		);
	throw new DomainError(
		"telegram_command_not_found",
		404,
		"Telegram Bot command not found",
	);
}

export function requireTelegramResourceAvailable(
	existing: unknown,
	kind: "notification" | "command",
) {
	if (!existing) return;
	if (kind === "notification")
		throw new DomainError(
			"telegram_notification_exists",
			409,
			"Telegram notification target already exists",
		);
	throw new DomainError(
		"telegram_command_exists",
		409,
		"Telegram Bot command already exists",
	);
}
