import { z } from "zod";
import { submitCheckoutTransaction } from "#/features/checkout/server/submit-transaction";
import type { PaymentRuntime } from "#/features/payments/server/payment-events";
import { DomainError } from "#/lib/domain-error";

export const resolvePaymentReviewSchema = z.object({
	reviewId: z.uuid(),
	decision: z.enum(["approve", "reject"]),
	transactionHash: z.string().trim().min(8).max(256).optional(),
	note: z.string().trim().min(3).max(1_000),
});

export async function resolvePaymentReview(
	env: PaymentRuntime,
	input: z.infer<typeof resolvePaymentReviewSchema>,
	context: {
		reviewerUserId: string;
		requestId?: string | null;
		ipAddress?: string | null;
		adapterFactory?: Parameters<typeof submitCheckoutTransaction>[2];
	},
) {
	const data = resolvePaymentReviewSchema.parse(input);
	const review = await env.DB.prepare(
		"SELECT order_id, status, transaction_hash FROM payment_reviews WHERE id = ? LIMIT 1",
	)
		.bind(data.reviewId)
		.first<{
			order_id: string;
			status: string;
			transaction_hash: string | null;
		}>();
	if (!review)
		throw new DomainError(
			"payment_review_not_found",
			404,
			"Payment review not found",
		);
	if (review.status !== "pending")
		throw new DomainError(
			"payment_review_already_resolved",
			409,
			"Payment review is already resolved",
		);

	const transactionHash = data.transactionHash ?? review.transaction_hash;
	if (data.decision === "approve") {
		if (!transactionHash)
			throw new DomainError(
				"payment_review_transaction_required",
				422,
				"A transaction hash is required",
			);
		try {
			const verified = await submitCheckoutTransaction(
				env,
				{ orderId: review.order_id, transactionHash },
				context.adapterFactory,
				true,
				{
					reviewId: data.reviewId,
					transactionHash,
					reviewerUserId: context.reviewerUserId,
					note: data.note,
					requestId: context.requestId ?? null,
					ipAddress: context.ipAddress ?? null,
				},
			);
			if (verified.status !== "accepted")
				throw verificationError(verified.status);
			return { status: "approved", orderStatus: verified.orderStatus };
		} catch (error) {
			return rethrowResolutionError(env.DB, data.reviewId, error);
		}
	}

	const now = Date.now();
	await env.DB.batch([
		env.DB.prepare(
			`UPDATE payment_reviews SET status = 'rejected', transaction_hash = ?, reviewer_user_id = ?,
				 resolution_note = ?, reviewed_at = ?, updated_at = ?
				 WHERE id = ? AND status = 'pending'`,
		).bind(
			transactionHash ?? null,
			context.reviewerUserId,
			data.note,
			now,
			now,
			data.reviewId,
		),
		env.DB.prepare(
			"SELECT CASE WHEN changes() = 1 THEN 1 ELSE json_extract('payment review conflict', '$') END",
		),
		env.DB.prepare(
			`INSERT INTO audit_logs
				 (id, actor_user_id, action, target_type, target_id, request_id, ip_address, after, created_at)
				 VALUES (?, ?, 'payment_review.rejected', 'payment_review', ?, ?, ?, ?, ?)`,
		).bind(
			crypto.randomUUID(),
			context.reviewerUserId,
			data.reviewId,
			context.requestId ?? null,
			context.ipAddress ?? null,
			JSON.stringify({ orderId: review.order_id, orderStatus: null }),
			now,
		),
	]).catch((error: unknown) =>
		rethrowResolutionError(env.DB, data.reviewId, error),
	);
	return { status: "rejected", orderStatus: null };
}

async function rethrowResolutionError(
	db: D1Database,
	reviewId: string,
	error: unknown,
): Promise<never> {
	const current = await db
		.prepare("SELECT status FROM payment_reviews WHERE id = ?")
		.bind(reviewId)
		.first<{ status: string }>();
	if (current?.status !== "pending")
		throw new DomainError(
			"payment_review_resolution_conflict",
			409,
			"Payment review was resolved concurrently",
		);
	throw error;
}

function verificationError(
	status: "not_found" | "mismatch" | "unavailable",
): DomainError {
	switch (status) {
		case "not_found":
			return new DomainError(
				"payment_review_transaction_not_found",
				409,
				"Transaction not found",
			);
		case "mismatch":
			return new DomainError(
				"payment_review_transaction_mismatch",
				409,
				"Transaction does not match the order",
			);
		case "unavailable":
			return new DomainError(
				"payment_review_transaction_unavailable",
				503,
				"Transaction verification is unavailable",
			);
	}
	const unhandled: never = status;
	return unhandled;
}
