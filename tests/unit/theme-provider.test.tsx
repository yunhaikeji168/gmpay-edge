import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ThemeProvider, useTheme } from "#/context/theme-provider";

describe("ThemeProvider", () => {
	it("fails clearly when the hook is used outside its owner", () => {
		expect(() => renderToString(<ThemeValue />)).toThrow(
			"useTheme must be used within a ThemeProvider",
		);
	});

	it("provides the shared preference state without fallback no-op actions", () => {
		expect(
			renderToString(
				<ThemeProvider>
					<ThemeValue />
				</ThemeProvider>,
			),
		).toContain("auto:noto:light");
	});
});

function ThemeValue() {
	const { font, resolvedTheme, theme } = useTheme();
	return <span>{`${theme}:${font}:${resolvedTheme}`}</span>;
}
