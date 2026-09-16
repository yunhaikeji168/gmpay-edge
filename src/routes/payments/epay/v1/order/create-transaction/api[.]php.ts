import { createFileRoute } from "@tanstack/react-router";
import { handleEpayQueryRequest } from "#/features/orders/server/epay-adapter";
import { getEnv } from "#/server/db.server";

export const Route = createFileRoute(
	"/payments/epay/v1/order/create-transaction/api.php",
)({
	server: {
		handlers: {
			GET: ({ request }) => handleEpayQueryRequest(request, getEnv()),
		},
	},
});
