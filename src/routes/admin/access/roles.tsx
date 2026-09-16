import { createFileRoute } from "@tanstack/react-router";
import { SystemAccessPage } from "#/features/access/pages/admin";
import { validateProTableSearch } from "#/lib/pro-table-url-state";

export const Route = createFileRoute("/admin/access/roles")({
	validateSearch: validateProTableSearch,
	component: SystemAccessPage,
});
