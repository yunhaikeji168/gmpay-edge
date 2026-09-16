import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resolveLatePaymentAsAdmin } from "#/features/payments/server/admin-actions";
import { applyMigrations } from "./migrations";

describe("admin payment decisions", () => {
	let miniflare: Miniflare;
	let db: D1Database;

	beforeAll(async () => {
		miniflare = new Miniflare({
			modules: true,
			script: "export default { fetch() { return new Response('ok') } }",
			d1Databases: { DB: "gmpay-edge-admin-payment-actions" },
		});
		db = await miniflare.getD1Database("DB");
		await applyMigrations(db);
		await seed(db);
	});

	afterAll(async () => miniflare.dispose());

	it("returns stable not-found, resolved, and unavailable decision errors", async () => {
		const env = { DB: db } as Env;
		await expect(
			resolveLatePaymentAsAdmin(env, "missing", "accept", "actor"),
		).rejects.toMatchObject({ code: "payment_not_found", status: 404 });
		await expect(
			resolveLatePaymentAsAdmin(env, "payment-resolved", "reject", "actor"),
		).rejects.toMatchObject({
			code: "payment_decision_already_resolved",
			status: 409,
		});
		await expect(
			resolveLatePaymentAsAdmin(env, "payment-active", "accept", "actor"),
		).rejects.toMatchObject({
			code: "payment_decision_not_available",
			status: 409,
		});
	});
});

async function seed(db: D1Database) {
	const now = Date.now();
	await db.batch([
		...[
			["order-expired", "expired"],
			["order-active", "pending"],
		].map(([id, status]) =>
			db
				.prepare(
					"INSERT INTO orders (id, external_order_id, status, amount_minor, currency, currency_decimals, expires_at, created_at, updated_at) VALUES (?, ?, ?, '100', 'USD', 2, ?, ?, ?)",
				)
				.bind(id, `${id}-number`, status, now + 60_000, now, now),
		),
		db
			.prepare(
				"INSERT INTO order_payments (id, order_id, transaction_id, amount_units, confirmations, status, detected_at, created_at, updated_at) VALUES ('payment-resolved', 'order-expired', 'tron:resolved:0', '1000000', 1, 'confirmed', ?, ?, ?)",
			)
			.bind(now, now, now),
		db
			.prepare(
				"INSERT INTO order_payments (id, order_id, transaction_id, amount_units, confirmations, status, detected_at, created_at, updated_at) VALUES ('payment-active', 'order-active', 'tron:active:0', '1000000', 1, 'detected', ?, ?, ?)",
			)
			.bind(now, now, now),
	]);
}
