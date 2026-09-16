import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	queryAvailablePaymentAssets,
	queryPublicPaymentMethods,
} from "#/features/status/server/assets-query";
import { applyMigrations } from "./migrations";

describe("available payment asset catalog", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-payment-asset-catalog" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		await seed(db);
	});

	afterAll(async () => miniflare.dispose());

	it("only exposes assets backed by a ready receiving method", async () => {
		await expect(queryAvailablePaymentAssets(db)).resolves.toEqual([
			{ code: "TRX", network: "tron", symbol: "TRX", decimals: 6 },
			{ code: "USDT", network: "tron", symbol: "USDT", decimals: 6 },
		]);
		await db
			.prepare(
				"UPDATE receiving_methods SET target_value = '', normalized_target_value = '' WHERE id = 'trx'",
			)
			.run();
		await expect(queryAvailablePaymentAssets(db)).resolves.toEqual([]);
		const methods = await queryPublicPaymentMethods(db);
		expect(methods).toEqual([
			{
				type: "network",
				code: "tron",
				name: "TRON",
				assets: ["TRX", "USDT"],
				status: "implemented",
			},
		]);
		await seedProvider(db);
		await expect(queryAvailablePaymentAssets(db)).resolves.toContainEqual({
			code: "USDT",
			network: "okpay",
			symbol: "USDT",
			decimals: 8,
		});
		await expect(queryPublicPaymentMethods(db)).resolves.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "wallet",
					code: "okpay",
					status: "available",
				}),
			]),
		);
	});
});

async function seedProvider(db: D1Database) {
	const now = Date.now();
	await db.batch([
		db
			.prepare(
				"INSERT OR IGNORE INTO payment_rails (code, name, kind, adapter, created_at, updated_at) VALUES ('okpay', 'OKPay', 'wallet', 'okpay', ?, ?)",
			)
			.bind(now, now),
		db
			.prepare(
				"INSERT OR IGNORE INTO payment_assets (id, rail_code, code, symbol, kind, decimals, created_at, updated_at) VALUES ('okpay-usdt', 'okpay', 'USDT', 'USDT', 'external', 8, ?, ?)",
			)
			.bind(now, now),
		db
			.prepare(
				"INSERT OR IGNORE INTO payment_ingresses (id, rail_code, name, type, endpoint, enabled, health_status, created_at, updated_at) VALUES ('connection-okpay', 'okpay', 'OKPay', 'provider', 'https://api.okaypay.me/shop', 1, 'unknown', ?, ?)",
			)
			.bind(now, now),
		db
			.prepare(
				"UPDATE payment_assets SET default_confirmations = 1, created_at = ?, updated_at = ? WHERE id = 'okpay-usdt'",
			)
			.bind(now, now),
		db
			.prepare(
				"INSERT OR IGNORE INTO receiving_methods (id, name, rail_code, target_type, target_value, normalized_target_value, enabled, created_at, updated_at) VALUES ('receiving-okpay', 'OKPay shop', 'okpay', 'provider', '12345', '12345', 1, ?, ?)",
			)
			.bind(now, now),
		db
			.prepare(
				"INSERT OR IGNORE INTO receiving_method_assets (id, receiving_method_id, payment_asset_id, created_at, updated_at) VALUES ('link-okpay', 'receiving-okpay', 'okpay-usdt', ?, ?)",
			)
			.bind(now, now),
	]);
}

async function seed(db: D1Database) {
	const now = Date.now();
	await db.batch([
		db
			.prepare(
				"INSERT OR IGNORE INTO payment_rails (code, name, kind, adapter, created_at, updated_at) VALUES ('tron', 'TRON', 'chain', 'tron', ?, ?)",
			)
			.bind(now, now),
		db
			.prepare(
				"INSERT OR IGNORE INTO payment_rails (code, name, kind, adapter, created_at, updated_at) VALUES ('tron', 'TRON', 'chain', 'tron', ?, ?)",
			)
			.bind(now, now),
		...[
			["trx", "TRX", "TRX", "native"],
			["usdt", "USDT", "USDT", "token"],
		].map(([id, code, symbol, kind]) =>
			db
				.prepare(
					"INSERT INTO payment_assets (id, rail_code, code, symbol, kind, decimals, created_at, updated_at) VALUES (?, 'tron', ?, ?, ?, 6, ?, ?)",
				)
				.bind(id, code, symbol, kind, now, now),
		),
		db
			.prepare(
				"INSERT INTO payment_ingresses (id, rail_code, name, type, endpoint, enabled, health_status, created_at, updated_at) VALUES ('connection-tron', 'tron', 'TronGrid', 'rpc', 'https://api.trongrid.io', 1, 'healthy', ?, ?)",
			)
			.bind(now, now),
		db
			.prepare(
				"UPDATE payment_assets SET default_confirmations = 20, created_at = ?, updated_at = ? WHERE id IN ('trx', 'usdt')",
			)
			.bind(now, now),
		db
			.prepare(
				"INSERT INTO receiving_methods (id, name, rail_code, target_type, target_value, normalized_target_value, enabled, created_at, updated_at) VALUES ('trx', 'Primary TRON', 'tron', 'address', 'T111111111111111111111111111111111', 'T111111111111111111111111111111111', 1, ?, ?)",
			)
			.bind(now, now),
	]);
}
