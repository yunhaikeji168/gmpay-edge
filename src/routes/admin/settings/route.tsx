import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ModuleNavigation } from "#/layouts/settings/module-navigation";
import { m } from "#/paraglide/messages";
export const Route = createFileRoute("/admin/settings")({ component: Layout });
function Layout() {
	return (
		<ModuleNavigation
			moduleId="settings"
			title={m.system_nav_settings()}
			description={m.settings_system_layout_description()}
		>
			<Outlet />
		</ModuleNavigation>
	);
}
