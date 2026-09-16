import type { WebhookQueueMessage } from "#/features/webhooks/types";
import { DomainError } from "#/lib/domain-error";

type QueuedDelivery = {
	id: string;
	event_id: string;
	status: "queued" | "failed";
	attempt_count: number;
	created_at: number;
};

export class WebhookOutboxRecoveryError extends DomainError {
	constructor(readonly result: { queued: number; failed: number }) {
		super(
			"queue_enqueue_failed",
			502,
			"Webhook Queue rejected one or more outbox messages",
		);
		this.name = "WebhookOutboxRecoveryError";
	}
}

export function assertWebhookOutboxRecovered(result: {
	queued: number;
	failed: number;
}) {
	if (result.failed > 0) throw new WebhookOutboxRecoveryError(result);
}

export async function recoverWebhookOutbox(
	env: Pick<Env, "DB" | "WEBHOOK_QUEUE">,
	now = Date.now(),
	limit = 100,
) {
	const rows = await env.DB.prepare(
		`SELECT id, event_id, status, attempt_count, created_at FROM webhook_deliveries
		 WHERE status IN ('queued', 'failed')
		 AND ((status = 'queued' AND attempt_count = 0)
		  OR (status = 'failed' AND attempt_count > 0))
		 AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
		 ORDER BY created_at ASC, id ASC LIMIT ?`,
	)
		.bind(now, limit)
		.all<QueuedDelivery>();
	let queued = 0;
	let failed = 0;
	const leaseUntil = now + 5 * 60_000;
	for (const row of rows.results) {
		const message: WebhookQueueMessage = {
			kind: "webhook.delivery",
			version: 1,
			deliveryId: row.id,
			eventId: row.event_id,
			attempt: row.status === "failed" ? row.attempt_count + 1 : 1,
		};
		try {
			const claimed = await env.DB.prepare(
				`UPDATE webhook_deliveries SET next_attempt_at = ?, updated_at = ?
				 WHERE id = ? AND status = ? AND attempt_count = ?
				 AND (next_attempt_at IS NULL OR next_attempt_at <= ?)`,
			)
				.bind(leaseUntil, now, row.id, row.status, row.attempt_count, now)
				.run();
			if ((claimed.meta.changes ?? 0) !== 1) continue;
			await env.WEBHOOK_QUEUE.send(message);
			await env.DB.prepare(
				`UPDATE webhook_deliveries SET next_attempt_at = ?, updated_at = ?
				 WHERE id = ? AND status = ? AND attempt_count = ?`,
			)
				.bind(now + 5 * 60_000, now, row.id, row.status, row.attempt_count)
				.run();
			queued += 1;
		} catch {
			await env.DB.prepare(
				`UPDATE webhook_deliveries SET next_attempt_at = ?, updated_at = ?
				 WHERE id = ? AND status = ? AND attempt_count = ?`,
			)
				.bind(now, now, row.id, row.status, row.attempt_count)
				.run();
			failed += 1;
		}
	}
	if (rows.results.length)
		console.info(
			JSON.stringify({
				event: "webhook_outbox_recovered",
				selectedDeliveries: rows.results.length,
				queuedDeliveries: queued,
				queueFailedDeliveries: failed,
				maxApplicationAttempt: Math.max(
					0,
					...rows.results.map((row) => row.attempt_count),
				),
				oldestDeliveryAgeMs: Math.max(
					0,
					now - Math.min(...rows.results.map((row) => row.created_at)),
				),
				outcome: failed ? "partial_failure" : "ok",
			}),
		);
	return { queued, failed };
}
