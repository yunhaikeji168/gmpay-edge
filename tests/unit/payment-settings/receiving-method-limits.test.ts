import { describe, expect, it } from "vitest";
import { parseReceivingUsdLimits } from "#/features/payment-settings/receiving-method-limits";

describe("receiving method amount limits", () => {
	it("converts operator-facing decimals to immutable atomic limits", () => {
		expect(parseReceivingUsdLimits("0.5", "125.25")).toEqual({
			min: 50n,
			max: 12_525n,
		});
	});

	it("supports open bounds and rejects inverted or over-precision values", () => {
		expect(parseReceivingUsdLimits(undefined, "10")).toEqual({
			min: null,
			max: 1_000n,
		});
		expect(() => parseReceivingUsdLimits("10.01", "10")).toThrow(
			expect.objectContaining({
				code: "receiving_method_invalid_limits",
				status: 422,
			}),
		);
		expect(() => parseReceivingUsdLimits("0.001", undefined)).toThrow();
	});
});
