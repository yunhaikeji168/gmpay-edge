export type PaymentReviewApproval = {
	reviewId: string;
	transactionHash: string;
	reviewerUserId: string;
	note: string;
	requestId?: string | null;
	ipAddress?: string | null;
};

/** Appended to the accounting batch: a lost decision rolls back every payment write. */
export function paymentReviewApprovalStatements(
	db: D1Database,
	orderId: string,
	approval: PaymentReviewApproval,
	now = Date.now(),
) {
	return [
		db
			.prepare(`UPDATE payment_reviews SET status = 'approved', transaction_hash = ?,
		 reviewer_user_id = ?, resolution_note = ?, reviewed_at = ?, updated_at = ?
		 WHERE id = ? AND order_id = ? AND status = 'pending'`)
			.bind(
				approval.transactionHash,
				approval.reviewerUserId,
				approval.note,
				now,
				now,
				approval.reviewId,
				orderId,
			),
		db.prepare(
			"SELECT CASE WHEN changes() = 1 THEN 1 ELSE json_extract('payment review conflict', '$') END",
		),
		db
			.prepare(`INSERT INTO audit_logs (id, actor_user_id, action, target_type, target_id, request_id, ip_address, after, created_at)
		 SELECT ?, ?, 'payment_review.approved', 'payment_review', ?, ?, ?,
		 json_object('orderId', id, 'orderStatus', status), ? FROM orders WHERE id = ?`)
			.bind(
				crypto.randomUUID(),
				approval.reviewerUserId,
				approval.reviewId,
				approval.requestId ?? null,
				approval.ipAddress ?? null,
				now,
				orderId,
			),
	];
}
