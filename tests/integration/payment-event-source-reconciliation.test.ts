import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { clearReusableReceivingMethodLockKeys } from "#/features/payment-settings/server/receiving-method-locks";
import { reconcilePaymentEventSource } from "#/features/webhooks/server/payment-event-source-reconciliation";
import { encryptSecret } from "#/lib/secrets";
import type { RuntimeConfig } from "#/server/runtime-config";
import { applyMigrations } from "./migrations";

const sourceId = "33333333-3333-4333-8333-333333333333";
const desiredAddress = "0x1111111111111111111111111111111111111111";
const remoteAddress = "0x2222222222222222222222222222222222222222";
const runtime: RuntimeConfig = {
	betterAuthSecret: "",
	betterAuthUrl: "https://pay.example",
	apiKeyPepper: "",
	integrationConfigSecret: "source-reconciliation-secret",
};

describe("payment event source reconciliation", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-source-reconciliation" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		const now = Date.now();
		await db.batch([
			db
				.prepare(
					"INSERT INTO payment_rails (code, name, kind, adapter, created_at, updated_at) VALUES ('ethereum', 'Ethereum', 'chain', 'evm', ?, ?)",
				)
				.bind(now, now),
			db
				.prepare(
					`INSERT INTO receiving_methods
					 (id, name, rail_code, target_type, target_value, normalized_target_value,
					  enabled, created_at, updated_at)
					 VALUES ('method-source', 'Ethereum receiving', 'ethereum', 'address', ?, ?, 1, ?, ?)`,
				)
				.bind(desiredAddress, desiredAddress, now, now),
			db
				.prepare(
					`INSERT INTO payment_ingresses
					 (id, name, type, transport, provider, network, external_network, external_source_id,
					  config_encrypted, mode, enabled, reconcile_required_at, created_at, updated_at)
					 VALUES (?, 'Payment event push', 'provider_webhook', 'webhook', 'alchemy', 'ethereum', 'ETH_MAINNET', 'wh-source', ?, 'shadow', 1, ?, ?, ?)`,
				)
				.bind(
					sourceId,
					await encryptSecret(
						JSON.stringify({
							signingKey: "source-signing-key",
							authToken: "source-management-token",
						}),
						runtime.integrationConfigSecret,
					),
					now,
					now,
					now,
				),
		]);
	});

	afterAll(async () => miniflare.dispose());

	it("diffs the dedicated Alchemy source and persists its desired revision", async () => {
		const fetchFn = vi.fn(
			async (input: URL | RequestInfo, init?: RequestInit) => {
				const url = String(input);
				if (url.includes("team-webhooks")) return teamWebhooksResponse();
				if (url.includes("webhook-addresses"))
					return Response.json({
						data: [remoteAddress],
						pagination: { cursors: { after: null } },
					});
				expect(url).toBe(
					"https://dashboard.alchemy.com/api/update-webhook-addresses",
				);
				expect(JSON.parse(String(init?.body))).toEqual({
					webhook_id: "wh-source",
					addresses_to_add: [desiredAddress],
					addresses_to_remove: [remoteAddress],
				});
				return Response.json({});
			},
		);
		await expect(
			reconcilePaymentEventSource(db, sourceId, {
				fetchFn: fetchFn as typeof fetch,
				runtime,
			}),
		).resolves.toMatchObject({
			sourceId,
			skipped: false,
			desiredCount: 1,
			added: 1,
			removed: 1,
		});
		expect(fetchFn).toHaveBeenCalledTimes(3);
		const source = await db
			.prepare(
				"SELECT desired_addresses_hash, reconcile_required_at, health_status, last_error_code FROM payment_ingresses WHERE id = ?",
			)
			.bind(sourceId)
			.first<{
				desired_addresses_hash: string;
				reconcile_required_at: number | null;
				health_status: string;
				last_error_code: string | null;
			}>();
		expect(source).toMatchObject({
			reconcile_required_at: null,
			health_status: "healthy",
			last_error_code: null,
		});
		expect(source?.desired_addresses_hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it("skips remote calls while the desired address revision is unchanged", async () => {
		const fetchFn = vi.fn();
		await expect(
			reconcilePaymentEventSource(db, sourceId, {
				fetchFn: fetchFn as typeof fetch,
				runtime,
			}),
		).resolves.toMatchObject({ skipped: true, desiredCount: 1 });
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it("removes addresses from a dedicated source after local disable", async () => {
		await db
			.prepare(
				"UPDATE payment_ingresses SET enabled = 0, reconcile_required_at = ? WHERE id = ?",
			)
			.bind(Date.now(), sourceId)
			.run();
		const fetchFn = vi.fn(
			async (input: URL | RequestInfo, init?: RequestInit) => {
				if (String(input).includes("team-webhooks"))
					return teamWebhooksResponse();
				if (String(input).includes("webhook-addresses"))
					return Response.json({
						data: [desiredAddress],
						pagination: { cursors: { after: null } },
					});
				expect(JSON.parse(String(init?.body))).toEqual({
					webhook_id: "wh-source",
					addresses_to_add: [],
					addresses_to_remove: [desiredAddress],
				});
				return Response.json({});
			},
		);

		await expect(
			reconcilePaymentEventSource(db, sourceId, {
				fetchFn: fetchFn as typeof fetch,
				runtime,
			}),
		).resolves.toMatchObject({ desiredCount: 0, removed: 1 });
		expect(fetchFn).toHaveBeenCalledTimes(3);
	});

	it("rejects a remote webhook whose callback URL does not match", async () => {
		await db
			.prepare(
				"UPDATE payment_ingresses SET enabled = 1, reconcile_required_at = ? WHERE id = ?",
			)
			.bind(Date.now(), sourceId)
			.run();
		const fetchFn = vi.fn().mockResolvedValue(
			Response.json({
				data: [
					{
						...teamWebhook(),
						webhook_url: "https://wrong.example/webhook",
					},
				],
			}),
		);
		await expect(
			reconcilePaymentEventSource(db, sourceId, {
				fetchFn: fetchFn as typeof fetch,
				runtime,
			}),
		).rejects.toMatchObject({
			code: "payment_event_source_reconcile_failed",
			status: 502,
		});
		const source = await db
			.prepare(
				"SELECT health_status, last_error_code FROM payment_ingresses WHERE id = ?",
			)
			.bind(sourceId)
			.first<{ health_status: string; last_error_code: string }>();
		expect(source).toEqual({
			health_status: "degraded",
			last_error_code: "webhook_url_mismatch",
		});
		expect(fetchFn).toHaveBeenCalledOnce();
	});

	it("redacts provider failures and marks the source degraded", async () => {
		await db
			.prepare(
				"UPDATE payment_ingresses SET enabled = 1, reconcile_required_at = ? WHERE id = ?",
			)
			.bind(Date.now(), sourceId)
			.run();
		const fetchFn = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 401 }));
		await expect(
			reconcilePaymentEventSource(db, sourceId, {
				fetchFn: fetchFn as typeof fetch,
				runtime,
			}),
		).rejects.toMatchObject({
			code: "payment_event_source_reconcile_failed",
			status: 502,
		});
		const source = await db
			.prepare(
				"SELECT health_status, last_error_code FROM payment_ingresses WHERE id = ?",
			)
			.bind(sourceId)
			.first<{ health_status: string; last_error_code: string }>();
		expect(source).toEqual({
			health_status: "degraded",
			last_error_code: "authentication",
		});
	});

	it("schedules address removal when a retained lock becomes reusable", async () => {
		const now = Date.now();
		await db.batch([
			db
				.prepare(
					`INSERT INTO payment_assets
					 (id, rail_code, code, symbol, kind, decimals, created_at, updated_at)
					 VALUES ('asset-source', 'ethereum', 'ETH', 'ETH', 'native', 18, ?, ?)`,
				)
				.bind(now, now),
			db
				.prepare(
					`INSERT INTO orders
					 (id, external_order_id, amount_minor, currency, currency_decimals,
					  received_amount_units, expires_at, created_at, updated_at)
					 VALUES ('order-source-lock', 'source-lock', '1', 'USD', 2, '0', ?, ?, ?)`,
				)
				.bind(now, now, now),
			db
				.prepare(
					`INSERT INTO receiving_method_locks
					 (id, receiving_method_id, asset_id, order_id, expected_amount_units,
					  collision_key, expires_at, reusable_at, created_at)
					 VALUES ('source-lock', 'method-source', 'asset-source', 'order-source-lock',
					  '1', 'source-lock-key', ?, ?, ?)`,
				)
				.bind(now - 1, now - 1, now - 1),
			db.prepare(
				"UPDATE receiving_methods SET enabled = 0 WHERE id = 'method-source'",
			),
			db
				.prepare(
					"UPDATE payment_ingresses SET enabled = 1, reconcile_required_at = NULL WHERE id = ?",
				)
				.bind(sourceId),
		]);

		await expect(clearReusableReceivingMethodLockKeys(db, now)).resolves.toBe(
			1,
		);
		const state = await db
			.prepare(
				`SELECT source.reconcile_required_at, lock.collision_key
				 FROM payment_ingresses source
				 JOIN receiving_method_locks lock ON lock.id = 'source-lock'
				 WHERE source.id = ?`,
			)
			.bind(sourceId)
			.first<{
				reconcile_required_at: number | null;
				collision_key: string | null;
			}>();
		expect(state).toEqual({
			reconcile_required_at: now,
			collision_key: null,
		});
	});
});

function teamWebhook() {
	return {
		id: "wh-source",
		network: "ETH_MAINNET",
		webhook_type: "ADDRESS_ACTIVITY",
		webhook_url: `https://pay.example/api/providers/alchemy/${sourceId}`,
		is_active: true,
	};
}

function teamWebhooksResponse() {
	return Response.json({ data: [teamWebhook()] });
}
