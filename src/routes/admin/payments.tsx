import { createFileRoute } from "@tanstack/react-router";
import { PaymentsPage } from "#/features/payments/pages/admin-list";
import { validateProTableSearch } from "#/lib/pro-table-url-state";
export const Route = createFileRoute("/admin/payments")({
	validateSearch: validateProTableSearch,
	component: PaymentsPage,
});
