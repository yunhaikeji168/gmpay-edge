import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "#/features/auth/server/auth";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async ({ request }) => (await getAuth(request)).handler(request),
			POST: async ({ request }) => (await getAuth(request)).handler(request),
		},
	},
});
