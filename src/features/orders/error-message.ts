import { m } from "#/paraglide/messages";

export function orderOperationErrorMessage(error: unknown) {
	if (!error || typeof error !== "object" || !("code" in error))
		return m.orders_operation_failed();
	switch (error.code) {
		case "order_not_found":
		case "order_payment_target_not_found":
			return m.orders_error_not_found();
		case "order_development_only":
			return m.orders_error_development_only();
		case "order_status_conflict":
			return m.orders_error_status_conflict();
		case "order_payment_queue_unavailable":
			return m.orders_error_payment_queue_unavailable();
		case "order_webhook_queue_unavailable":
			return m.orders_error_webhook_queue_unavailable();
		case "order_notification_missing":
			return m.orders_error_notification_missing();
		case "order_mock_only":
			return m.orders_error_mock_only();
		default:
			return m.orders_operation_failed();
	}
}
