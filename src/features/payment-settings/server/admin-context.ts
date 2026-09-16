import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireAdmin } from "#/features/access/server/require-admin";
import type { SystemPermission } from "#/features/access/system-rbac";
import { getCloudflareEnv } from "#/server/db.server";
import { loadRequestRuntimeConfig } from "#/server/runtime-config";

export const adminContext = createServerOnlyFn(
	async (permission: SystemPermission) => {
		const request = getRequest();
		const user = await requireAdmin(request, permission);
		const env = getCloudflareEnv(request);
		if (!env.DB) throw new Error("D1 binding DB is unavailable");
		const runtime = await loadRequestRuntimeConfig(
			request,
			env.DB,
			new URL(request.url).origin,
		);
		if (!runtime.integrationConfigSecret)
			throw new Error("INTEGRATION_CONFIG_SECRET is not configured");
		return { db: env.DB, env, request, runtime, user };
	},
);
