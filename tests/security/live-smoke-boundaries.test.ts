import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const smokeFiles = [
	"tests/e2e/chain-rpc-smoke.test.ts",
	"tests/e2e/provider-smoke.test.ts",
	"tests/e2e/telegram-smoke.test.ts",
] as const;

describe("live platform smoke boundaries", () => {
	it.each(smokeFiles)("keeps %s explicitly skipped", (file) => {
		const source = readFileSync(resolve(root, file), "utf8");

		expect(source.match(/\bdescribe\.skip\(/g)).toHaveLength(1);
		expect(source).not.toMatch(/\bdescribe(?:\.runIf|\.skipIf)?\(/);
	});
});
