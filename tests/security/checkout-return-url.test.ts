import { describe, expect, it } from "vitest";
import {
	safeCheckoutReturnUrl,
	safeHostedPaymentUrl,
} from "#/features/checkout/checkout-model";

describe("checkout return URLs", () => {
	it("accepts only credential-free HTTPS URLs", () => {
		expect(safeCheckoutReturnUrl("https://merchant.example/paid?order=1")).toBe(
			"https://merchant.example/paid?order=1",
		);
		expect(safeCheckoutReturnUrl("http://merchant.example/paid")).toBeNull();
		expect(safeCheckoutReturnUrl("javascript:alert(1)")).toBeNull();
		expect(
			safeCheckoutReturnUrl("https://user:secret@merchant.example/paid"),
		).toBeNull();
		expect(safeCheckoutReturnUrl("not a URL")).toBeNull();
	});
});

describe("hosted payment URL validation", () => {
	it("allows credential-free HTTPS provider URLs", () => {
		expect(safeHostedPaymentUrl("https://pay.example/order/123")).toBe(
			"https://pay.example/order/123",
		);
	});

	it("rejects executable, insecure, and credential-bearing URLs", () => {
		expect(safeHostedPaymentUrl("javascript:alert(1)")).toBeNull();
		expect(safeHostedPaymentUrl("http://pay.example/order/123")).toBeNull();
		expect(
			safeHostedPaymentUrl("https://user:pass@pay.example/order"),
		).toBeNull();
	});
});
