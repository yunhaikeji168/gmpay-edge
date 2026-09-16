import { sha256Hex } from "#/lib/crypto";
import { claimFixedWindowRateLimit } from "#/server/rate-limit";

type CheckoutRateLimitAction = "option" | "review" | "transaction";

const policies = {
	option: { limit: 10, windowMs: 60_000 },
	review: { limit: 3, windowMs: 3_600_000 },
	transaction: { limit: 5, windowMs: 60_000 },
} as const satisfies Record<
	CheckoutRateLimitAction,
	{ limit: number; windowMs: number }
>;

export async function claimCheckoutRateLimit(
	db: D1Database,
	input: {
		action: CheckoutRateLimitAction;
		orderId: string;
		clientAddress: string;
		now?: number;
	},
) {
	const policy = policies[input.action];
	const now = input.now ?? Date.now();
	const bucketHash = await sha256Hex(
		`checkout:${input.action}\0${input.orderId}\0${input.clientAddress}`,
	);
	return claimFixedWindowRateLimit(db, {
		bucketKey: bucketHash,
		limit: policy.limit,
		windowMs: policy.windowMs,
		now,
	});
}
