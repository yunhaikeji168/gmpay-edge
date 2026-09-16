import { m } from "#/paraglide/messages";

export function paymentReviewErrorMessage(error: unknown) {
	if (!error || typeof error !== "object" || !("code" in error))
		return m.payment_reviews_resolve_failed();
	switch (error.code) {
		case "payment_review_not_found":
			return m.payment_reviews_error_not_found();
		case "payment_review_already_resolved":
			return m.payment_reviews_error_already_resolved();
		case "payment_review_transaction_required":
			return m.payment_reviews_error_transaction_required();
		case "payment_review_transaction_not_found":
			return m.payment_reviews_error_transaction_not_found();
		case "payment_review_transaction_mismatch":
			return m.payment_reviews_error_transaction_mismatch();
		case "payment_review_transaction_unavailable":
			return m.payment_reviews_error_transaction_unavailable();
		case "payment_review_resolution_conflict":
			return m.payment_reviews_error_resolution_conflict();
		case "payment_review_service_unavailable":
			return m.payment_reviews_error_service_unavailable();
		default:
			return m.payment_reviews_resolve_failed();
	}
}
