import { createFileRoute } from "@tanstack/react-router";
import { PermissionBitsPage } from "#/features/access/pages/admin-permission-registry";
import { validateProTableSearch } from "#/lib/pro-table-url-state";

export const Route = createFileRoute("/admin/access/permission-bits")({
	validateSearch: validateProTableSearch,
	component: PermissionBitsPage,
});
