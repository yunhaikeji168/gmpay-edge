import { createFileRoute } from "@tanstack/react-router";
import { handleTelegramWebhookRequest } from "#/features/telegram/server/webhook";
import { getEnv } from "#/server/db.server";

export const Route = createFileRoute("/api/telegram/$botId/webhook")({
	server: {
		handlers: {
			POST: ({ request, params }) =>
				handleTelegramWebhookRequest(request, params.botId, getEnv()),
		},
	},
});
