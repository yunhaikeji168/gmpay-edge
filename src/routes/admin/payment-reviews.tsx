import { createFileRoute } from "@tanstack/react-router";
import { PaymentReviewsPage } from "#/features/payment-reviews/pages/admin-list";
import { validateProTableSearch } from "#/lib/pro-table-url-state";

export const Route = createFileRoute("/admin/payment-reviews")({
	validateSearch: validateProTableSearch,
	component: PaymentReviewsPage,
});
