import { Miniflare } from "miniflare";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { loadSiteBrand } from "#/features/settings/server/site-brand";
import {
	loadCheckoutAmountDecimals,
	saveSystemSettings,
} from "#/features/settings/server/system-settings";
import { loadOperationalSettings } from "#/server/operational-settings";
import { applyMigrations } from "./migrations";

describe("system settings persistence", () => {
	let miniflare: Miniflare;
	let db: D1Database;
	let cache: KVNamespace;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-system-settings-save" },
			kvNamespaces: ["CACHE"],
		});
		db = await miniflare.getD1Database("DB");
		cache = (await miniflare.getKVNamespace("CACHE")) as unknown as KVNamespace;
		await applyMigrations(db);
		await db
			.prepare(
				"INSERT OR IGNORE INTO users (id, name, email, email_verified, enabled, two_factor_enabled) VALUES ('root-user', 'Root', 'settings-root@example.com', 1, 1, 0)",
			)
			.run();
	});

	beforeEach(async () => {
		await db.batch([
			db.prepare(
				"DELETE FROM system_settings WHERE key IN ('site.name', 'site.default_locale', 'orders.immediate_release_mode', 'orders.fixed_expiry_ms', 'orders.default_expiry_ms', 'orders.max_expiry_ms', 'payments.checkout_amount_decimals', 'runtime.api_key_pepper', 'runtime.integration_config_secret')",
			),
			db.prepare(
				"DELETE FROM audit_logs WHERE action = 'system_settings.updated'",
			),
		]);
		await cache.delete("site-brand:v1");
	});

	afterAll(async () => miniflare.dispose());

	it("makes an ordinary setting authoritative without KV invalidation", async () => {
		await Promise.all([loadSiteBrand(db, cache), loadOperationalSettings(db)]);
		await expect(
			saveSystemSettings(
				[{ key: "orders.default_expiry_ms", value: 1_800_000 }],
				dependencies(),
			),
		).resolves.toEqual({ updated: ["orders.default_expiry_ms"] });

		await expect(setting("orders.default_expiry_ms")).resolves.toBe("1800000");
		expect(await cache.get("site-brand:v1")).not.toBeNull();
		await expect(loadOperationalSettings(db)).resolves.toMatchObject({
			defaultExpiryMs: 1_800_000,
		});
		expect(
			(await cache.list({ prefix: "operational-settings:" })).keys,
		).toHaveLength(0);
		await expect(latestAudit()).resolves.toMatchObject({
			actor_user_id: "root-user",
			request_id: "request-settings",
		});
	});

	it("invalidates only the public brand snapshot for a Brand form save", async () => {
		await loadSiteBrand(db, cache);
		await saveSystemSettings(
			[
				{ key: "site.name", value: "Updated Edge" },
				{ key: "site.default_locale", value: "zh-CN" },
			],
			dependencies(),
		);

		expect(await cache.get("site-brand:v1")).toBeNull();
		expect(
			(await cache.list({ prefix: "operational-settings:" })).keys,
		).toHaveLength(0);
		await expect(loadSiteBrand(db, cache)).resolves.toMatchObject({
			name: "Updated Edge",
			defaultLocale: "zh-CN",
		});
	});

	it("loads the configured checkout payment precision with a safe default", async () => {
		await expect(loadCheckoutAmountDecimals(db)).resolves.toBe(4);
		await saveSystemSettings(
			[{ key: "payments.checkout_amount_decimals", value: 6 }],
			dependencies(),
		);
		await expect(loadCheckoutAmountDecimals(db)).resolves.toBe(6);
		await db
			.prepare(
				"UPDATE system_settings SET value = '99' WHERE key = 'payments.checkout_amount_decimals'",
			)
			.run();
		await expect(loadCheckoutAmountDecimals(db)).resolves.toBe(4);
		await expect(
			saveSystemSettings(
				[{ key: "payments.checkout_amount_decimals", value: 1 }],
				dependencies(),
			),
		).rejects.toBeInstanceOf(Error);
	});

	it("validates both expiry strategies", async () => {
		await expect(
			saveSystemSettings(
				[
					{ key: "orders.default_expiry_ms", value: 700_000 },
					{ key: "orders.max_expiry_ms", value: 600_000 },
				],
				dependencies(),
			),
		).rejects.toMatchObject({ code: "invalid_settings", status: 400 });
		await expect(
			saveSystemSettings(
				[
					{ key: "orders.immediate_release_mode", value: true },
					{ key: "orders.fixed_expiry_ms", value: 120_000 },
				],
				dependencies(),
			),
		).resolves.toEqual({
			updated: ["orders.immediate_release_mode", "orders.fixed_expiry_ms"],
		});
		await expect(loadOperationalSettings(db)).resolves.toMatchObject({
			immediateReleaseMode: true,
			fixedExpiryMs: 120_000,
		});
	});

	it("applies lock cleanup when the release strategy changes", async () => {
		const now = Date.now();
		await db.batch([
			db
				.prepare(
					"INSERT INTO payment_rails (code, name, kind, adapter, created_at, updated_at) VALUES ('switch-rail', 'Switch rail', 'chain', 'evm', ?, ?)",
				)
				.bind(now, now),
			db
				.prepare(
					"INSERT INTO payment_assets (id, rail_code, code, symbol, kind, decimals, created_at, updated_at) VALUES ('switch-asset', 'switch-rail', 'SW', 'SW', 'native', 6, ?, ?)",
				)
				.bind(now, now),
			db
				.prepare(
					"INSERT INTO receiving_methods (id, name, rail_code, target_type, target_value, normalized_target_value, enabled, created_at, updated_at) VALUES ('switch-method', 'Switch method', 'switch-rail', 'address', '0x123', '0x123', 0, ?, ?)",
				)
				.bind(now, now),
			db
				.prepare(
					`INSERT INTO payment_ingresses
				 (id, name, type, transport, provider, network, external_network,
				  external_source_id, config_encrypted, mode, enabled, created_at, updated_at)
				 VALUES ('switch-source', 'Switch source', 'provider_webhook', 'webhook',
				  'alchemy', 'switch-rail', 'SW_MAINNET', 'switch-source-id', 'encrypted',
				  'active', 1, ?, ?)`,
				)
				.bind(now, now),
			db
				.prepare(
					"INSERT INTO orders (id, external_order_id, amount_minor, currency, currency_decimals, received_amount_units, expires_at, created_at, updated_at) VALUES ('switch-active', 'switch-active', '1', 'USD', 2, '0', ?, ?, ?)",
				)
				.bind(now + 60_000, now, now),
			db
				.prepare(
					"INSERT INTO orders (id, external_order_id, amount_minor, currency, currency_decimals, received_amount_units, expires_at, created_at, updated_at) VALUES ('switch-released', 'switch-released', '1', 'USD', 2, '0', ?, ?, ?)",
				)
				.bind(now + 60_000, now, now),
			db
				.prepare(
					"INSERT INTO receiving_method_locks (id, receiving_method_id, asset_id, order_id, expected_amount_units, collision_key, expires_at, reusable_at, released_at, created_at) VALUES ('switch-active-lock', 'switch-method', 'switch-asset', 'switch-active', '1', 'switch:1', ?, ?, NULL, ?)",
				)
				.bind(now + 60_000, now + 86_460_000, now),
			db
				.prepare(
					"INSERT INTO receiving_method_locks (id, receiving_method_id, asset_id, order_id, expected_amount_units, collision_key, expires_at, reusable_at, released_at, created_at) VALUES ('switch-released-lock', 'switch-method', 'switch-asset', 'switch-released', '2', 'switch:2', ?, ?, ?, ?)",
				)
				.bind(now + 60_000, now + 86_460_000, now, now),
		]);

		await saveSystemSettings(
			[{ key: "orders.immediate_release_mode", value: true }],
			dependencies(),
		);
		const immediate = await db
			.prepare(
				`SELECT
				 (SELECT COUNT(*) FROM receiving_method_locks WHERE id = 'switch-released-lock') AS released_count,
				 (SELECT reusable_at - expires_at FROM receiving_method_locks WHERE id = 'switch-active-lock') AS active_delay,
				 (SELECT reconcile_required_at FROM payment_ingresses WHERE id = 'switch-source') AS reconcile_required_at`,
			)
			.first<Record<string, number | null>>();
		expect(immediate).toMatchObject({
			released_count: 0,
			active_delay: 0,
			reconcile_required_at: expect.any(Number),
		});

		await saveSystemSettings(
			[{ key: "orders.immediate_release_mode", value: false }],
			dependencies(),
		);
		const restored = await db
			.prepare(
				"SELECT reusable_at - expires_at AS delay FROM receiving_method_locks WHERE id = 'switch-active-lock'",
			)
			.first<{ delay: number }>();
		expect(restored?.delay).toBe(86_400_000);
	});

	it("preserves configured secrets and rejects unknown or duplicate keys", async () => {
		await db
			.prepare(
				"INSERT INTO system_settings (key, value, is_secret, created_at, updated_at) VALUES ('runtime.api_key_pepper', '\"configured-secret\"', 1, 0, 0)",
			)
			.run();
		await expect(
			saveSystemSettings(
				[{ key: "runtime.api_key_pepper", value: "" }],
				dependencies(),
			),
		).resolves.toEqual({ updated: [] });
		await expect(setting("runtime.api_key_pepper")).resolves.toBe(
			'"configured-secret"',
		);
		await expect(
			saveSystemSettings([{ key: "unknown", value: true }], dependencies()),
		).rejects.toMatchObject({ code: "invalid_settings", status: 400 });
		await expect(
			saveSystemSettings(
				[{ key: "site.default_locale", value: "invalid" }],
				dependencies(),
			),
		).rejects.toBeInstanceOf(Error);
		await expect(
			saveSystemSettings(
				[
					{ key: "site.name", value: "First" },
					{ key: "site.name", value: "Second" },
				],
				dependencies(),
			),
		).rejects.toMatchObject({ code: "invalid_settings", status: 400 });
	});

	function dependencies() {
		return {
			db,
			cache,
			userId: "root-user",
			requestId: "request-settings",
			ipAddress: "192.0.2.2",
		};
	}

	async function setting(key: string) {
		return (
			await db
				.prepare("SELECT value FROM system_settings WHERE key = ?")
				.bind(key)
				.first<{ value: string }>()
		)?.value;
	}

	function latestAudit() {
		return db
			.prepare(
				"SELECT actor_user_id, request_id, ip_address, after FROM audit_logs WHERE action = 'system_settings.updated' ORDER BY created_at DESC, rowid DESC LIMIT 1",
			)
			.first();
	}
});
