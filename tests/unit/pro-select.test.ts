import { describe, expect, it } from "vitest";
import {
	filterSelectOptions,
	shouldSearchSelectOptions,
} from "#/components/pro/base/fields/select";

describe("Pro Select search policy", () => {
	it("automatically searches large option sets", () => {
		expect(shouldSearchSelectOptions(11)).toBe(true);
		expect(shouldSearchSelectOptions(10)).toBe(false);
	});

	it("honors an explicit search setting", () => {
		expect(shouldSearchSelectOptions(2, true)).toBe(true);
		expect(shouldSearchSelectOptions(100, false)).toBe(false);
	});

	it("shows populated options and only reports an empty filtered result", () => {
		const options = [
			{ value: "USD", label: "USD · US Dollar", searchText: "US Dollar" },
			{ value: "CNY", label: "CNY · 人民币", searchText: "人民币" },
		];
		expect(filterSelectOptions(options, "")).toHaveLength(2);
		expect(filterSelectOptions(options, "人民币")).toEqual([options[1]]);
		expect(filterSelectOptions(options, "EUR")).toEqual([]);
	});
});
