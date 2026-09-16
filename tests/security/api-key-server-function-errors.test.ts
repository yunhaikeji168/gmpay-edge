import { describe, expect, it } from "vitest";

import { apiKeyErrorMessage } from "#/features/api-keys/error-message";
import { m } from "#/paraglide/messages";
import { ServerFunctionError } from "#/server/server-function-errors";

describe("API key Server Function error presentation", () => {
	it.each([
		["api_key_not_found", m.api_keys_error_not_found()],
		["api_key_revoked", m.api_keys_error_revoked()],
		["api_key_pepper_not_configured", m.api_keys_error_pepper_not_configured()],
	] as const)("maps reviewed code %s to localized copy", (code, message) => {
		expect(apiKeyErrorMessage(new ServerFunctionError(code, 409, code))).toBe(
			message,
		);
	});

	it("does not show database, pepper, or secret details", () => {
		expect(
			apiKeyErrorMessage(
				new Error("D1_ERROR: SELECT secret_encrypted; pepper=unsafe"),
			),
		).toBe(m.api_keys_operation_failed());
	});
});
