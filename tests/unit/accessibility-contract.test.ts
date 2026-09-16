import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("interactive accessibility contracts", () => {
	it("gives every directly rendered Switch an accessible name", async () => {
		for (const file of await tsxFiles(resolve("src"))) {
			const source = await readFile(file, "utf8");
			for (const match of source.matchAll(/<Switch\b[\s\S]*?\/>/g)) {
				expect(
					/aria-label=|\bid=/.test(match[0]),
					`${file}: Switch requires aria-label or a linked id`,
				).toBe(true);
			}
		}
	});

	it("gives icon-only application buttons a label or named tooltip", async () => {
		for (const file of await tsxFiles(resolve("src"))) {
			const source = await readFile(file, "utf8");
			for (const match of source.matchAll(
				/<(Button|ProButton)\b([^>]*size="icon(?:-[a-z]+)?"[^>]*)>([\s\S]*?)<\/\1>/g,
			)) {
				const contract = `${match[2]} ${match[3]}`;
				expect(
					/aria-label=|tooltip=|className="[^"]*sr-only/.test(contract),
					`${file}: icon button requires aria-label, tooltip, or sr-only text`,
				).toBe(true);
			}
		}
	});

	it("keeps global motion respectful of reduced-motion preferences", async () => {
		const source = await readFile(resolve("src/styles/global.css"), "utf8");
		expect(source).toContain("@media (prefers-reduced-motion: reduce)");
		expect(source).toContain("animation-duration: 0.01ms");
		expect(source).toContain("transition-duration: 0.01ms");
		expect(source).toContain("scroll-behavior: auto");
	});
});

async function tsxFiles(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map((entry) => {
			const path = resolve(directory, entry.name);
			return entry.isDirectory()
				? tsxFiles(path)
				: Promise.resolve(entry.name.endsWith(".tsx") ? [path] : []);
		}),
	);
	return nested.flat();
}
