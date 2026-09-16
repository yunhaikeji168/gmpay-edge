import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
	changePasswordErrorMessage,
	signInErrorMessage,
	twoFactorManagementErrorMessage,
	twoFactorVerificationErrorMessage,
} from "#/features/auth/error-message";
import { m } from "#/paraglide/messages";

describe("Better Auth error presentation", () => {
	it.each([
		["INVALID_EMAIL_OR_PASSWORD", m.auth_error_invalid_credentials()],
		["EMAIL_NOT_VERIFIED", m.auth_error_email_not_verified()],
	] as const)("maps reviewed sign-in code %s", (code, message) => {
		expect(signInErrorMessage({ code })).toBe(message);
	});

	it.each([
		["INVALID_CODE", m.auth_error_invalid_two_factor_code()],
		["INVALID_BACKUP_CODE", m.auth_error_invalid_backup_code()],
		["ACCOUNT_TEMPORARILY_LOCKED", m.auth_error_two_factor_locked()],
		["INVALID_TWO_FACTOR_COOKIE", m.auth_error_session_expired()],
	] as const)("maps reviewed verification code %s", (code, message) => {
		expect(twoFactorVerificationErrorMessage({ code })).toBe(message);
	});

	it.each([
		["INVALID_PASSWORD", m.auth_error_current_password_invalid()],
		["TOTP_NOT_ENABLED", m.auth_error_two_factor_unavailable()],
		["SESSION_EXPIRED", m.auth_error_session_expired()],
	] as const)("maps reviewed account-security code %s", (code, message) => {
		expect(twoFactorManagementErrorMessage({ code })).toBe(message);
	});

	it.each([
		["INVALID_PASSWORD", m.auth_error_current_password_invalid()],
		["PASSWORD_TOO_SHORT", m.account_change_password_new_password_required()],
		["PASSWORD_TOO_LONG", m.auth_error_password_too_long()],
		["CREDENTIAL_ACCOUNT_NOT_FOUND", m.auth_error_password_unavailable()],
	] as const)("maps reviewed password code %s", (code, message) => {
		expect(changePasswordErrorMessage({ code })).toBe(message);
	});

	it("never presents an unknown Better Auth or transport message", () => {
		const secret = {
			code: "UNKNOWN_PROVIDER_FAILURE",
			message: "token=secret; SELECT password FROM accounts",
		};

		expect(signInErrorMessage(secret)).toBe(m.auth_signInFailed());
		expect(twoFactorVerificationErrorMessage(secret)).toBe(
			m.auth_two_factor_failed(),
		);
		expect(twoFactorManagementErrorMessage(secret)).toBe(
			m.account_two_factor_failed(),
		);
		expect(changePasswordErrorMessage(secret)).toBe(
			m.account_change_password_failed(),
		);
	});

	it("keeps provider messages out of every auth account UI", async () => {
		const sources = await Promise.all(
			[
				"../../src/features/auth/pages/two-factor.tsx",
				"../../src/features/auth/components/user-auth-form.tsx",
				"../../src/layouts/components/two-factor-dialog.tsx",
				"../../src/layouts/components/change-password-dialog.tsx",
			].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
		);

		for (const source of sources) {
			expect(source).not.toContain("error.message");
			expect(source).not.toContain("result.error.message");
		}
	});
});
