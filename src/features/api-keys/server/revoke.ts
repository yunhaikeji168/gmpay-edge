import { DomainError } from "#/lib/domain-error";

export async function revokeApiKeyCredential(
	database: D1Database,
	input: {
		id: string;
		actorUserId: string;
		requestId?: string | null;
		ipAddress?: string | null;
		now?: number;
	},
) {
	const now = input.now ?? Date.now();
	const auditId = crypto.randomUUID();
	const [update] = await database.batch([
		database
			.prepare(
				`UPDATE api_keys
				 SET revoked_at = ?, updated_at = ?
				 WHERE id = ? AND revoked_at IS NULL`,
			)
			.bind(now, now, input.id),
		database
			.prepare(
				`INSERT INTO audit_logs
				 (id, actor_user_id, action, target_type, target_id, request_id,
				  ip_address, after, created_at)
					 SELECT ?, ?, 'api_key.revoked', 'api_key', ?, ?, ?, ?, ?
				 WHERE changes() = 1 AND EXISTS (
				  SELECT 1 FROM api_keys WHERE id = ? AND revoked_at = ?
				 )`,
			)
			.bind(
				auditId,
				input.actorUserId,
				input.id,
				input.requestId ?? null,
				input.ipAddress ?? null,
				JSON.stringify({ revokedAt: new Date(now).toISOString() }),
				now,
				input.id,
				now,
			),
	]);
	if ((update?.meta.changes ?? 0) !== 1) {
		const key = await database
			.prepare("SELECT revoked_at FROM api_keys WHERE id = ? LIMIT 1")
			.bind(input.id)
			.first<{ revoked_at: number | null }>();
		if (!key)
			throw new DomainError("api_key_not_found", 404, "API key not found");
		throw new DomainError("api_key_revoked", 409, "API key is revoked");
	}
	return { id: input.id, revokedAt: new Date(now).toISOString() };
}
