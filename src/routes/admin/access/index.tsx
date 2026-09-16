import { createFileRoute, redirect } from "@tanstack/react-router";
import { visibleModuleEntries } from "#/layouts/components/data/sidebar-data";
export const Route = createFileRoute("/admin/access/")({
	loader: async ({ parentMatchPromise }) => {
		const parentMatch = await parentMatchPromise;
		const parentData = parentMatch.loaderData;
		if (!parentData) throw redirect({ to: "/403" });
		const { systemAccess } = parentData;
		throw redirect({
			to:
				visibleModuleEntries("access", systemAccess.permissions)[0]?.url ??
				"/403",
		});
	},
});
