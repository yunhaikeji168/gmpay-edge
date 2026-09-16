import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { toCrossJSONAsync } from "seroval";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { installationErrorMessage } from "#/features/installation/error-message";
import { DomainError } from "#/lib/domain-error";
import { m } from "#/paraglide/messages";
import {
	normalizeServerFunctionError,
	ServerFunctionError,
} from "#/server/server-function-errors";

const request = new Request("https://example.com/_serverFn/install");

describe("installation Server Function errors", () => {
	it.each([
		["already_installed", m.install_error_already_installed()],
		["invalid_input", m.install_error_invalid_input()],
		["email_required", m.install_error_invalid_input()],
		["password_too_short", m.install_error_invalid_input()],
	] as const)("maps reviewed code %s to localized copy", (code, message) => {
		expect(
			installationErrorMessage(new ServerFunctionError(code, 409, code)),
		).toBe(message);
	});

	it("normalizes install validation without submitted values", () => {
		const validation = z
			.object({ password: z.string().min(12) })
			.safeParse({ password: "secret" }).error;
		const normalized = normalizeServerFunctionError(validation, request);

		expect(normalized).toMatchObject({ code: "invalid_input", status: 400 });
		expect(installationErrorMessage(normalized)).toBe(
			m.install_error_invalid_input(),
		);
		expect(JSON.stringify(normalized)).not.toContain("secret");
	});

	it("hides database and runtime configuration details", () => {
		expect(
			installationErrorMessage(
				new Error("D1_ERROR: INSERT runtime.better_auth_secret=unsafe"),
			),
		).toBe(m.install_failed());
	});

	it("serializes the already-installed conflict without a stack", async () => {
		const error = normalizeServerFunctionError(
			new DomainError(
				"already_installed",
				409,
				"System has already been installed",
			),
			request,
		);
		const serialized = JSON.stringify(
			await toCrossJSONAsync(error, { refs: new Map(), plugins: [] }),
		);

		expect(serialized).toContain("already_installed");
		expect(serialized).not.toMatch(/stack|better_auth_secret|unsafe/);
	});

	it("does not render raw Error messages in the installation page", () => {
		const page = readFileSync(
			fileURLToPath(
				new URL(
					"../../src/features/installation/pages/install.tsx",
					import.meta.url,
				),
			),
			"utf8",
		);

		expect(page).toContain("installationErrorMessage(error)");
		expect(page).not.toContain("error.message");
	});
});
