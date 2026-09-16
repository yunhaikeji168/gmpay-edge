import {
	normalizePermissionMask,
	RBAC_REGISTERED_ACTION_MASK,
	type RbacAction,
	rbacActionBits,
	rbacActions,
} from "./rbac-bitmask";

export const systemRbacModuleIds = [
	"dashboard",
	"users",
	"api_keys",
	"webhooks",
	"orders",
	"payments",
	"payment_reviews",
	"receiving_methods",
	"payment_settings",
	"telegram",
	"operations",
	"settings",
	"audit",
	"roles",
] as const;

export type SystemRbacModule = (typeof systemRbacModuleIds)[number];
export type SystemPermission = Readonly<{
	module: SystemRbacModule;
	permissionMask: number;
}>;
export type SystemPermissionGrant = SystemPermission;

export const systemRbacModules = systemRbacModuleIds.map((id) => ({
	id,
	actions: rbacActions,
	permissionMask: RBAC_REGISTERED_ACTION_MASK,
}));

export const allSystemPermissionGrants: SystemPermissionGrant[] =
	systemRbacModuleIds.map((module) => ({
		module,
		permissionMask: RBAC_REGISTERED_ACTION_MASK,
	}));

export function systemPermission(
	module: SystemRbacModule,
	action: RbacAction,
): SystemPermission {
	return { module, permissionMask: rbacActionBits[action] };
}

export function paymentSettingsPermission(action: RbacAction) {
	return systemPermission("payment_settings", action);
}

export function normalizeSystemPermissionGrants(
	grants: readonly SystemPermissionGrant[],
) {
	const masks = new Map<SystemRbacModule, number>();
	for (const grant of grants) {
		if (!systemRbacModuleIds.includes(grant.module)) continue;
		const mask = normalizePermissionMask(grant.permissionMask);
		if (mask) masks.set(grant.module, (masks.get(grant.module) ?? 0) | mask);
	}
	return systemRbacModuleIds.flatMap((module) => {
		const permissionMask = masks.get(module);
		return permissionMask ? [{ module, permissionMask }] : [];
	});
}

export function hasSystemPermission(
	grants: readonly SystemPermissionGrant[],
	requirement: SystemPermission,
) {
	const granted = grants.find((grant) => grant.module === requirement.module);
	return (
		Boolean(granted) &&
		((granted?.permissionMask ?? 0) & requirement.permissionMask) ===
			requirement.permissionMask
	);
}
