import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ModuleNavigation } from "#/layouts/settings/module-navigation";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute("/admin/telegram")({
	component: Layout,
});
function Layout() {
	return (
		<ModuleNavigation
			moduleId="telegram"
			title={m.telegram_title()}
			description={m.telegram_description()}
		>
			<Outlet />
		</ModuleNavigation>
	);
}
