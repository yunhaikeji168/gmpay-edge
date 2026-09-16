import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Cloudflare static asset headers", () => {
	it("caches only fingerprinted Vite assets as immutable", async () => {
		const headers = await readFile(
			new URL("../../public/_headers", import.meta.url),
			"utf8",
		);

		expect(headers).toBe(
			"/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n",
		);
		expect(headers.split("\n")).not.toContain("/*");
	});

	it("uses the Cloudflare Vite asset pipeline", async () => {
		const viteConfig = await readFile(
			new URL("../../vite.config.ts", import.meta.url),
			"utf8",
		);
		expect(viteConfig).toContain("cloudflare({ viteEnvironment");
	});
});
