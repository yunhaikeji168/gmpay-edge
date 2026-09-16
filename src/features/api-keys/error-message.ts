import { m } from "#/paraglide/messages";

export function apiKeyErrorMessage(error: unknown) {
	if (!error || typeof error !== "object" || !("code" in error))
		return m.api_keys_operation_failed();
	switch (error.code) {
		case "api_key_not_found":
			return m.api_keys_error_not_found();
		case "api_key_revoked":
			return m.api_keys_error_revoked();
		case "api_key_pepper_not_configured":
			return m.api_keys_error_pepper_not_configured();
		default:
			return m.api_keys_operation_failed();
	}
}
