import { reconcilePaymentInfrastructure } from "#/features/installation/server/reconcile-payment-infrastructure";
import { manualScheduledTaskNames } from "#/features/operations/schedule";
import { runTrackedTask } from "#/features/operations/server/task-runs";
import { refreshEnabledPaymentConnectionHealth } from "#/features/payment-settings/server/connection-health";
import { refreshExchangeRates } from "#/features/payment-settings/server/exchange-rates";
import { expireOrders } from "#/features/payments/server/expiration";
import {
	assertWebhookOutboxRecovered,
	recoverWebhookOutbox,
} from "#/features/webhooks/server/outbox";
import { DomainError } from "#/lib/domain-error";
import { redactAuditValue } from "#/server/audit-redaction";

export const operationsTasks = manualScheduledTaskNames;
export type OperationsTask = (typeof operationsTasks)[number];
export type OperationsTaskPayload =
	| { expired: number }
	| { queued: number; failed: number }
	| { checked: number; healthy: number; unhealthy: number }
	| Awaited<ReturnType<typeof refreshExchangeRates>>
	| Awaited<ReturnType<typeof reconcilePaymentInfrastructure>>;
export type OperationsTaskRunResult = {
	task: OperationsTask;
	result: OperationsTaskPayload;
	completedAt: string;
};

type OperationsTaskDependencies = {
	expire: typeof expireOrders;
	recoverWebhooks: typeof recoverWebhookOutbox;
	refreshRpc: typeof refreshEnabledPaymentConnectionHealth;
	refreshRates: typeof refreshExchangeRates;
	reconcilePaymentDefaults: typeof reconcilePaymentInfrastructure;
};

const defaults: OperationsTaskDependencies = {
	expire: expireOrders,
	recoverWebhooks: recoverWebhookOutbox,
	refreshRpc: refreshEnabledPaymentConnectionHealth,
	refreshRates: refreshExchangeRates,
	reconcilePaymentDefaults: reconcilePaymentInfrastructure,
};

type RunOperationsTaskInput = {
	task: OperationsTask;
	actorUserId: string;
	requestId?: string | null;
	ipAddress?: string | null;
	now?: number;
};

export async function runOperationsTask(
	env: Env,
	input: RunOperationsTaskInput,
	dependencies: OperationsTaskDependencies = defaults,
) {
	return runTrackedTask(
		env.DB,
		{
			task: input.task,
			trigger: "manual",
			...(input.now === undefined ? {} : { now: input.now }),
		},
		() => runOperationsTaskCore(env, input, dependencies),
	);
}

async function runOperationsTaskCore(
	env: Env,
	input: RunOperationsTaskInput,
	dependencies: OperationsTaskDependencies = defaults,
): Promise<OperationsTaskRunResult> {
	const now = input.now ?? Date.now();
	let result: OperationsTaskPayload;
	try {
		if (input.task === "order_expiration") {
			result = { expired: await dependencies.expire(env, now) };
		} else if (input.task === "webhook_outbox") {
			if (!env.WEBHOOK_QUEUE)
				throw new DomainError(
					"binding_unavailable",
					503,
					"Webhook Queue binding is unavailable",
				);
			result = await dependencies.recoverWebhooks(env, now);
			assertWebhookOutboxRecovered(result);
		} else if (input.task === "rpc_health") {
			result = await dependencies.refreshRpc(env.DB);
		} else if (
			input.task === "crypto_rate_sync" ||
			input.task === "fiat_rate_sync"
		) {
			result = await dependencies.refreshRates(env.DB, fetch, now, {
				category: input.task === "crypto_rate_sync" ? "crypto" : "fiat",
				actorUserId: input.actorUserId,
				requestId: input.requestId ?? null,
				ipAddress: input.ipAddress ?? null,
			});
		} else {
			result = await dependencies.reconcilePaymentDefaults(env.DB, now);
		}
	} catch (error) {
		await env.DB.prepare(
			`INSERT INTO audit_logs
			(id, actor_user_id, action, target_type, target_id, request_id, ip_address, after, created_at)
			VALUES (?, ?, 'operations.task_failed', 'operations_task', ?, ?, ?, ?, ?)`,
		)
			.bind(
				crypto.randomUUID(),
				input.actorUserId,
				input.task,
				input.requestId ?? null,
				input.ipAddress ?? null,
				JSON.stringify({ code: operationsErrorCode(error) }),
				now,
			)
			.run();
		throw error;
	}
	await env.DB.prepare(
		`INSERT INTO audit_logs
		(id, actor_user_id, action, target_type, target_id, request_id, ip_address, after, created_at)
		VALUES (?, ?, 'operations.task_run', 'operations_task', ?, ?, ?, ?, ?)`,
	)
		.bind(
			crypto.randomUUID(),
			input.actorUserId,
			input.task,
			input.requestId ?? null,
			input.ipAddress ?? null,
			JSON.stringify(redactAuditValue(result)),
			now,
		)
		.run();
	return {
		task: input.task,
		result,
		completedAt: new Date(now).toISOString(),
	};
}

function operationsErrorCode(error: unknown) {
	if (error instanceof DomainError) return error.code;
	return "task_error";
}
