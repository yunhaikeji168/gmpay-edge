import { bumpRoleUsersAccessRevisionStatement } from "#/features/access/server/access-revision";
import { DomainError } from "#/lib/domain-error";

export async function setCustomRoleEnabled(
	db: D1Database,
	id: string,
	enabled: boolean,
	audit?: D1PreparedStatement,
) {
	const role = await db
		.prepare("SELECT built_in, enabled FROM roles WHERE id = ? LIMIT 1")
		.bind(id)
		.first<{ built_in: number; enabled: number }>();
	if (!role) throw new DomainError("role_not_found", 404, "Role not found");
	if (role.built_in)
		throw new DomainError(
			"built_in_role",
			409,
			"Built-in roles cannot be disabled",
		);
	if (Boolean(role.enabled) === enabled) return { id, enabled };
	await db.batch([
		db
			.prepare(
				"UPDATE roles SET enabled = ?, updated_at = ? WHERE id = ? AND built_in = 0",
			)
			.bind(enabled ? 1 : 0, Date.now(), id),
		bumpRoleUsersAccessRevisionStatement(db, id),
		...(audit ? [audit] : []),
	]);
	return { id, enabled };
}
