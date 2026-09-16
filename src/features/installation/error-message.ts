import { m } from "#/paraglide/messages";

export function installationErrorMessage(error: unknown) {
	if (!error || typeof error !== "object" || !("code" in error))
		return m.install_failed();
	switch (error.code) {
		case "already_installed":
			return m.install_error_already_installed();
		case "invalid_input":
		case "email_required":
		case "password_too_short":
			return m.install_error_invalid_input();
		default:
			return m.install_failed();
	}
}
