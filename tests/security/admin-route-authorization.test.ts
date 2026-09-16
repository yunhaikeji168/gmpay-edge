import { beforeEach, describe, expect, it, vi } from "vitest";
import { systemPermission } from "#/features/access/system-rbac";

const getAdminBootstrapFn = vi.hoisted(() => vi.fn());

vi.mock("#/features/auth/server/session", () => ({ getAdminBootstrapFn }));
vi.mock("#/layouts/dashboard", () => ({ DashboardLayout: () => null }));

import { Route as AccessIndexRoute } from "#/routes/admin/access/index";
import { Route } from "#/routes/admin/route";

const enabledUser = {
	id: "restricted-user",
	name: "Restricted",
	email: "restricted@example.com",
	enabled: true,
	roles: ["restricted"],
	root: false,
};

describe("admin route authorization", () => {
	beforeEach(() => getAdminBootstrapFn.mockReset());

	it.each([
		["/admin/not-a-route", [systemPermission("dashboard", "read")]],
		["/admin/access/roles", [systemPermission("users", "read")]],
		["/admin/access", []],
	] as const)("fails closed for %s", async (pathname, permissions) => {
		getAdminBootstrapFn.mockResolvedValue({
			installed: true,
			access: { ...enabledUser, permissions },
		});

		await expect(runLoader(pathname)).rejects.toMatchObject({
			status: 307,
			options: { to: "/403" },
		});
	});

	it("admits and selects the default child from the same restricted authority", async () => {
		const permissions = [systemPermission("users", "read")];
		getAdminBootstrapFn.mockResolvedValue({
			installed: true,
			access: { ...enabledUser, permissions },
		});

		await expect(runLoader("/admin/access/users")).resolves.toMatchObject({
			systemAccess: { permissions },
		});
		await expect(
			(AccessIndexRoute.options.loader as (input: unknown) => Promise<unknown>)(
				{
					parentMatchPromise: Promise.resolve({
						loaderData: { systemAccess: { permissions } },
					}),
				} as never,
			),
		).rejects.toMatchObject(
			expect.objectContaining({
				options: { statusCode: 307, to: "/admin/access/users" },
			}),
		);
	});
});

function runLoader(pathname: string) {
	const loader = Route.options.loader;
	if (!loader) throw new Error("Admin route loader is missing");
	return (loader as (input: unknown) => Promise<unknown>)({
		location: { href: pathname, pathname },
	});
}
