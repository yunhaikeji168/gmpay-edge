import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listApiKeys } from "#/features/api-keys/server/list";
import {
	createDatastoreCounters,
	instrumentD1,
} from "../helpers/datastore-counters";
import { applyMigrations } from "./migrations";

describe("API key pagination", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-api-key-pagination" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		await db.batch(
			Array.from({ length: 25 }, (_, index) =>
				db
					.prepare(
						`INSERT INTO api_keys
						 (id, name, pid, secret_encrypted, scopes, created_at, updated_at)
						 VALUES (?, ?, ?, 'encrypted', '["orders:read"]', ?, ?)`,
					)
					.bind(
						`key-${index.toString().padStart(2, "0")}`,
						index === 7 ? "Searchable production key" : `Key ${index}`,
						`pid-${index}`,
						index,
						index,
					),
			),
		);
	});

	afterAll(async () => miniflare.dispose());

	it("returns stable server pages and filtered totals", async () => {
		const first = await listApiKeys(db, {
			pageIndex: 0,
			pageSize: 10,
			search: "",
		});
		const second = await listApiKeys(db, {
			pageIndex: 1,
			pageSize: 10,
			search: "",
		});
		expect(first.total).toBe(25);
		expect(first.data).toHaveLength(10);
		expect(second.data).toHaveLength(10);
		expect(first.data.at(-1)?.id).not.toBe(second.data[0]?.id);
		expect(
			await listApiKeys(db, {
				pageIndex: 0,
				pageSize: 10,
				search: "production",
			}),
		).toMatchObject({ total: 1, data: [{ id: "key-07" }] });
	});

	it("keeps the exact total for an empty page in one D1 batch", async () => {
		const counters = createDatastoreCounters();
		const result = await listApiKeys(instrumentD1(db, counters), {
			pageIndex: 9,
			pageSize: 10,
			search: "",
		});

		expect(result).toMatchObject({ total: 25 });
		expect(result.data).toHaveLength(0);
		expect(counters.d1Prepare).toBe(2);
		expect(counters.d1Batch).toBe(1);
		expect(counters.d1StatementAll).toBe(0);
		expect(counters.d1StatementFirst).toBe(0);
	});

	it("uses the stable created-at index for the production page query", async () => {
		const plan = await db
			.prepare(
				`EXPLAIN QUERY PLAN SELECT k.id, k.name, k.pid, k.scopes,
				 k.last_used_at, k.expires_at, k.revoked_at, k.created_at
				 FROM api_keys k
				 ORDER BY created_at DESC, id DESC LIMIT 10 OFFSET 10`,
			)
			.all<{ detail: string }>();
		expect(plan.results.map((row) => row.detail).join(" ")).toContain(
			"api_keys_created_idx",
		);
		expect(plan.results.map((row) => row.detail).join(" ")).not.toContain(
			"USE TEMP B-TREE",
		);
	});

	it("rejects malformed persisted scopes instead of trusting a cast", async () => {
		await db
			.prepare("UPDATE api_keys SET scopes = ? WHERE id = 'key-07'")
			.bind('{"0":"orders:read"}')
			.run();
		try {
			await expect(
				listApiKeys(db, {
					pageIndex: 0,
					pageSize: 10,
					search: "production",
				}),
			).rejects.toThrow();
		} finally {
			await db
				.prepare("UPDATE api_keys SET scopes = ? WHERE id = 'key-07'")
				.bind('["orders:read"]')
				.run();
		}
	});
});
