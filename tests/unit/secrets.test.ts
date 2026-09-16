import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "#/lib/secrets";

describe("secret encryption", () => {
	it("decrypts ciphertext with the configured integration secret", async () => {
		const encrypted = await encryptSecret(
			"provider-credential",
			"integration-secret",
		);

		await expect(decryptSecret(encrypted, "integration-secret")).resolves.toBe(
			"provider-credential",
		);
	});
});
