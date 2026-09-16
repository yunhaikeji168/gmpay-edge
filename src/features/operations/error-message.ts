import { m } from "#/paraglide/messages";

export function operationsErrorMessage(error: unknown, fallback: () => string) {
	if (!error || typeof error !== "object" || !("code" in error))
		return fallback();
	switch (error.code) {
		case "already_running":
			return m.jobs_error_already_running();
		case "binding_unavailable":
			return m.jobs_error_binding_unavailable();
		default:
			return fallback();
	}
}
