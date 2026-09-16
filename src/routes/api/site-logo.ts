import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { siteAssetResponse } from "#/features/settings/server/site-asset-response";
import { getCloudflareEnv } from "#/server/db.server";
export const Route = createFileRoute("/api/site-logo")({
	server: {
		handlers: {
			GET: ({ request }) =>
				siteAssetResponse(
					request,
					getCloudflareEnv(getRequest()).FILES,
					"branding/site-logo",
				),
		},
	},
});
