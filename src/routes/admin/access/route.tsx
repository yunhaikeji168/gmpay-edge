import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ModuleNavigation } from "#/layouts/settings/module-navigation";
import { m } from "#/paraglide/messages";
export const Route = createFileRoute("/admin/access")({
	loader: async ({ parentMatchPromise }) =>
		(await parentMatchPromise).loaderData,
	component: Layout,
});
function Layout() {
	return (
		<ModuleNavigation
			moduleId="access"
			title={m.nav_user_access()}
			description={m.access_description()}
		>
			<Outlet />
		</ModuleNavigation>
	);
}
