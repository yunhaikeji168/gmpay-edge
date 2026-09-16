import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { expect, it } from "vitest";
import { recoverProviderEventOutbox } from "#/features/payments/server/provider-event-outbox";
import { applyMigrations } from "./migrations";

it("upgrades existing provider events without loss and recovers an old expired lease", async () => {
	const runtime = new Miniflare({
		modules: true,
		script: "export default { fetch() { return new Response('ok') } }",
		d1Databases: { DB: "provider-lease-upgrade" },
	});
	try {
		const db = await runtime.getD1Database("DB");
		await applyMigrations(db, 6);
		await db
			.prepare(
				"INSERT INTO payment_ingresses (id, name, type, transport, provider, network, external_network, external_source_id, config_encrypted, mode, enabled, created_at, updated_at) VALUES ('source', 'Source', 'provider_webhook', 'webhook', 'alchemy', 'ethereum', 'ETH_MAINNET', 'test-source', 'test-encrypted', 'active', 1, 1, 1)",
			)
			.run();
		await db
			.prepare(`INSERT INTO inbound_provider_events (id, source_id, provider_event_id, activity_index, network, event_type, transaction_hash, event_index, payload_hash, trigger, ingest_mode, status, attempt_count, lease_until, received_at, created_at, updated_at)
		 VALUES ('old-event', 'source', 'old-provider-event', 0, 'ethereum', 'address_activity', 'old-transaction', 1, 'old-hash', '{"legacy":"retained"}', 'active', 'processing', 2, 100, 1, 1, 1)`)
			.run();
		const migration = await readFile(
			new URL("../../drizzle/0007_sparkling_wallflower.sql", import.meta.url),
			"utf8",
		);
		await db.prepare(migration).run();
		expect(
			await db
				.prepare(
					"SELECT trigger, attempt_count, lease_token FROM inbound_provider_events WHERE id = 'old-event'",
				)
				.first(),
		).toEqual({
			trigger: '{"legacy":"retained"}',
			attempt_count: 2,
			lease_token: null,
		});
		await recoverProviderEventOutbox({ DB: db }, 101);
		expect(
			await db
				.prepare(
					"SELECT status, lease_until, lease_token FROM inbound_provider_events WHERE id = 'old-event'",
				)
				.first(),
		).toEqual({ status: "failed", lease_until: null, lease_token: null });
		expect(
			(await db.prepare("PRAGMA foreign_key_check").all()).results,
		).toEqual([]);
	} finally {
		await runtime.dispose();
	}
});
