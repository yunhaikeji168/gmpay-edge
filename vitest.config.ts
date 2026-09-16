import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
		// Miniflare-backed D1 suites must not start concurrently; parallel
		// isolates contend for the local runtime and produce nondeterministic
		// hook/test timeouts. Test files remain independently runnable.
		fileParallelism: false,
		coverage: { reporter: ["text", "json"] },
	},
});
