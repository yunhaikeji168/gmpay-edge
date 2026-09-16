import { createFileRoute } from "@tanstack/react-router";
import { handleGmpayQueryRequest } from "#/features/orders/server/gmpay-api";
import { getEnv } from "#/server/db.server";

export const Route = createFileRoute("/payments/gmpay/v1/order/query")({
	server: {
		handlers: {
			GET: ({ request }) => handleGmpayQueryRequest(request, getEnv()),
		},
	},
});
