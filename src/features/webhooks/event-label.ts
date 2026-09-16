import { m } from "#/paraglide/messages";

export function webhookEventLabel(event: string) {
	if (event === "*" || event === "all") return m.webhook_event_all();
	if (event === "order") return m.system_nav_orders();
	if (event === "payment") return m.system_nav_payments();
	const orderStatus = event.startsWith("order.") ? event.slice(6) : null;
	const status = orderStatus ? orderStatusLabel(orderStatus) : null;
	if (status) return `${m.system_nav_orders()} · ${status}`;
	if (event === "payment.late_detected")
		return `${m.system_nav_payments()} · ${m.webhook_event_late_detected()}`;
	if (event === "payment.late_rejected")
		return `${m.system_nav_payments()} · ${m.webhook_event_late_rejected()}`;
	return event;
}

export function webhookEventItemLabel(event: string) {
	const orderStatus = event.startsWith("order.") ? event.slice(6) : null;
	const status = orderStatus ? orderStatusLabel(orderStatus) : null;
	if (status) return status;
	if (event === "payment.late_detected") return m.webhook_event_late_detected();
	if (event === "payment.late_rejected") return m.webhook_event_late_rejected();
	return webhookEventLabel(event);
}

function orderStatusLabel(status: string) {
	const labels: Record<string, string> = {
		pending: m.status_pending(),
		confirming: m.status_confirming(),
		paid: m.status_paid(),
		partially_paid: m.status_partially_paid(),
		overpaid: m.status_overpaid(),
		expired: m.status_expired(),
		cancelled: m.status_cancelled(),
		failed: m.status_failed(),
		refunded: m.status_refunded(),
	};
	return labels[status];
}
