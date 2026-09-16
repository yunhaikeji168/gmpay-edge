export async function claimFixedWindowRateLimit(
	db: D1Database,
	input: {
		bucketKey: string;
		limit: number;
		windowMs: number;
		now?: number;
	},
) {
	const now = input.now ?? Date.now();
	const windowStart = Math.floor(now / input.windowMs) * input.windowMs;
	const row = await db
		.prepare(
			`INSERT INTO rate_limit_counters
			 (id, bucket_key, window_start, count, expires_at, created_at, updated_at)
			 VALUES (?, ?, ?, 1, ?, ?, ?)
			 ON CONFLICT(bucket_key, window_start) DO UPDATE SET
			 count = rate_limit_counters.count + 1, updated_at = excluded.updated_at
			 WHERE rate_limit_counters.count < ?
			 RETURNING count`,
		)
		.bind(
			crypto.randomUUID(),
			input.bucketKey,
			windowStart,
			windowStart + input.windowMs * 2,
			now,
			now,
			input.limit,
		)
		.first<{ count: number }>();
	return {
		allowed: Boolean(row),
		count: row?.count ?? input.limit,
		windowStart,
	};
}
