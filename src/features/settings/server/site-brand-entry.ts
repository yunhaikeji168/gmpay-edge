import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { loadSiteBrandOrDefault } from "#/features/settings/server/site-brand";
import { getCloudflareEnv } from "#/server/db.server";

export const getSiteBrandFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const env = getCloudflareEnv(getRequest());
		return loadSiteBrandOrDefault(env.DB, env.CACHE);
	},
);
