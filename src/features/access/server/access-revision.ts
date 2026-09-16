export function bumpUserAccessRevisionStatement(
	db: D1Database,
	userId: string,
	now = Date.now(),
) {
	return db
		.prepare(`UPDATE users SET updated_at =
			CASE WHEN updated_at >= ? THEN updated_at + 1 ELSE ? END
			WHERE id = ?`)
		.bind(now, now, userId);
}

export function bumpRoleUsersAccessRevisionStatement(
	db: D1Database,
	roleId: string,
	now = Date.now(),
) {
	return db
		.prepare(`UPDATE users SET updated_at =
			CASE WHEN updated_at >= ? THEN updated_at + 1 ELSE ? END
			WHERE id IN (SELECT user_id FROM user_roles WHERE role_id = ?)`)
		.bind(now, now, roleId);
}
