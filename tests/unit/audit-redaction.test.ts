import { describe, expect, it } from "vitest";
import {
	redactAuditValue,
	redactSerializedAuditValue,
} from "#/server/audit-redaction";

describe("audit redaction", () => {
	it("redacts nested sensitive fields without removing safe context", () => {
		expect(
			redactAuditValue({
				name: "RPC",
				apiKey: "secret-a",
				credentials: "serialized-provider-credentials",
				configEncrypted: "ciphertext-value",
				nested: {
					password: "secret-b",
					passphrase: "secret-passphrase",
					authorization: "Bearer secret-token",
					sessionCookie: "session=value",
					recoveryCodes: ["recovery-a", "recovery-b"],
					items: [
						{
							webhook_token: "secret-c",
							enabled: true,
							credentialsConfigured: true,
						},
					],
				},
			}),
		).toEqual({
			name: "RPC",
			apiKey: "[REDACTED]",
			credentials: "[REDACTED]",
			configEncrypted: "[REDACTED]",
			nested: {
				password: "[REDACTED]",
				passphrase: "[REDACTED]",
				authorization: "[REDACTED]",
				sessionCookie: "[REDACTED]",
				recoveryCodes: "[REDACTED]",
				items: [
					{
						webhook_token: "[REDACTED]",
						enabled: true,
						credentialsConfigured: true,
					},
				],
			},
		});
	});

	it("does not echo malformed legacy audit payloads", () => {
		expect(redactSerializedAuditValue("token=legacy-secret")).toBe(
			"[REDACTED_UNPARSEABLE]",
		);
	});
});
