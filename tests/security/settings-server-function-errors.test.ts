import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { settingsErrorMessage } from "#/features/settings/error-message";

describe("settings Server Function errors", () => {
	it("maps only reviewed asset codes and hides unknown messages", () => {
		expect(
			settingsErrorMessage({ code: "site_asset_storage_unavailable" }),
		).toBe("Site asset storage is unavailable");
		expect(settingsErrorMessage({ code: "site_asset_too_large" })).toBe(
			"The image is too large",
		);
		expect(settingsErrorMessage({ code: "site_asset_invalid" })).toBe(
			"The image content does not match its file type",
		);
		expect(settingsErrorMessage({ code: "site_logo_not_square" })).toBe(
			"The site logo must be square",
		);
		expect(
			settingsErrorMessage({
				code: "internal_error",
				message: "D1 token=secret",
			}),
		).toBe("Unable to save settings");
	});

	it("keeps raw Server Function messages out of the settings page", async () => {
		const page = await readFile(
			new URL("../../src/features/settings/pages/admin.tsx", import.meta.url),
			"utf8",
		);
		const server = await readFile(
			new URL("../../src/features/settings/server/admin.ts", import.meta.url),
			"utf8",
		);
		const assetServer = await readFile(
			new URL(
				"../../src/features/settings/server/site-asset.ts",
				import.meta.url,
			),
			"utf8",
		);
		const settingsServer = await readFile(
			new URL(
				"../../src/features/settings/server/system-settings.ts",
				import.meta.url,
			),
			"utf8",
		);
		const brand = await readFile(
			new URL(
				"../../src/features/settings/components/site-asset-field.tsx",
				import.meta.url,
			),
			"utf8",
		);

		expect(`${page}\n${brand}`).not.toContain("error.message");
		const serverBoundary = `${server}\n${settingsServer}\n${assetServer}`;
		for (const code of [
			"invalid_settings",
			"site_asset_storage_unavailable",
			"site_asset_too_large",
			"site_asset_invalid",
			"site_logo_not_square",
		])
			expect(serverBoundary).toContain(`"${code}"`);
	});
});
