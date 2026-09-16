import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("root provider boundaries", () => {
	it("renders theme consumers inside ThemeProvider", () => {
		const source = readFileSync(
			resolve(import.meta.dirname, "../../src/routes/__root.tsx"),
			"utf8",
		);
		const providerStart = source.indexOf("<ThemeProvider>");
		const toaster = source.indexOf("<Toaster");
		const providerEnd = source.indexOf("</ThemeProvider>");

		expect(providerStart).toBeGreaterThan(-1);
		expect(toaster).toBeGreaterThan(providerStart);
		expect(providerEnd).toBeGreaterThan(toaster);
	});

	it("hydrates browser preferences after the SSR-compatible first frame", () => {
		const store = readFileSync(
			resolve(import.meta.dirname, "../../src/stores/preferences-store.ts"),
			"utf8",
		);
		const provider = readFileSync(
			resolve(import.meta.dirname, "../../src/context/theme-provider.tsx"),
			"utf8",
		);
		expect(store).toContain("theme: defaultTheme");
		expect(store).not.toContain("initialPreferences()");
		expect(provider).toContain(
			"useEffect(() => preferencesStore.actions.hydrate(), []);",
		);
	});
});
