import { DomainError } from "#/lib/domain-error";

export async function setApiKeyEnabled(
	database: D1Database,
	input: {
		id: string;
		enabled: boolean;
		actorUserId: string;
		requestId?: string | null;
		ipAddress?: string | null;
		now?: number;
	},
) {
	const now = input.now ?? Date.now();
	const enabled = input.enabled ? 1 : 0;
	const [update] = await database.batch([
		database
			.prepare(
				`UPDATE api_keys
				 SET enabled = ?, updated_at = ?
				 WHERE id = ? AND revoked_at IS NULL AND enabled != ?`,
			)
			.bind(enabled, now, input.id, enabled),
		database
			.prepare(
				`INSERT INTO audit_logs
				 (id, actor_user_id, action, target_type, target_id, request_id,
				  ip_address, after, created_at)
				 SELECT ?, ?, ?, 'api_key', ?, ?, ?, ?, ?
				 WHERE changes() = 1`,
			)
			.bind(
				crypto.randomUUID(),
				input.actorUserId,
				input.enabled ? "api_key.enabled" : "api_key.disabled",
				input.id,
				input.requestId ?? null,
				input.ipAddress ?? null,
				JSON.stringify({ enabled: input.enabled }),
				now,
			),
	]);

	if ((update?.meta.changes ?? 0) === 1) {
		return { id: input.id, enabled: input.enabled };
	}

	const key = await database
		.prepare("SELECT enabled, revoked_at FROM api_keys WHERE id = ? LIMIT 1")
		.bind(input.id)
		.first<{ enabled: number; revoked_at: number | null }>();
	if (!key)
		throw new DomainError("api_key_not_found", 404, "API key not found");
	if (key.revoked_at)
		throw new DomainError("api_key_revoked", 409, "API key is revoked");
	return { id: input.id, enabled: key.enabled === 1 };
}
