import { createFileRoute } from "@tanstack/react-router";
import { ReceivingMethodsPage } from "#/features/payment-settings/pages/admin-methods";
import { validateProTableSearch } from "#/lib/pro-table-url-state";

export const Route = createFileRoute("/admin/receiving-methods/")({
	validateSearch: validateProTableSearch,
	component: ReceivingMethodsPage,
});
