import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setCustomRoleEnabled } from "#/features/access/server/role-enabled";
import { createAuditStatement } from "#/server/audit";
import { applyMigrations } from "../integration/migrations";

describe("dynamic role enablement", () => {
	let miniflare: Miniflare;
	let database: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-role-enablement" },
		});
		database = await miniflare.getD1Database("DB");
		await applyMigrations(database);
		const now = Date.now();
		await database.batch([
			database
				.prepare(
					"INSERT INTO users (id, name, email, email_verified, enabled, two_factor_enabled, created_at, updated_at) VALUES ('actor', 'Actor', 'actor@example.com', 1, 1, 0, ?, ?)",
				)
				.bind(now, now),
			database
				.prepare(
					"INSERT INTO users (id, name, email, email_verified, enabled, two_factor_enabled, created_at, updated_at) VALUES ('member', 'Member', 'member@example.com', 1, 1, 0, ?, ?)",
				)
				.bind(now, now),
			database
				.prepare(
					"INSERT INTO roles (id, name, description, built_in, enabled, created_at, updated_at) VALUES ('root-role', 'root', 'Root', 1, 1, ?, ?), ('custom-role', 'operator', 'Operator', 0, 1, ?, ?)",
				)
				.bind(now, now, now, now),
			database
				.prepare(
					"INSERT INTO role_permissions (id, role_id, module, permission_mask, created_at, updated_at) VALUES ('operator-dashboard', 'custom-role', 'dashboard', 1, ?, ?)",
				)
				.bind(now, now),
			database
				.prepare(
					"INSERT INTO user_roles (id, user_id, role_id, created_at) VALUES ('member-operator', 'member', 'custom-role', ?)",
				)
				.bind(now),
		]);
	});

	afterAll(async () => miniflare.dispose());

	it("atomically disables a custom role and records the actor", async () => {
		const before = await database
			.prepare("SELECT updated_at FROM users WHERE id = 'member'")
			.first<{ updated_at: number }>();
		const request = new Request("https://pay.example/admin/access", {
			headers: { "x-request-id": "role-toggle-request" },
		});
		await expect(
			setCustomRoleEnabled(
				database,
				"custom-role",
				false,
				createAuditStatement(database, request, "actor", {
					action: "role.enabled_changed",
					targetType: "role",
					targetId: "custom-role",
					after: { enabled: false },
				}),
			),
		).resolves.toEqual({ id: "custom-role", enabled: false });
		const state = await database
			.prepare(
				`SELECT r.enabled,
				 (SELECT COUNT(*) FROM audit_logs WHERE action = 'role.enabled_changed' AND actor_user_id = 'actor' AND target_id = 'custom-role') AS audits,
				 (SELECT COUNT(*) FROM role_permissions rp JOIN user_roles ur ON ur.role_id = rp.role_id JOIN roles effective ON effective.id = ur.role_id WHERE ur.user_id = 'member' AND effective.enabled = 1) AS effective_permissions,
				 (SELECT updated_at FROM users WHERE id = 'member') AS member_revision
				 FROM roles r WHERE r.id = 'custom-role'`,
			)
			.first<{
				enabled: number;
				audits: number;
				effective_permissions: number;
				member_revision: number;
			}>();
		expect(state).toMatchObject({
			enabled: 0,
			audits: 1,
			effective_permissions: 0,
		});
		expect(state?.member_revision).toBeGreaterThan(before?.updated_at ?? 0);
	});

	it("never allows the built-in root role to be disabled", async () => {
		await expect(
			setCustomRoleEnabled(database, "root-role", false),
		).rejects.toThrow("Built-in roles cannot be disabled");
		const root = await database
			.prepare("SELECT enabled FROM roles WHERE id = 'root-role'")
			.first<{ enabled: number }>();
		expect(root?.enabled).toBe(1);
	});
});
