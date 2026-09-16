import { createFileRoute } from "@tanstack/react-router";
import { handleEpayCreateRequest } from "#/features/orders/server/epay-adapter";
import { getEnv } from "#/server/db.server";

export const Route = createFileRoute(
	"/payments/epay/v1/order/create-transaction/submit.php",
)({
	server: {
		handlers: {
			GET: ({ request }) => handleEpayCreateRequest(request, getEnv()),
			POST: ({ request }) => handleEpayCreateRequest(request, getEnv()),
		},
	},
});
