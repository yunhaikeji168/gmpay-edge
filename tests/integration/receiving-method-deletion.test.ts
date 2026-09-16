import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteReceivingMethod } from "#/features/payment-settings/server/delete-receiving-method";
import { applyMigrations } from "./migrations";

describe("receiving method deletion", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-receiving-method-deletion" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		await seed(db);
	});

	afterAll(async () => miniflare.dispose());

	it("deletes unused methods and their asset links with an audit record", async () => {
		await expect(
			deleteReceivingMethod(db, "receiving-unused", emptyAudit),
		).resolves.toMatchObject({ id: "receiving-unused", deleted: true });
		await expect(
			db
				.prepare("SELECT id FROM receiving_methods WHERE id = ?")
				.bind("receiving-unused")
				.first(),
		).resolves.toBeNull();
		await expect(
			db
				.prepare(
					"SELECT id FROM receiving_method_assets WHERE receiving_method_id = ?",
				)
				.bind("receiving-unused")
				.first(),
		).resolves.toBeNull();
		const audit = await db
			.prepare(
				"SELECT action FROM audit_logs WHERE target_id = 'receiving-unused'",
			)
			.first<{ action: string }>();
		expect(audit?.action).toBe("receiving_method.deleted");
	});

	it("preserves methods referenced by immutable order snapshots", async () => {
		await expect(
			deleteReceivingMethod(db, "receiving-used", emptyAudit),
		).resolves.toEqual({
			id: "receiving-used",
			deleted: false,
			reason: "in_use",
		});
		const receiving = await db
			.prepare("SELECT id FROM receiving_methods WHERE id = ?")
			.bind("receiving-used")
			.first<{ id: string }>();
		expect(receiving?.id).toBe("receiving-used");
	});

	it("returns a stable not-found domain error without exposing D1 details", async () => {
		await expect(
			deleteReceivingMethod(db, "receiving-missing", emptyAudit),
		).rejects.toMatchObject({
			code: "receiving_method_not_found",
			status: 404,
		});
	});
});

const emptyAudit = {
	actorUserId: null,
	requestId: null,
	ipAddress: null,
};

async function seed(db: D1Database) {
	const now = Date.now();
	await db.batch([
		db
			.prepare(
				"INSERT INTO payment_rails (code, name, kind, adapter, created_at, updated_at) VALUES ('tron', 'TRON', 'chain', 'tron', ?, ?)",
			)
			.bind(now, now),
		db
			.prepare(
				"INSERT INTO payment_assets (id, rail_code, code, symbol, kind, decimals, created_at, updated_at) VALUES ('asset-usdt', 'tron', 'USDT', 'USDT', 'token', 6, ?, ?)",
			)
			.bind(now, now),
		db
			.prepare(
				"UPDATE payment_assets SET default_confirmations = 20, created_at = ?, updated_at = ? WHERE id = 'asset-usdt'",
			)
			.bind(now, now),
		db
			.prepare(
				`INSERT INTO receiving_methods
				 (id, name, rail_code, target_type, target_value, normalized_target_value, enabled, created_at, updated_at)
				 VALUES
				 ('receiving-unused', 'Unused', 'tron', 'address', 'TUnused', 'TUnused', 1, ?, ?),
				 ('receiving-used', 'Used', 'tron', 'address', 'TUsed', 'TUsed', 1, ?, ?)`,
			)
			.bind(now, now, now, now),
		db
			.prepare(
				"INSERT INTO orders (id, external_order_id, amount_minor, currency, currency_decimals, expires_at, created_at, updated_at) VALUES ('order-used', 'merchant-used', '1000', 'USD', 2, ?, ?, ?)",
			)
			.bind(now + 60_000, now, now),
		db
			.prepare(
				`INSERT INTO order_payment_snapshots
				 (order_id, receiving_method_id, receiving_method_name, rail_code, rail_kind, asset_id, asset_code, decimals,
				  target_value, adapter, required_confirmations, expected_amount_units, created_at)
				 VALUES ('order-used', 'receiving-used', 'Used', 'tron', 'chain', 'asset-usdt', 'USDT', 6,
				  'TUsed', 'tron', 20, '10000000', ?)`,
			)
			.bind(now),
	]);
}
