import { DomainError } from "#/lib/domain-error";
import { encryptSecret, generateApiSecret } from "#/lib/secrets";

export async function rotateApiKeyCredential(
	db: D1Database,
	input: { id: string; pepper: string; now?: number },
) {
	const secret = generateApiSecret();
	const now = input.now ?? Date.now();
	const result = await db
		.prepare(`UPDATE api_keys
			SET secret_encrypted = ?, updated_at = ?
			WHERE id = ? AND revoked_at IS NULL
			RETURNING pid`)
		.bind(await encryptSecret(secret, input.pepper), now, input.id)
		.first<{ pid: string }>();
	if (!result) {
		const key = await db
			.prepare("SELECT revoked_at FROM api_keys WHERE id = ? LIMIT 1")
			.bind(input.id)
			.first<{ revoked_at: number | null }>();
		if (!key)
			throw new DomainError("api_key_not_found", 404, "API key not found");
		throw new DomainError("api_key_revoked", 409, "API key is revoked");
	}
	return { id: input.id, pid: result.pid, secret, rotatedAt: now };
}
