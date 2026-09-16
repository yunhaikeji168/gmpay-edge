import { createServerOnlyFn } from "@tanstack/react-start";
import { AccessDeniedError } from "#/features/access/server/access-cache";
import { getAdminPermissions } from "#/features/access/server/require-admin";
import { isInstalled } from "#/features/installation/server/install";
import { getDb } from "#/server/db.server";

export const loadAdminBootstrap = createServerOnlyFn(
	async (request: Request) => {
		if (!(await isInstalled(getDb(request))))
			return { installed: false } as const;
		try {
			return {
				installed: true,
				access: await getAdminPermissions(request),
			} as const;
		} catch (error) {
			if (error instanceof AccessDeniedError && error.status === 401)
				return { installed: true, access: null } as const;
			throw error;
		}
	},
);
