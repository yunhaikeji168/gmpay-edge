import { describe, expect, it } from "vitest";
import { safePostAuthRedirect } from "#/features/auth/post-auth-redirect";

describe("post-auth redirect", () => {
	it("preserves same-origin paths and their search and hash", () => {
		expect(safePostAuthRedirect("/admin/orders?page=2#latest")).toBe(
			"/admin/orders?page=2#latest",
		);
	});

	it.each([
		undefined,
		"admin",
		"//evil.example",
		"/\\evil.example",
		"/%5cevil.example",
		"https://evil.example/admin",
		"http://gmpay.invalid/admin",
	])("falls back for unsafe redirect %s", (value) => {
		expect(safePostAuthRedirect(value)).toBe("/admin");
	});
});
