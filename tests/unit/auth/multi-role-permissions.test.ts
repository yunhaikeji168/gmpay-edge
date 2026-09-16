import { describe, expect, it } from "vitest";

import {
	hasGrantedPermission,
	mergeRolePermissions,
} from "#/features/access/permissions";
import {
	allSystemPermissionGrants,
	normalizeSystemPermissionGrants,
	systemPermission,
	systemRbacModuleIds,
	systemRbacModules,
} from "#/features/access/system-rbac";

describe("multi-role permissions", () => {
	it("unions permission masks from every assigned role", () => {
		const permissions = mergeRolePermissions([
			{ module: "orders", permissionMask: 1 },
			{ module: "orders", permissionMask: 4 },
			{ module: "webhooks", permissionMask: 2 },
		]);

		expect(
			hasGrantedPermission(
				false,
				permissions,
				systemPermission("orders", "read"),
			),
		).toBe(true);
		expect(
			hasGrantedPermission(
				false,
				permissions,
				systemPermission("orders", "update"),
			),
		).toBe(true);
		expect(
			hasGrantedPermission(
				false,
				permissions,
				systemPermission("orders", "delete"),
			),
		).toBe(false);
		expect(
			hasGrantedPermission(
				false,
				permissions,
				systemPermission("webhooks", "create"),
			),
		).toBe(true);
	});

	it("fails closed for invalid and unknown stored bits", () => {
		const permissions = mergeRolePermissions([
			{ module: "orders", permissionMask: -1 },
			{ module: "settings", permissionMask: 65 },
		]);
		expect(
			hasGrantedPermission(
				false,
				permissions,
				systemPermission("orders", "read"),
			),
		).toBe(false);
		expect(
			hasGrantedPermission(
				false,
				permissions,
				systemPermission("settings", "read"),
			),
		).toBe(true);
		expect(
			hasGrantedPermission(
				false,
				permissions,
				systemPermission("settings", "update"),
			),
		).toBe(false);
	});

	it("grants every permission to root independently of stored masks", () => {
		expect(
			hasGrantedPermission(
				true,
				new Map(),
				systemPermission("settings", "delete"),
			),
		).toBe(true);
	});

	it("derives one complete standard permission set from the module registry", () => {
		expect(systemRbacModules.map(({ id }) => id)).toEqual(systemRbacModuleIds);
		expect(allSystemPermissionGrants).toHaveLength(systemRbacModuleIds.length);
		expect(allSystemPermissionGrants.map(({ module }) => module)).toEqual(
			systemRbacModuleIds,
		);
		expect(
			new Set(
				allSystemPermissionGrants.map(({ permissionMask }) => permissionMask),
			),
		).toEqual(new Set([31]));
	});

	it("deduplicates and canonically orders role permissions before storage", () => {
		expect(
			normalizeSystemPermissionGrants([
				systemPermission("orders", "update"),
				systemPermission("dashboard", "read"),
				systemPermission("orders", "update"),
				systemPermission("orders", "read"),
			]),
		).toEqual([
			{ module: "dashboard", permissionMask: 1 },
			{ module: "orders", permissionMask: 5 },
		]);
	});
});
