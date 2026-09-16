import { m } from "#/paraglide/messages";

export function settingsErrorMessage(error: unknown) {
	if (!error || typeof error !== "object" || !("code" in error))
		return m.settings_save_failed();
	switch (error.code) {
		case "site_asset_storage_unavailable":
			return m.settings_error_storage_unavailable();
		case "site_asset_too_large":
			return m.settings_error_asset_too_large();
		case "site_asset_invalid":
			return m.settings_error_asset_invalid();
		case "site_logo_not_square":
			return m.settings_site_logo_square();
		default:
			return m.settings_save_failed();
	}
}
