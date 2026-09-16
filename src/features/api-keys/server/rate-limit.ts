import { claimFixedWindowRateLimit } from "#/server/rate-limit";

export async function claimApiRateLimit(
	db: D1Database,
	input: {
		apiKeyId: string;
		limit: number;
		now?: number;
		windowMs?: number;
	},
) {
	const now = input.now ?? Date.now();
	const windowMs = input.windowMs ?? 60_000;
	return claimFixedWindowRateLimit(db, {
		bucketKey: `api-key:${input.apiKeyId}`,
		limit: input.limit,
		windowMs,
		now,
	});
}
