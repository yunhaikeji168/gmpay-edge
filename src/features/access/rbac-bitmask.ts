export const rbacActionBits = {
	read: 1,
	create: 2,
	update: 4,
	delete: 8,
	test: 16,
} as const;

export type RbacAction = keyof typeof rbacActionBits;
export const rbacActions = [
	"read",
	"create",
	"update",
	"delete",
	"test",
] as const;
export const RBAC_CUSTOM_ACTION_START = 32;
export const RBAC_REGISTERED_ACTION_MASK = rbacActions.reduce(
	(mask, action) => mask | rbacActionBits[action],
	0,
);

export function actionsToMask(actions: readonly string[]) {
	return actions.reduce((mask, action) => {
		return mask | (rbacActionBits[action as RbacAction] ?? 0);
	}, 0);
}

export function maskToActions(mask: number): RbacAction[] {
	return rbacActions.filter((action) => (mask & rbacActionBits[action]) !== 0);
}

export function normalizePermissionMask(mask: number) {
	return Number.isSafeInteger(mask) && mask >= 0
		? mask & RBAC_REGISTERED_ACTION_MASK
		: 0;
}

export function hasRbacAction(mask: number, action: RbacAction) {
	return (mask & rbacActionBits[action]) !== 0;
}
