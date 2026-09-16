import { DomainError } from "#/lib/domain-error";

export type PaymentEventSourceUpdateState = {
	externalSourceId: string;
	enabled: boolean;
	healthStatus: string;
	reconcileRequiredAt: number | null;
};

export function paymentEventSourceUpdatePolicy(
	current: PaymentEventSourceUpdateState,
	next: Pick<PaymentEventSourceUpdateState, "externalSourceId" | "enabled"> & {
		mode: "shadow" | "active";
		authTokenRotated: boolean;
	},
) {
	const externalSourceChanged =
		next.externalSourceId !== current.externalSourceId;
	if (
		externalSourceChanged &&
		(current.enabled ||
			current.healthStatus !== "healthy" ||
			current.reconcileRequiredAt !== null)
	)
		throw sourceNotReady(
			"Disable and reconcile the existing source before replacing it",
		);
	const requiresReconcile =
		externalSourceChanged ||
		next.authTokenRotated ||
		next.enabled !== current.enabled;
	if (
		next.mode === "active" &&
		next.enabled &&
		(requiresReconcile ||
			current.healthStatus !== "healthy" ||
			current.reconcileRequiredAt !== null)
	)
		throw sourceNotReady(
			"Payment event push must be healthy and reconciled before activation",
		);
	return { externalSourceChanged, requiresReconcile };
}

function sourceNotReady(message: string) {
	return new DomainError("payment_event_source_not_ready", 409, message);
}
