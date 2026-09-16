import { createFileRoute } from "@tanstack/react-router";
import { handleGmpayCreateRequest } from "#/features/orders/server/gmpay-api";
import { getEnv } from "#/server/db.server";

export const Route = createFileRoute(
	"/payments/gmpay/v1/order/create-transaction",
)({
	server: {
		handlers: {
			POST: ({ request }) => handleGmpayCreateRequest(request, getEnv()),
		},
	},
});
