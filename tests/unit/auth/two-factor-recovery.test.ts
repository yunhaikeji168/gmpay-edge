import { describe, expect, it } from "vitest";
import { formatBackupCodes } from "#/layouts/components/two-factor-dialog";

describe("two-factor recovery codes", () => {
	it("exports one code per line with a trailing newline", () => {
		expect(formatBackupCodes(["alpha", "beta"])).toBe("alpha\nbeta\n");
	});

	it("handles an empty recovery-code set safely", () => {
		expect(formatBackupCodes([])).toBe("\n");
	});
});
