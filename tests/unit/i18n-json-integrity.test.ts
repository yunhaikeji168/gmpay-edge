import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { supportedLocales } from "#/lib/locales";

describe("Paraglide JSON source integrity", () => {
	it("does not silently shadow duplicate message keys", async () => {
		for (const locale of supportedLocales) {
			const source = await readFile(
				new URL(`../../messages/${locale}.json`, import.meta.url),
				"utf8",
			);
			const keys = [...source.matchAll(/^\s*"([^"]+)"\s*:/gm)].flatMap(
				(match) => (match[1] ? [match[1]] : []),
			);
			expect(new Set(keys).size, locale).toBe(keys.length);
		}
	});
});
