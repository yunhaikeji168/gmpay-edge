import { describe, expect, it } from "vitest";
import { parseReceivingProviderConfiguration } from "#/features/payment-settings/server/provider-config";

describe("receiving provider configuration", () => {
	it("separates Binance UID from its encrypted credentials", () => {
		expect(
			parseReceivingProviderConfiguration("binance", {
				receiverUid: "34355667",
				apiKey: "api-key",
				secretKey: "secret-key",
			}),
		).toEqual({
			targetType: "account",
			targetField: "receiverUid",
			targetValue: "34355667",
			credentials: { apiKey: "api-key", secretKey: "secret-key" },
		});
	});

	it("requires the complete provider-specific credential set", () => {
		expect(() =>
			parseReceivingProviderConfiguration("okx", {
				accountUid: "888777",
				apiKey: "api-key",
				secretKey: "secret-key",
			}),
		).toThrow(
			expect.objectContaining({
				code: "receiving_method_configuration_required",
				status: 422,
			}),
		);
		expect(() =>
			parseReceivingProviderConfiguration("okpay", {
				shopId: "merchant",
				apiKey: "api-key",
			}),
		).toThrow(
			expect.objectContaining({
				code: "receiving_method_configuration_required",
				status: 422,
			}),
		);
		expect(() => parseReceivingProviderConfiguration("tron", {})).toThrow(
			expect.objectContaining({
				code: "receiving_method_configuration_required",
				status: 422,
			}),
		);
	});
});
