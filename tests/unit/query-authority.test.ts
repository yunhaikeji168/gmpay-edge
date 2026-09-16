import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("shared query authority", () => {
	it("uses one cache authority for system access across roles and users", async () => {
		const query = await readFile(
			new URL("../../src/features/access/queries.ts", import.meta.url),
			"utf8",
		);
		const roles = await readFile(
			new URL("../../src/features/access/pages/admin.tsx", import.meta.url),
			"utf8",
		);
		const users = await readFile(
			new URL("../../src/features/users/pages/admin-list.tsx", import.meta.url),
			"utf8",
		);

		expect(query).toContain(
			'export const systemAccessQueryKey = ["admin", "system-access"] as const',
		);
		expect(query).toContain("staleTime: 5 * 60_000");
		expect(roles).toContain("useQuery(systemAccessQueryOptions)");
		expect(users).toContain("useQuery(systemAccessQueryOptions)");
		expect(users).not.toContain("roles-for-users");
		expect(users).toContain(
			"queryClient.invalidateQueries({ queryKey: systemAccessQueryKey })",
		);
	});
});
