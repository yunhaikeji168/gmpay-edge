import { runMaintenance } from "#/server/scheduled/maintenance";

export { runMaintenance };

export function handleScheduled(
	controller: ScheduledController,
	env: Env,
	context: ExecutionContext,
): void {
	context.waitUntil(
		runMaintenance(env, controller.cron, undefined, controller.scheduledTime),
	);
}
