import { createFileRoute } from "@tanstack/react-router";
import { ApiKeysPage } from "#/features/api-keys/pages/admin";
import { validateProTableSearch } from "#/lib/pro-table-url-state";
export const Route = createFileRoute("/admin/api-keys")({
	validateSearch: validateProTableSearch,
	component: ApiKeysPage,
});
