import { createFileRoute } from "@tanstack/react-router";
import { PermissionModulesPage } from "#/features/access/pages/admin-permission-registry";
import { validateProTableSearch } from "#/lib/pro-table-url-state";

export const Route = createFileRoute("/admin/access/modules")({
	validateSearch: validateProTableSearch,
	component: PermissionModulesPage,
});
