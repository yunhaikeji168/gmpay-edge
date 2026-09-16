import { describe, expect, it } from "vitest";
import { normalizeRgba } from "#/components/pro/base/fields/color-picker/utils";

describe("Pro ColorPicker", () => {
	it("normalizes hex and alpha hex values to rgba", () => {
		expect(normalizeRgba("#0a141e")).toBe("rgba(10, 20, 30, 1)");
		expect(normalizeRgba("#0a141e59")).toBe("rgba(10, 20, 30, 0.35)");
	});

	it("keeps rgba values in the storage format", () => {
		expect(normalizeRgba("rgba(10, 20, 30, 0.35)")).toBe(
			"rgba(10, 20, 30, 0.35)",
		);
		expect(normalizeRgba("")).toBe("");
	});
});
