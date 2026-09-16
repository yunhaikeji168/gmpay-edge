import { createFileRoute } from "@tanstack/react-router";
import { UsersPage } from "#/features/users/pages/admin-list";
import { validateProTableSearch } from "#/lib/pro-table-url-state";

export const Route = createFileRoute("/admin/access/users")({
	validateSearch: validateProTableSearch,
	component: UsersPage,
});
