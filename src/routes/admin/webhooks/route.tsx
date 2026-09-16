import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ModuleNavigation } from "#/layouts/settings/module-navigation";
import { m } from "#/paraglide/messages";
export const Route = createFileRoute("/admin/webhooks")({ component: Layout });
function Layout() {
	return (
		<ModuleNavigation
			moduleId="webhooks"
			title={m.system_nav_webhooks()}
			description={m.webhooks_description()}
		>
			<Outlet />
		</ModuleNavigation>
	);
}
