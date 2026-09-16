import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	hasGrantedPermission,
	mergeRolePermissions,
} from "#/features/access/permissions";
import { systemPermission } from "#/features/access/system-rbac";
import { applyMigrations } from "./migrations";

describe("RBAC permission mask storage", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-rbac-storage" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
	});

	afterAll(async () => miniflare.dispose());

	it("stores one integer action mask for each role and module", async () => {
		const now = Date.now();
		await db.batch([
			db
				.prepare(
					"INSERT INTO roles (id, name, built_in, enabled, created_at, updated_at) VALUES ('operator-role', 'operator', 0, 1, ?, ?)",
				)
				.bind(now, now),
			db
				.prepare(
					"INSERT INTO role_permissions (id, role_id, module, permission_mask, created_at, updated_at) VALUES ('operator-orders', 'operator-role', 'orders', 5, ?, ?)",
				)
				.bind(now, now),
		]);
		const row = await db
			.prepare(
				"SELECT permission_mask, typeof(permission_mask) AS storage_type FROM role_permissions WHERE id = 'operator-orders'",
			)
			.first<{ permission_mask: number; storage_type: string }>();
		expect(row).toEqual({
			permission_mask: 5,
			storage_type: "integer",
		});

		const permissions = mergeRolePermissions([
			{ module: "orders", permissionMask: row?.permission_mask ?? 0 },
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
	});
});
