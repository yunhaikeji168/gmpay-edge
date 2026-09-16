import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ModuleNavigation } from "#/layouts/settings/module-navigation";
import { validateProTableSearch } from "#/lib/pro-table-url-state";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute("/admin/payment-settings")({
	validateSearch: validateProTableSearch,
	component: () => (
		<ModuleNavigation
			moduleId="payment-settings"
			title={m.nav_payment_settings()}
			description={m.payment_settings_description()}
		>
			<Outlet />
		</ModuleNavigation>
	),
});
