import { m } from "#/paraglide/messages";

export function paymentOperationErrorMessage(error: unknown) {
	if (!error || typeof error !== "object" || !("code" in error))
		return m.payments_decision_failed();
	switch (error.code) {
		case "payment_not_found":
			return m.payments_error_not_found();
		case "payment_decision_already_resolved":
			return m.payments_error_decision_already_resolved();
		case "payment_decision_not_available":
			return m.payments_error_decision_not_available();
		default:
			return m.payments_decision_failed();
	}
}
