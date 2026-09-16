import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
	AmbiguousSignatureParametersError,
	gmpaySignaturePayload,
	signEpayParameters,
	signGmpayParameters,
	verifyEpaySignature,
	verifyGmpaySignature,
} from "#/features/api-keys/server/gmpay-signature";

describe("GMPay HMAC-SHA256 parameter signatures", () => {
	it("matches the EPUSDT GMPay sorted non-empty parameter algorithm", () => {
		const parameters = {
			pid: "gmp_merchant",
			order_id: "ORDER-1001",
			currency: "cny",
			token: "usdt",
			network: "tron",
			amount: 100,
			notify_url: "https://merchant.example/notify",
			redirect_url: "",
			name: null,
			signature: "must-not-participate",
		};
		expect(gmpaySignaturePayload(parameters)).toBe(
			"amount=100&currency=cny&network=tron&notify_url=https://merchant.example/notify&order_id=ORDER-1001&pid=gmp_merchant&token=usdt",
		);
		expect(signGmpayParameters(parameters, "merchant-secret")).toBe(
			"c6e53cbcc50ed62160c4e9689bb5d266376baa2b15a2c054db88350f2f20f4b3",
		);
	});

	it("verifies exact lowercase signatures and includes optional fields", () => {
		const parameters = {
			pid: "gmp_merchant",
			order_id: "ORDER-1002",
			amount: "12.50",
			payment_type: "Gmpay",
		};
		const signature = signGmpayParameters(parameters, "merchant-secret");
		expect(
			verifyGmpaySignature(
				{ ...parameters, signature },
				"merchant-secret",
				signature,
			),
		).toBe(true);
		expect(
			verifyGmpaySignature(
				{ ...parameters, payment_type: "Epay", signature },
				"merchant-secret",
				signature,
			),
		).toBe(false);
	});

	it("keeps EPay on its legacy MD5 contract", () => {
		const parameters = {
			pid: "1000",
			money: "12.50",
			out_trade_no: "EPAY-1001",
			sign_type: "MD5",
		};
		const signature = signEpayParameters(parameters, "merchant-secret");
		expect(signature).toMatch(/^[0-9a-f]{32}$/);
		expect(
			verifyEpaySignature(
				{ ...parameters, sign: signature },
				"merchant-secret",
				signature,
			),
		).toBe(true);
		expect(verifyGmpaySignature(parameters, "merchant-secret", signature)).toBe(
			false,
		);
	});

	it("rejects both interpretations of the legacy callback-destination collision", () => {
		const original = {
			pid: "1000",
			money: "12.50",
			out_trade_no: "SECURITY-1",
			name: "item&notify_url=https://receiver.example/hook",
			notify_url: "https://merchant.example/hook",
		};
		const altered = {
			...original,
			name: "item",
			notify_url:
				"https://receiver.example/hook&notify_url=https://merchant.example/hook",
		};
		const legacy = (parameters: object) =>
			Object.entries(parameters)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([key, value]) => `${key}=${value}`)
				.join("&");
		expect(legacy(original)).toBe(legacy(altered));
		const epay = createHash("md5")
			.update(`${legacy(original)}secret`)
			.digest("hex");
		const gmpay = createHmac("sha256", "secret")
			.update(legacy(original))
			.digest("hex");
		for (const parameters of [original, altered]) {
			expect(verifyEpaySignature(parameters, "secret", epay)).toBe(false);
			expect(verifyGmpaySignature(parameters, "secret", gmpay)).toBe(false);
			expect(() => signEpayParameters(parameters, "secret")).toThrow(
				AmbiguousSignatureParametersError,
			);
		}
	});

	it("allows literal ampersands and equals without field boundaries, but rejects injected keys", () => {
		const parameters = {
			name: "Tea & Coffee = good",
			notify_url: "https://merchant.example/hook?source=shop",
		};
		const signature = signGmpayParameters(parameters, "secret");
		expect(verifyGmpaySignature(parameters, "secret", signature)).toBe(true);
		expect(
			verifyGmpaySignature({ "a=b&c": "value" }, "secret", signature),
		).toBe(false);
	});
});
