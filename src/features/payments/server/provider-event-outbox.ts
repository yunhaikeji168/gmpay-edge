import type { PaymentProviderEventMessage } from "#/features/payments/types";

const queueBatchSize = 100;

export async function enqueueProviderEventIds(
	env: { DB: D1Database; PAYMENT_QUEUE?: Queue },
	eventIds: readonly string[],
	now = Date.now(),
) {
	if (!env.PAYMENT_QUEUE) return { queued: 0, failed: eventIds.length };
	let queued = 0;
	for (let offset = 0; offset < eventIds.length; offset += queueBatchSize) {
		const batch = eventIds.slice(offset, offset + queueBatchSize);
		try {
			await env.PAYMENT_QUEUE.sendBatch(
				batch.map((eventId) => ({
					body: {
						kind: "payment.provider_event",
						version: 1,
						eventId,
					} satisfies PaymentProviderEventMessage,
				})),
			);
			await env.DB.prepare(
				`UPDATE inbound_provider_events SET status = 'queued', queued_at = ?,
				 updated_at = ? WHERE id IN (SELECT value FROM json_each(?))
				 AND status IN ('received','failed')`,
			)
				.bind(now, now, JSON.stringify(batch))
				.run();
			queued += batch.length;
		} catch {
			return { queued, failed: eventIds.length - queued };
		}
	}
	return { queued, failed: 0 };
}

export async function recoverProviderEventOutbox(
	env: { DB: D1Database; PAYMENT_QUEUE?: Queue },
	now = Date.now(),
	limit = 100,
) {
	const batchLimit = Math.max(1, Math.min(limit, 100));
	const leaseRecovery = await env.DB.prepare(
		`UPDATE inbound_provider_events SET status = 'failed', lease_until = NULL, lease_token = NULL,
		 next_attempt_at = NULL,
		 last_error_code = COALESCE(last_error_code, 'processing_lease_expired'),
		 updated_at = ? WHERE id IN (
		  SELECT id FROM inbound_provider_events INDEXED BY inbound_provider_events_lease_idx
		  WHERE status = 'processing' AND lease_until <= ?
		  ORDER BY lease_until, id LIMIT ?
		 )`,
	)
		.bind(now, now, batchLimit)
		.run();
	const rows = await env.DB.prepare(
		`SELECT id, received_at FROM inbound_provider_events
		 INDEXED BY inbound_provider_events_outbox_idx
		 WHERE status IN ('received','failed')
		 AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
		 ORDER BY status, next_attempt_at, received_at, id LIMIT ?`,
	)
		.bind(now, batchLimit)
		.all<{ id: string; received_at: number }>();
	const result = await enqueueProviderEventIds(
		env,
		rows.results.map((row) => row.id),
		now,
	);
	if (rows.results.length || (leaseRecovery.meta.changes ?? 0) > 0)
		console.info(
			JSON.stringify({
				event: "payment_provider_outbox_recovered",
				selectedEvents: rows.results.length,
				recoveredLeases: leaseRecovery.meta.changes ?? 0,
				queuedEvents: result.queued,
				queueFailedEvents: result.failed,
				oldestEventAgeMs: rows.results.length
					? Math.max(
							0,
							now - Math.min(...rows.results.map((row) => row.received_at)),
						)
					: 0,
				outcome: result.failed ? "partial_failure" : "ok",
			}),
		);
	return result;
}
