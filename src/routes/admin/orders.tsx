import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "#/features/orders/pages/admin-list";
import { validateProTableSearch } from "#/lib/pro-table-url-state";
export const Route = createFileRoute("/admin/orders")({
	validateSearch: validateProTableSearch,
	component: OrdersPage,
});
