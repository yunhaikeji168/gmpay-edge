import { drizzle } from "drizzle-orm/d1";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "#/db/schema";
import { listUsers } from "#/features/users/server/users";
import {
	createDatastoreCounters,
	instrumentD1,
} from "../helpers/datastore-counters";
import { applyMigrations } from "./migrations";

describe("admin users pagination", () => {
	let miniflare: Miniflare;
	let database: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-users-pagination" },
		});
		database = await miniflare.getD1Database("DB");
		await applyMigrations(database);
		await database.batch([
			database
				.prepare(
					"INSERT INTO users (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
				)
				.bind("user-1", "Alice", "alice@example.com", 1, 1),
			database
				.prepare(
					"INSERT INTO users (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
				)
				.bind("user-2", "Bob", "bob@example.com", 2, 2),
			database
				.prepare(
					"INSERT INTO users (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
				)
				.bind("user-3", "Carol", "carol@example.com", 3, 3),
			database
				.prepare(
					"INSERT INTO roles (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
				)
				.bind("role-admin", "admin", 1, 1),
			database
				.prepare(
					"INSERT INTO roles (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
				)
				.bind("role-operator", "operator", 1, 1),
			database
				.prepare(
					"INSERT INTO user_roles (id, user_id, role_id, created_at) VALUES (?, ?, ?, ?)",
				)
				.bind("user-role-1", "user-3", "role-operator", 1),
			database
				.prepare(
					"INSERT INTO user_roles (id, user_id, role_id, created_at) VALUES (?, ?, ?, ?)",
				)
				.bind("user-role-2", "user-3", "role-admin", 1),
		]);
	});

	afterAll(async () => miniflare.dispose());

	it("returns the page, exact total, and roles in one D1 batch", async () => {
		const counters = createDatastoreCounters();
		const db = drizzle(instrumentD1(database, counters), { schema });
		const result = await listUsers(db, { pageIndex: 0, pageSize: 2 });

		expect(result.total).toBe(3);
		expect(result.data.map((user) => user.id)).toEqual(["user-3", "user-2"]);
		expect(result.data[0]?.roles).toEqual(["admin", "operator"]);
		expect(counters.d1Prepare).toBe(2);
		expect(counters.d1Batch).toBe(1);
		expect(counters.d1StatementAll).toBe(0);
		expect(counters.d1StatementFirst).toBe(0);
	});

	it("keeps the exact total for an empty page without another round trip", async () => {
		const counters = createDatastoreCounters();
		const db = drizzle(instrumentD1(database, counters), { schema });
		const result = await listUsers(db, { pageIndex: 9, pageSize: 2 });

		expect(result).toEqual({ data: [], total: 3 });
		expect(counters.d1Prepare).toBe(2);
		expect(counters.d1Batch).toBe(1);
		expect(counters.d1StatementAll).toBe(0);
		expect(counters.d1StatementFirst).toBe(0);
	});

	it("applies search to the exact count", async () => {
		const db = drizzle(database, { schema });
		const result = await listUsers(db, {
			pageIndex: 0,
			pageSize: 10,
			search: "alice",
		});

		expect(result.total).toBe(1);
		expect(result.data.map((user) => user.email)).toEqual([
			"alice@example.com",
		]);
	});

	it("uses the created-at index for the production page order", async () => {
		const plan = await database
			.prepare(`EXPLAIN QUERY PLAN WITH page AS (
			 SELECT u.id, u.name, u.email, u.enabled, u.email_verified,
			  u.created_at, u.updated_at
			 FROM users u ORDER BY u.created_at DESC, u.id DESC LIMIT 10 OFFSET 0
			)
			SELECT page.* FROM page ORDER BY page.created_at DESC, page.id DESC`)
			.all<{ detail: string }>();
		const details = plan.results.map((row) => row.detail).join("\n");

		expect(details).toContain("SCAN u USING INDEX users_created_idx");
		expect(details).not.toContain("USE TEMP B-TREE FOR ORDER BY");
	});
});
