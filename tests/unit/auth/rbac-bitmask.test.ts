import { describe, expect, it } from "vitest";
import {
	actionsToMask,
	hasRbacAction,
	maskToActions,
	RBAC_CUSTOM_ACTION_START,
} from "#/features/access/rbac-bitmask";
import { paymentSettingsPermission } from "#/features/access/system-rbac";

describe("RBAC bit masks", () => {
	it("maps payment settings actions to one permission module", () => {
		expect(paymentSettingsPermission("read")).toEqual({
			module: "payment_settings",
			permissionMask: 1,
		});
		expect(paymentSettingsPermission("update")).toEqual({
			module: "payment_settings",
			permissionMask: 4,
		});
		expect(paymentSettingsPermission("test")).toEqual({
			module: "payment_settings",
			permissionMask: 16,
		});
	});
	it("uses conventional view-first bits 1, 2, 4 and 8", () => {
		expect(actionsToMask(["create", "read", "update", "delete"])).toBe(15);
		expect(maskToActions(15)).toEqual(["read", "create", "update", "delete"]);
		expect(hasRbacAction(5, "read")).toBe(true);
		expect(hasRbacAction(6, "delete")).toBe(false);
		expect(actionsToMask(["test"])).toBe(16);
		expect(maskToActions(31)).toEqual([
			"read",
			"create",
			"update",
			"delete",
			"test",
		]);
		expect(RBAC_CUSTOM_ACTION_START).toBe(32);
	});

	it("does not grant permissions for unknown aggregate actions", () => {
		expect(actionsToMask(["write"])).toBe(0);
		expect(maskToActions(actionsToMask(["write"]))).toEqual([]);
	});
});
