import { describe, expect, it } from "vitest";
import { currencyDecimals, decimalToMinor, minorToDecimal } from "#/lib/units";

describe("base unit contract", () => {
	it("stores fiat amounts in each currency's minor unit", () => {
		expect(currencyDecimals("CNY")).toBe(2);
		expect(currencyDecimals("JPY")).toBe(0);
		expect(currencyDecimals("KWD")).toBe(3);
		expect(decimalToMinor("10.25", 2)).toBe(1025n);
		expect(minorToDecimal("1025", 2)).toBe("10.25");
	});

	it("rejects precision that cannot be represented by the currency", () => {
		expect(() => decimalToMinor("10.001", 2)).toThrow(
			"Amount exceeds supported precision",
		);
	});
});
