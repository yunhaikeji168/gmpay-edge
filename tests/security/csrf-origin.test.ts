import { isCsrfRequestAllowed } from "@tanstack/react-start";
import { describe, expect, it } from "vitest";

describe("TanStack server-function CSRF policy", () => {
	it("accepts a same-origin request", async () => {
		await expect(allowed({ Origin: "https://pay.example" })).resolves.toBe(
			true,
		);
	});

	it("rejects a cross-origin request in every environment", async () => {
		await expect(allowed({ Origin: "https://attacker.example" })).resolves.toBe(
			false,
		);
		await expect(allowed({ "Sec-Fetch-Site": "cross-site" })).resolves.toBe(
			false,
		);
	});

	it("rejects state-changing requests without origin evidence", async () => {
		await expect(allowed({})).resolves.toBe(false);
	});
});

function allowed(headers: Record<string, string>) {
	return isCsrfRequestAllowed({}, {
		request: new Request("https://pay.example/_server", {
			method: "POST",
			headers,
		}),
	} as never);
}
