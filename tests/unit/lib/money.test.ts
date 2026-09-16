import { describe, expect, it } from "vitest";
import {
	convertByRate,
	decimalToUnits,
	divideByRate,
	quantizeUnitsUp,
	unitsToDecimal,
} from "#/lib/money";

describe("money", () => {
	it("converts decimal strings without floating point", () => {
		expect(decimalToUnits("12.345678", 6)).toBe(12_345_678n);
		expect(unitsToDecimal(12_345_600n, 6)).toBe("12.3456");
	});
	it("rejects precision loss by default", () =>
		expect(() => decimalToUnits("1.0000001", 6)).toThrow(/precision/));
	it("rounds a quoted payment amount up", () =>
		expect(convertByRate("10.00", 2, "0.333333", 6, 6)).toBe("3.33333"));
	it("divides by a base-to-quote rate and rounds payment up", () =>
		expect(divideByRate("100.00", 2, "3.000000", 6, 6)).toBe("33.333334"));
	it("quantizes payment units upward without floating point", () => {
		expect(quantizeUnitsUp(14_925_374n, 6, 4)).toEqual({
			amountUnits: 14_925_400n,
			stepUnits: 100n,
		});
		expect(quantizeUnitsUp(123n, 2, 4)).toEqual({
			amountUnits: 123n,
			stepUnits: 1n,
		});
	});
});
