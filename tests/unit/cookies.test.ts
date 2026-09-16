// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { getCookie, setCookie } from "#/lib/cookies";

afterEach(() => {
	vi.unstubAllGlobals();
	setCookie("layout", "", 0);
});

describe("cookie helpers", () => {
	it("uses Cookie Store with the shared persistence policy", () => {
		const set = vi.fn(async () => undefined);
		vi.stubGlobal("cookieStore", { set });
		setCookie("layout", "collapsed", 60);
		expect(set).toHaveBeenCalledWith({
			name: "layout",
			value: "collapsed",
			path: "/",
			sameSite: "lax",
			expires: expect.any(Number),
		});
	});

	it("falls back to document.cookie and safely encodes values", () => {
		vi.stubGlobal("cookieStore", undefined);
		setCookie("layout", "side bar", 60);
		expect(document.cookie).toContain("layout=side%20bar");
		expect(getCookie("layout")).toBe("side bar");
	});
});
