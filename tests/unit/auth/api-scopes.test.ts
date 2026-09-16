import { describe, expect, it } from "vitest";
import {
	hasRequiredApiScope,
	parseApiScopes,
} from "#/features/api-keys/scopes";

describe("merchant API scopes", () => {
	it("checks CRUD scopes independently", () => {
		expect(hasRequiredApiScope(["orders:create"], "orders:create")).toBe(true);
		expect(hasRequiredApiScope(["orders:create"], "orders:update")).toBe(false);
		expect(hasRequiredApiScope(["orders:read"], "orders:read")).toBe(true);
	});

	it("rejects unknown scopes", () => {
		expect(hasRequiredApiScope(["orders:write"], "orders:create")).toBe(false);
		expect(hasRequiredApiScope(["orders:write"], "orders:update")).toBe(false);
		expect(hasRequiredApiScope(["orders:write"], "orders:read")).toBe(false);
		expect(hasRequiredApiScope(["*"], "assets:read")).toBe(true);
	});

	it("validates persisted scope JSON before authorization", () => {
		expect(parseApiScopes('["orders:create","orders:read"]')).toEqual([
			"orders:create",
			"orders:read",
		]);
		expect(parseApiScopes('{"0":"orders:create"}')).toBeNull();
		expect(parseApiScopes('["orders:create",1]')).toBeNull();
		expect(parseApiScopes("not-json")).toBeNull();
	});
});
