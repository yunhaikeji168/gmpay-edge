import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ModuleNavigation } from "#/layouts/settings/module-navigation";
import { m } from "#/paraglide/messages";
export const Route = createFileRoute("/admin/operations")({
	loader: async ({ parentMatchPromise }) =>
		(await parentMatchPromise).loaderData,
	component: Layout,
});
function Layout() {
	return (
		<ModuleNavigation
			moduleId="operations"
			title={m.nav_operations_center()}
			description={m.operations_description()}
		>
			<Outlet />
		</ModuleNavigation>
	);
}
