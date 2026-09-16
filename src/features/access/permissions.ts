import { normalizePermissionMask } from "#/features/access/rbac-bitmask";

export type PermissionRow = { module: string; permissionMask: number };

export function mergeRolePermissions(rows: readonly PermissionRow[]) {
	const permissions = new Map<string, number>();
	for (const row of rows) {
		permissions.set(
			row.module,
			(permissions.get(row.module) ?? 0) |
				normalizePermissionMask(row.permissionMask),
		);
	}
	return permissions;
}

export function hasGrantedPermission(
	root: boolean,
	permissions: ReadonlyMap<string, number>,
	requirement: PermissionRow,
) {
	if (root) return true;
	const mask = permissions.get(requirement.module) ?? 0;
	return (mask & requirement.permissionMask) === requirement.permissionMask;
}
