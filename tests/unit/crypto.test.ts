import { describe, expect, it } from "vitest";
import { constantTimeEqual } from "#/lib/crypto";

describe("constantTimeEqual", () => {
	it("compares equal and unequal UTF-8 values", () => {
		expect(constantTimeEqual("secret-密钥", "secret-密钥")).toBe(true);
		expect(constantTimeEqual("secret-密钥", "secret-密钥x")).toBe(false);
		expect(constantTimeEqual("secret-密钥", "secret-令牌")).toBe(false);
	});
});
