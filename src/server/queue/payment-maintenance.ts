import { refreshPaymentConnectionHealthByIds } from "#/features/payment-settings/server/connection-health";
import { refreshRateCategoryIfDue } from "#/features/payment-settings/server/exchange-rates";
import type {
	PaymentEventSourceReconcileMessage,
	PaymentRateSyncMessage,
	PaymentRpcHealthMessage,
} from "#/features/payments/types";
import { reconcilePaymentEventSource } from "#/features/webhooks/server/payment-event-source-reconciliation";
import type { RuntimeConfig } from "#/server/runtime-config";

type PaymentMaintenanceMessage =
	| PaymentRateSyncMessage
	| PaymentRpcHealthMessage
	| PaymentEventSourceReconcileMessage;

export async function handlePaymentMaintenance(
	message: Message<PaymentMaintenanceMessage>,
	env: Env,
	runtime?: RuntimeConfig,
) {
	switch (message.body.kind) {
		case "payment.rate_sync":
			await refreshRateCategoryIfDue(
				env.DB,
				message.body.category,
				fetch,
				Date.now(),
			);
			break;
		case "payment.rpc_health":
			await refreshPaymentConnectionHealthByIds(
				env.DB,
				message.body.connectionIds,
			);
			break;
		case "payment.event_source_reconcile":
			await reconcilePaymentEventSource(env.DB, message.body.sourceId, {
				runtime,
			});
			break;
	}
	message.ack();
}
