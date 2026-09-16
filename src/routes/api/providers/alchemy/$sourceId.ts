import { createFileRoute } from "@tanstack/react-router";
import { handleAlchemyAddressActivity } from "#/features/payments/server/alchemy-webhook";
import { getEnv } from "#/server/db.server";

export const Route = createFileRoute("/api/providers/alchemy/$sourceId")({
	server: {
		handlers: {
			POST: ({ request, params }) =>
				handleAlchemyAddressActivity(request, params.sourceId, getEnv()),
		},
	},
});
