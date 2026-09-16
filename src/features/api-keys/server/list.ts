import { parseApiScopes } from "#/features/api-keys/scopes";

export async function listApiKeys(
	db: D1Database,
	data: { pageIndex: number; pageSize: number; search: string },
) {
	const where = data.search ? "WHERE k.name LIKE ? OR k.pid LIKE ?" : "";
	const pattern = `%${data.search}%`;
	const bindings = data.search ? [pattern, pattern] : [];
	const [countResult, rowsResult] = await db.batch([
		db
			.prepare(`SELECT COUNT(*) AS count FROM api_keys k ${where}`)
			.bind(...bindings),
		db
			.prepare(
				`SELECT k.id, k.name, k.pid,
		 k.scopes, k.enabled, k.last_used_at, k.expires_at, k.revoked_at, k.created_at
				 FROM api_keys k
				 ${where}
			 ORDER BY k.created_at DESC, k.id DESC LIMIT ? OFFSET ?`,
			)
			.bind(...bindings, data.pageSize, data.pageIndex * data.pageSize),
	]);
	const count = countResult?.results?.[0] as { count: number } | undefined;
	const rows = rowsResult as D1Result<{
		id: string;
		name: string;
		pid: string;
		scopes: string;
		enabled: number;
		last_used_at: number | null;
		expires_at: number | null;
		revoked_at: number | null;
		created_at: number;
	}>;
	return {
		data: rows.results.map((row) => {
			const scopes = parseApiScopes(row.scopes);
			if (!scopes) throw new Error("Invalid API key scope data");
			return {
				id: row.id,
				name: row.name,
				pid: row.pid,
				scopes,
				enabled: row.enabled === 1,
				lastUsedAt: row.last_used_at
					? new Date(row.last_used_at).toISOString()
					: null,
				expiresAt: row.expires_at
					? new Date(row.expires_at).toISOString()
					: null,
				revokedAt: row.revoked_at
					? new Date(row.revoked_at).toISOString()
					: null,
				createdAt: new Date(row.created_at).toISOString(),
			};
		}),
		total: count?.count ?? 0,
	};
}
