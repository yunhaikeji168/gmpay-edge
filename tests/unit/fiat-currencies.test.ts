import { describe, expect, it } from "vitest";
import { fiatCurrencyCodes, fiatCurrencyOptions } from "#/lib/fiat-currencies";

describe("fiat currency catalog", () => {
	it("contains a unique, sorted ISO 4217 customer currency catalog", () => {
		expect(fiatCurrencyCodes.length).toBeGreaterThan(140);
		expect(new Set(fiatCurrencyCodes).size).toBe(fiatCurrencyCodes.length);
		expect([...fiatCurrencyCodes]).toEqual([...fiatCurrencyCodes].sort());
		expect(fiatCurrencyCodes).toContain("USD");
		expect(fiatCurrencyCodes).toContain("CNY");
		expect(fiatCurrencyCodes).toContain("TWD");
	});

	it("builds localized searchable labels", () => {
		const usd = fiatCurrencyOptions("zh-CN").find(
			(option) => option.value === "USD",
		);
		expect(usd?.label).toContain("USD");
		expect(usd?.searchText).not.toBe("USD");
	});
});
