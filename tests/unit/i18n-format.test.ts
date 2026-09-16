import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatDateTime } from "#/lib/format";

describe("locale-aware presentation formatting", () => {
	it("formats the same instant with the selected application locale", () => {
		const instant = "2026-07-12T08:30:45.000Z";
		expect(formatDateTime(instant, "en-US")).toBe(
			new Intl.DateTimeFormat("en-US", {
				dateStyle: "medium",
				timeStyle: "medium",
			}).format(new Date(instant)),
		);
		expect(formatDateTime(instant, "zh-CN")).not.toBe(
			formatDateTime(instant, "en-US"),
		);
		expect(formatDateTime(instant, "en-US", "UTC")).toBe(
			new Intl.DateTimeFormat("en-US", {
				dateStyle: "medium",
				timeStyle: "medium",
				timeZone: "UTC",
			}).format(new Date(instant)),
		);
		expect(formatDateTime("invalid", "zh-TW")).toBe("—");
	});

	it("does not fall back to the browser locale in application pages", async () => {
		const sourceRoot = new URL("../../src", import.meta.url).pathname;
		const files = await sourceFiles(sourceRoot);
		const violations: string[] = [];
		for (const file of files) {
			const source = await readFile(file, "utf8");
			if (/\.toLocale(?:Date|Time)?String\(\s*\)/.test(source))
				violations.push(file.replace(`${sourceRoot}/`, ""));
		}
		expect(violations).toEqual([]);
	});
});

async function sourceFiles(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) {
				if (entry.name === "paraglide") return [];
				return sourceFiles(path);
			}
			return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
		}),
	);
	return files.flat();
}
