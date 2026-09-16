import { describe, expect, it } from "vitest";
import { trustedOriginsFromAllowedHosts } from "#/features/auth/trusted-hosts";

describe("Better Auth trusted origins from Allowed Hosts", () => {
	it("derives secure custom origins and local development origins", () => {
		expect(
			trustedOriginsFromAllowedHosts([
				"PAY.EXAMPLE",
				"console.example:8443",
				"localhost:3000",
				"127.0.0.1:8787",
			]),
		).toEqual([
			"https://pay.example",
			"https://console.example:8443",
			"http://localhost:3000",
			"http://127.0.0.1:8787",
		]);
	});

	it("rejects schemes, paths, credentials and non-array values", () => {
		expect(
			trustedOriginsFromAllowedHosts([
				"https://pay.example",
				"pay.example/path",
				"user@pay.example",
				42,
			]),
		).toEqual([]);
		expect(trustedOriginsFromAllowedHosts("pay.example")).toEqual([]);
	});
});
