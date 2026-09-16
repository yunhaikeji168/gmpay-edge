import { DomainError } from "#/lib/domain-error";

export function requireRetryableWebhookDelivery<T extends { status: string }>(
	delivery: T | null,
): asserts delivery is T & { status: "failed" | "dead" } {
	if (!delivery)
		throw new DomainError(
			"webhook_delivery_not_found",
			404,
			"Webhook delivery not found",
		);
	if (delivery.status !== "failed" && delivery.status !== "dead")
		throw new DomainError(
			"webhook_delivery_not_retryable",
			409,
			"Webhook delivery cannot be retried",
		);
}

export async function claimManualWebhookRetry(
	db: D1Database,
	deliveryId: string,
	claimToken: number,
	now = Date.now(),
) {
	const result = await db
		.prepare(
			`UPDATE webhook_deliveries
			 SET status = 'queued', attempt_count = ?, next_attempt_at = NULL,
			 completed_at = NULL, updated_at = ?
			 WHERE id = ? AND status IN ('failed', 'dead')`,
		)
		.bind(claimToken, now, deliveryId)
		.run();
	return (result.meta.changes ?? 0) === 1;
}

export async function completeManualWebhookRetry(
	db: D1Database,
	deliveryId: string,
	claimToken: number,
) {
	await db
		.prepare(
			"UPDATE webhook_deliveries SET attempt_count = 0 WHERE id = ? AND status = 'queued' AND attempt_count = ?",
		)
		.bind(deliveryId, claimToken)
		.run();
}

export async function releaseManualWebhookRetry(
	db: D1Database,
	deliveryId: string,
	claimToken: number,
	previous: { status: "failed" | "dead"; attemptCount: number },
) {
	await db
		.prepare(
			`UPDATE webhook_deliveries SET status = ?, attempt_count = ?, updated_at = ?
			 WHERE id = ? AND status = 'queued' AND attempt_count = ?`,
		)
		.bind(
			previous.status,
			previous.attemptCount,
			Date.now(),
			deliveryId,
			claimToken,
		)
		.run();
}
