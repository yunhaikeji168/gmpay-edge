import { createFileRoute } from "@tanstack/react-router";
import {
	PaymentMethodsPage,
	paymentMethodsQueryOptions,
} from "#/features/payment-settings/pages/admin-payment-methods";
import { validateProTableSearch } from "#/lib/pro-table-url-state";

export const Route = createFileRoute("/admin/payment-settings/")({
	validateSearch: validateProTableSearch,
	loader: ({ context }) => {
		void context.queryClient.prefetchQuery(paymentMethodsQueryOptions);
	},
	component: PaymentMethodsRoute,
});

function PaymentMethodsRoute() {
	return <PaymentMethodsPage search={Route.parentRoute.useSearch()} />;
}
