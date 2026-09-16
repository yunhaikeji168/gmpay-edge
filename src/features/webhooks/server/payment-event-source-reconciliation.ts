import { z } from "zod";
import {
	AlchemyWebhookManagementError,
	alchemyEventSourceConfigSchema,
	reconcileAlchemyWebhookAddresses,
} from "#/integrations/chains/alchemy-webhook";
import { sha256Hex } from "#/lib/crypto";
import { DomainError } from "#/lib/domain-error";
import { decryptSecret } from "#/lib/secrets";
import { loadRuntimeConfig, type RuntimeConfig } from "#/server/runtime-config";

const maximumDesiredAddresses = 2_000;

type EventSource = {
	id: string;
	provider: string;
	network: string;
	external_network: string;
	external_source_id: string;
	config_encrypted: string;
	desired_addresses_hash: string | null;
	reconcile_required_at: number | null;
	enabled: number;
};

export async function reconcilePaymentEventSource(
	db: D1Database,
	sourceId: string,
	options: {
		fetchFn?: typeof fetch;
		force?: boolean;
		runtime?: RuntimeConfig;
	} = {},
) {
	const source = await db
		.prepare(
			`SELECT id, provider, network, external_network, external_source_id, config_encrypted,
			 desired_addresses_hash, reconcile_required_at, enabled
			 FROM payment_ingresses
			 WHERE id = ? AND type = 'provider_webhook' LIMIT 1`,
		)
		.bind(sourceId)
		.first<EventSource>();
	if (!source)
		throw new DomainError(
			"payment_event_source_not_found",
			404,
			"Payment event push not found",
		);
	if (source.provider !== "alchemy")
		throw new DomainError(
			"payment_event_source_provider_unsupported",
			409,
			"Payment event push provider is not supported",
		);
	const desiredAddresses = source.enabled
		? await loadDesiredAddresses(db, source.network)
		: [];
	const desiredAddressesHash = await sha256Hex(
		JSON.stringify(desiredAddresses),
	);
	if (
		!options.force &&
		source.reconcile_required_at === null &&
		source.desired_addresses_hash === desiredAddressesHash
	)
		return {
			sourceId,
			skipped: true as const,
			desiredCount: desiredAddresses.length,
			added: 0,
			removed: 0,
		};

	try {
		const runtime = options.runtime ?? (await loadRuntimeConfig(db));
		const config = alchemyEventSourceConfigSchema.parse(
			JSON.parse(
				await decryptSecret(
					source.config_encrypted,
					runtime.integrationConfigSecret,
				),
			),
		);
		if (!config.authToken)
			throw new AlchemyWebhookManagementError("management_token_missing");
		const result = await reconcileAlchemyWebhookAddresses(
			{
				authToken: config.authToken,
				externalSourceId: source.external_source_id,
				externalNetwork: source.external_network,
				webhookUrl: new URL(
					`/api/providers/alchemy/${source.id}`,
					runtime.betterAuthUrl,
				).href,
				requireActive: Boolean(source.enabled),
				desiredAddresses,
			},
			options.fetchFn,
		);
		const now = Date.now();
		await db
			.prepare(
				`UPDATE payment_ingresses SET desired_addresses_hash = ?,
				 reconcile_required_at = NULL, last_reconciled_at = ?,
				 health_status = 'healthy', last_error_code = NULL, updated_at = ?
				 WHERE id = ?`,
			)
			.bind(desiredAddressesHash, now, now, sourceId)
			.run();
		return { sourceId, skipped: false as const, ...result };
	} catch (error) {
		const errorCode = sourceErrorCode(error);
		const now = Date.now();
		await db
			.prepare(
				`UPDATE payment_ingresses SET health_status = 'degraded',
				 last_error_code = ?, updated_at = ? WHERE id = ?`,
			)
			.bind(errorCode, now, sourceId)
			.run();
		throw new DomainError(
			"payment_event_source_reconcile_failed",
			502,
			"Payment event push reconciliation failed",
		);
	}
}

async function loadDesiredAddresses(db: D1Database, network: string) {
	const rows = await db
		.prepare(
			`SELECT DISTINCT LOWER(method.normalized_target_value) AS address
			 FROM receiving_methods method
			 LEFT JOIN receiving_method_locks lock
			 ON lock.receiving_method_id = method.id AND lock.collision_key IS NOT NULL
			 WHERE method.rail_code = ? AND method.target_type = 'address'
			 AND (method.enabled = 1 OR lock.id IS NOT NULL)
			 ORDER BY address LIMIT ?`,
		)
		.bind(network, maximumDesiredAddresses + 1)
		.all<{ address: string }>();
	if (rows.results.length > maximumDesiredAddresses)
		throw new AlchemyWebhookManagementError("address_limit");
	return rows.results.map((row) => row.address);
}

function sourceErrorCode(error: unknown) {
	if (error instanceof AlchemyWebhookManagementError) return error.code;
	if (error instanceof z.ZodError || error instanceof SyntaxError)
		return "configuration";
	if (error instanceof TypeError || error instanceof DOMException)
		return "network";
	return "unknown";
}
