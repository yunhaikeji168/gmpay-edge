import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getHealthSnapshot } from "#/features/status/server/health";
import { getCloudflareEnv } from "#/server/db.server";

export const getStatusFn = createServerFn({ method: "GET" }).handler(
	async () => {
		return getHealthSnapshot(getCloudflareEnv(getRequest()) as Partial<Env>);
	},
);
