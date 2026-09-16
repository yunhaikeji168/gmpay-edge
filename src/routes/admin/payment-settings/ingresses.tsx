import { createFileRoute } from "@tanstack/react-router";
import {
	PaymentIngressesPage,
	paymentIngressesQueryOptions,
} from "#/features/payment-settings/pages/admin-ingresses";
import { validateProTableSearch } from "#/lib/pro-table-url-state";

export const Route = createFileRoute("/admin/payment-settings/ingresses")({
	validateSearch: validateProTableSearch,
	loader: ({ context }) => {
		void context.queryClient.prefetchQuery(paymentIngressesQueryOptions);
	},
	component: PaymentIngressesPage,
});
