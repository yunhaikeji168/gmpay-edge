import { m } from "#/paraglide/messages";

export function webhookOperationErrorMessage(error: unknown) {
	if (!error || typeof error !== "object" || !("code" in error))
		return m.webhooks_operation_failed();
	switch (error.code) {
		case "webhook_delivery_not_found":
			return m.webhooks_error_delivery_not_found();
		case "webhook_delivery_not_retryable":
			return m.webhooks_error_delivery_not_retryable();
		case "webhook_delivery_retry_in_progress":
			return m.webhooks_error_delivery_retry_in_progress();
		case "webhook_inbound_receipt_not_found":
			return m.webhooks_error_inbound_receipt_not_found();
		case "webhook_inbound_unavailable":
			return m.webhooks_error_inbound_unavailable();
		case "webhook_queue_unavailable":
			return m.webhooks_error_queue_unavailable();
		case "payment_event_source_not_found":
			return m.webhooks_error_source_not_found();
		case "payment_event_source_conflict":
			return m.webhooks_error_source_conflict();
		case "payment_event_source_network_invalid":
			return m.webhooks_error_source_network_invalid();
		case "payment_event_source_reconcile_failed":
			return m.webhooks_error_source_reconcile_failed();
		case "payment_event_source_not_ready":
			return m.webhooks_error_source_not_ready();
		case "payment_event_source_unavailable":
			return m.webhooks_error_source_unavailable();
		case "payment_provider_event_not_found":
			return m.webhooks_error_provider_event_not_found();
		case "payment_provider_event_not_retryable":
			return m.webhooks_error_provider_event_not_retryable();
		case "payment_provider_event_retry_in_progress":
			return m.webhooks_error_provider_event_retry_in_progress();
		case "payment_event_queue_unavailable":
			return m.webhooks_error_provider_event_queue_unavailable();
		default:
			return m.webhooks_operation_failed();
	}
}
