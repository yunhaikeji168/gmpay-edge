import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireAdmin } from "#/features/access/server/require-admin";
import { systemPermission } from "#/features/access/system-rbac";
import { queryAdminDashboard } from "#/features/dashboard/server/query";
import { getCloudflareEnv } from "#/server/db.server";

export const getAdminDashboardFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const request = getRequest();
		await requireAdmin(request, systemPermission("dashboard", "read"));
		const db = getCloudflareEnv(request).DB;
		if (!db) throw new Error("D1 binding DB is unavailable");
		return queryAdminDashboard(db);
	},
);
