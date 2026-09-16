import type { OrderStatus } from "#/features/orders/schema";
import { assertTransition } from "#/features/orders/state-machine";

export type CancellableOrder = {
	status: OrderStatus;
	version: number;
};

export type CancellationAudit = {
	requestId: string | null;
	ipAddress: string | null;
} & (
	| { action: "order.cancelled_by_api"; apiKeyId: string }
	| { action: "order.cancelled_by_admin"; actorUserId: string }
);

export async function cancelOrderAtomically(
	db: D1Database,
	orderId: string,
	order: CancellableOrder,
	now = Date.now(),
	audit?: CancellationAudit,
	outboxStatements: D1PreparedStatement[] = [],
) {
	assertTransition(order.status, "cancelled", "merchant_cancelled");
	try {
		const results = await db.batch([
			db
				.prepare(
					"UPDATE orders SET status = 'cancelled', version = version + 1, updated_at = ? WHERE id = ? AND version = ? AND status = ?",
				)
				.bind(now, orderId, order.version, order.status),
			...(outboxStatements.length
				? [
						db.prepare(
							"SELECT CASE WHEN changes() = 1 THEN 1 ELSE json_extract('order cancellation conflict', '$') END",
						),
					]
				: []),
			db
				.prepare(
					`UPDATE receiving_method_locks SET released_at = ?
				 WHERE order_id = ? AND released_at IS NULL
				 AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = 'cancelled' AND version = ?)`,
				)
				.bind(now, orderId, orderId, order.version + 1),
			...(audit
				? [
						db
							.prepare(
								`INSERT INTO audit_logs
							 (id, actor_user_id, action, target_type, target_id, request_id, ip_address, before, after, created_at)
							 SELECT ?, ?, ?, 'order', ?, ?, ?, ?, ?, ?
							 WHERE EXISTS (
								 SELECT 1 FROM orders
								 WHERE id = ? AND status = 'cancelled' AND version = ?
							 )`,
							)
							.bind(
								crypto.randomUUID(),
								audit.action === "order.cancelled_by_admin"
									? audit.actorUserId
									: null,
								audit.action,
								orderId,
								audit.requestId,
								audit.ipAddress,
								JSON.stringify({ status: order.status }),
								JSON.stringify({
									status: "cancelled",
									...(audit.action === "order.cancelled_by_api"
										? { apiKeyId: audit.apiKeyId }
										: {}),
								}),
								now,
								orderId,
								order.version + 1,
							),
					]
				: []),
			...outboxStatements,
		]);
		return (results[0]?.meta.changes ?? 0) === 1;
	} catch (error) {
		const current = await db
			.prepare("SELECT status, version FROM orders WHERE id = ?")
			.bind(orderId)
			.first<CancellableOrder>();
		if (current?.status !== order.status || current.version !== order.version)
			return false;
		throw error;
	}
}
