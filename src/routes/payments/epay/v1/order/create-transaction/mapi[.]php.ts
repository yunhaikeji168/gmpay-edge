import { createFileRoute } from "@tanstack/react-router";
import { handleEpayMApiRequest } from "#/features/orders/server/epay-adapter";
import { getEnv } from "#/server/db.server";

export const Route = createFileRoute(
	"/payments/epay/v1/order/create-transaction/mapi.php",
)({
	server: {
		handlers: {
			GET: ({ request }) => handleEpayMApiRequest(request, getEnv()),
			POST: ({ request }) => handleEpayMApiRequest(request, getEnv()),
		},
	},
});
