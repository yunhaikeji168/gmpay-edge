import { createFileRoute } from "@tanstack/react-router";
import {
	RatesPage,
	ratesPageQueryOptions,
} from "#/features/payment-settings/pages/admin-rates";
import { validateProTableSearch } from "#/lib/pro-table-url-state";

export const Route = createFileRoute("/admin/payment-settings/rates/fiat")({
	validateSearch: validateProTableSearch,
	loader: ({ context }) => {
		void context.queryClient.prefetchQuery(ratesPageQueryOptions("fiat"));
	},
	component: () => <RatesPage view="fiat" />,
});
