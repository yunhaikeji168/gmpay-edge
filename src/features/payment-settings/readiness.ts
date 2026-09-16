export type ReceivingMethodAvailabilityStatus =
	| "ready"
	| "disabled"
	| "missing_connection"
	| "missing_target"
	| "unhealthy"
	| "unsupported";

export type ReceivingMethodReadinessReasonCode =
	| "METHOD_NOT_FOUND"
	| "METHOD_DISABLED"
	| "UNSUPPORTED_RAIL"
	| "INVALID_ASSET"
	| "MISSING_CONNECTION"
	| "MISSING_TARGET"
	| "INVALID_TARGET"
	| "UNHEALTHY_CONNECTION";

export type ReceivingMethodReadinessReason = {
	code: ReceivingMethodReadinessReasonCode;
	message: string;
};

export type ReceivingMethodReadiness = {
	receivingMethodId: string;
	ready: boolean;
	status: ReceivingMethodAvailabilityStatus;
	reasons: ReceivingMethodReadinessReason[];
	checkedAt: number;
};

export class ReceivingMethodNotReadyError extends Error {
	readonly code = "RECEIVING_METHOD_NOT_READY";

	constructor(readonly readiness: ReceivingMethodReadiness) {
		super("Receiving method is not ready");
		this.name = "ReceivingMethodNotReadyError";
	}
}
