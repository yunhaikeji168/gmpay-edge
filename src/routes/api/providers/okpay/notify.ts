import { createFileRoute } from "@tanstack/react-router";
import { handleOkPayNotification } from "#/features/payments/server/okpay-notification";
import { getEnv } from "#/server/db.server";

export const Route = createFileRoute("/api/providers/okpay/notify")({
	server: {
		handlers: {
			POST: ({ request }) => handleOkPayNotification(request, getEnv()),
		},
	},
});
