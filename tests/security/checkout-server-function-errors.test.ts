import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { PaymentOptionError } from "#/features/checkout/server/payment-options";
import { DomainError } from "#/lib/domain-error";
import { normalizeServerFunctionError } from "#/server/server-function-errors";

const request = new Request("https://example.com/_serverFn/checkout");

describe("checkout Server Function error boundary", () => {
	it.each([
		["order_not_found", 404],
		["payment_snapshot_immutable", 409],
		["order_unavailable", 409],
		["receiving_method_not_ready", 409],
		["payment_option_unavailable", 409],
		["rate_unavailable", 409],
	] as const)("preserves reviewed payment option code %s", (code, status) => {
		expect(
			normalizeServerFunctionError(
				new PaymentOptionError(code, status),
				request,
			),
		).toMatchObject({ code, status });
	});

	it("preserves checkout availability without exposing binding details", () => {
		expect(
			normalizeServerFunctionError(
				new DomainError("checkout_unavailable", 503, "Checkout is unavailable"),
				request,
			),
		).toMatchObject({
			code: "checkout_unavailable",
			status: 503,
			message: "Checkout is unavailable",
		});
	});

	it("keeps unknown D1 and provider details generic", () => {
		expect(
			normalizeServerFunctionError(
				new Error("D1_ERROR: SELECT secret; provider token=unsafe"),
				request,
			),
		).toMatchObject({
			code: "internal_error",
			status: 500,
			message: "Internal server error",
		});
	});

	it("uses reviewed generic checkout copy instead of raw error text", () => {
		const page = readFileSync(
			fileURLToPath(
				new URL(
					"../../src/features/checkout/pages/checkout.tsx",
					import.meta.url,
				),
			),
			"utf8",
		);
		expect(page).not.toContain("error.message");
		expect(page).toContain("m.checkout_payment_option_failed()");
		expect(page).toContain("m.common_request_failed()");
	});
});
