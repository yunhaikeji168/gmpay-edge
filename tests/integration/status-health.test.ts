import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	checkHealth,
	getHealthSnapshot,
	handleLivenessRequest,
	healthSnapshotTtlMs,
} from "#/features/status/server/health";
import { applySecurityHeaders } from "#/server/http-security";
import { validateRequestAuthority } from "#/server/middleware/authority";
import { updateConnectionHealth } from "#/server/queue/payment-scan";
import {
	createDatastoreCounters,
	instrumentD1,
	instrumentKv,
} from "../helpers/datastore-counters";
import { applyMigrations } from "./migrations";

describe("public health receiving-method readiness", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-status-health" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		const now = Date.now();
		await db.batch([
			db
				.prepare(
					"INSERT OR IGNORE INTO payment_rails (code, name, kind, adapter, created_at, updated_at) VALUES ('okpay', 'OKPay', 'wallet', 'okpay', ?, ?)",
				)
				.bind(now, now),
			db
				.prepare(
					"INSERT OR IGNORE INTO payment_assets (id, rail_code, code, symbol, kind, decimals, created_at, updated_at) VALUES ('asset-okpay', 'okpay', 'USDT', 'USDT', 'external', 8, ?, ?)",
				)
				.bind(now, now),
			db
				.prepare(
					"INSERT OR IGNORE INTO payment_ingresses (id, rail_code, name, type, endpoint, enabled, health_status, created_at, updated_at) VALUES ('connection-okpay', 'okpay', 'OKPay', 'provider', 'https://api.okaypay.me/shop', 1, 'unknown', ?, ?)",
				)
				.bind(now, now),
			db
				.prepare(
					"UPDATE payment_assets SET default_confirmations = 1, created_at = ?, updated_at = ? WHERE id = 'asset-okpay'",
				)
				.bind(now, now),
			db
				.prepare(
					"INSERT OR IGNORE INTO receiving_methods (id, name, rail_code, target_type, target_value, normalized_target_value, enabled, created_at, updated_at) VALUES ('receiving-okpay', 'OKPay shop', 'okpay', 'provider', 'shop-1', 'shop-1', 1, ?, ?)",
				)
				.bind(now, now),
			db
				.prepare(
					"INSERT OR IGNORE INTO receiving_method_assets (id, receiving_method_id, payment_asset_id, created_at, updated_at) VALUES ('link-okpay', 'receiving-okpay', 'asset-okpay', ?, ?)",
				)
				.bind(now, now),
		]);
	});

	afterAll(async () => miniflare.dispose());

	it("treats enabled provider connections as ready without chain health probes", async () => {
		const report = await checkHealth({ DB: db });
		expect(report.components).toContainEqual(
			expect.objectContaining({
				key: "receiving_methods",
				status: "operational",
				count: 1,
			}),
		);
	});

	it("keeps the detailed public probe within its explicit datastore budget", async () => {
		const counters = createDatastoreCounters();
		const edgeCache = instrumentKv(
			{
				get: async () => null,
			} as unknown as KVNamespace,
			counters,
		);
		await checkHealth({
			DB: instrumentD1(db, counters),
			CACHE: edgeCache,
		});

		expect(counters).toMatchObject({
			d1Prepare: 1,
			d1StatementFirst: 1,
			kvGet: 1,
		});
	});

	it("serves GET and HEAD liveness without touching D1 or KV", async () => {
		const counters = createDatastoreCounters();
		const getResponse = applySecurityHeaders(
			new Request("https://probe.invalid/healthz"),
			handleLivenessRequest(new Request("https://probe.invalid/healthz")) ??
				new Response(null, { status: 500 }),
		);
		const headRequest = new Request("https://probe.invalid/healthz", {
			method: "HEAD",
		});
		const headResponse = applySecurityHeaders(
			headRequest,
			handleLivenessRequest(headRequest) ?? new Response(null, { status: 500 }),
		);

		expect(getResponse.status).toBe(200);
		expect(await getResponse.json()).toEqual({
			status: "ok",
			service: "gmpay-edge",
			version: "v1",
		});
		expect(getResponse.headers.get("cache-control")).toBe("no-store");
		expect(headResponse.status).toBe(200);
		expect(await headResponse.text()).toBe("");
		expect(headResponse.headers.get("content-length")).toBe(
			getResponse.headers.get("content-length"),
		);
		expect(counters).toEqual(createDatastoreCounters());
	});

	it("rejects unsupported liveness methods without touching authority stores", async () => {
		const counters = createDatastoreCounters();
		const response = applySecurityHeaders(
			new Request("https://unexpected.example/healthz", { method: "POST" }),
			handleLivenessRequest(
				new Request("https://unexpected.example/healthz", { method: "POST" }),
			) ?? new Response(null, { status: 500 }),
		);

		expect(response.status).toBe(405);
		expect(response.headers.get("allow")).toBe("GET, HEAD");
		expect(await response.json()).toEqual({ error: "method_not_allowed" });
		expect(counters).toEqual(createDatastoreCounters());
	});

	it("does not let similar paths bypass authority", async () => {
		for (const request of [
			new Request("https://unexpected.example/status"),
			new Request("https://unexpected.example/zh-CN/healthz"),
			new Request("https://unexpected.example/healthz/"),
		]) {
			const counters = createDatastoreCounters();
			expect(handleLivenessRequest(request)).toBeNull();
			const response = await validateRequestAuthority(
				request,
				instrumentD1(authorityDatabase(), counters),
			);

			expect(response?.status, `${request.method} ${request.url}`).toBe(421);
			expect(counters.d1Prepare).toBe(1);
			expect(counters.d1StatementAll).toBe(1);
		}
	});

	it("keeps detailed status responses uncached and error details redacted", async () => {
		const counters = createDatastoreCounters();
		const report = await checkHealth({
			DB: instrumentD1(
				{
					prepare: () => ({
						first: async () => {
							throw new Error("D1 secret query text");
						},
					}),
				} as unknown as D1Database,
				counters,
			),
			CACHE: instrumentKv(
				{
					get: async () => {
						throw new Error("KV secret value");
					},
				} as unknown as KVNamespace,
				counters,
			),
		});
		const response = applySecurityHeaders(
			new Request("https://pay.example/status"),
			new Response(JSON.stringify(report)),
		);

		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(JSON.stringify(report)).not.toContain("secret");
		expect(report.components).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ key: "database", detail: "query_failed" }),
				expect.objectContaining({ key: "edge_cache", detail: "read_failed" }),
			]),
		);
		expect(counters).toMatchObject({
			d1Prepare: 1,
			d1StatementFirst: 1,
			kvGet: 1,
		});
	});

	it("single-flights and reuses the detailed snapshot for ten seconds", async () => {
		const counters = createDatastoreCounters();
		const environment = {
			DB: instrumentD1(db, counters),
			CACHE: instrumentKv(
				{ get: async () => null } as unknown as KVNamespace,
				counters,
			),
		};
		const burst = await Promise.all(
			Array.from({ length: 100 }, () => getHealthSnapshot(environment, 1)),
		);
		const first = burst[0];
		const warm = await getHealthSnapshot(environment, healthSnapshotTtlMs);

		expect(burst).toEqual(Array.from({ length: 100 }, () => first));
		expect(warm).toEqual(first);
		expect(counters).toMatchObject({
			d1Prepare: 1,
			d1StatementFirst: 1,
			kvGet: 1,
		});

		await getHealthSnapshot(environment, healthSnapshotTtlMs + 1);
		expect(counters).toMatchObject({
			d1Prepare: 2,
			d1StatementFirst: 2,
			kvGet: 2,
		});
	});

	it("evicts a rejected isolate snapshot instead of caching the failure", async () => {
		let bindingReads = 0;
		const environment = {
			DB: {
				prepare: () => ({ first: async () => ({ receiving_count: 1 }) }),
			} as unknown as D1Database,
			get WEBHOOK_QUEUE() {
				bindingReads += 1;
				throw new Error("binding access failed");
			},
		} as unknown as Partial<Env>;

		await expect(getHealthSnapshot(environment, 1)).rejects.toThrow(
			"binding access failed",
		);
		await expect(getHealthSnapshot(environment, 1)).rejects.toThrow(
			"binding access failed",
		);
		expect(bindingReads).toBe(2);
	});

	it("does not write chain health state for provider scan outcomes", async () => {
		await updateConnectionHealth(
			db,
			"connection-okpay",
			"unhealthy",
			"network",
		);
		const connection = await db
			.prepare(
				"SELECT health_status, last_error_code FROM payment_ingresses WHERE id = ?",
			)
			.bind("connection-okpay")
			.first<{ health_status: string; last_error_code: string | null }>();
		expect(connection).toEqual({
			health_status: "unknown",
			last_error_code: null,
		});
	});
});

function authorityDatabase(): D1Database {
	return {
		prepare: () => ({
			bind: () => ({
				all: async () => ({
					results: [
						{
							key: "security.allowed_hosts",
							value: JSON.stringify(["pay.example"]),
						},
					],
				}),
			}),
		}),
	} as unknown as D1Database;
}
