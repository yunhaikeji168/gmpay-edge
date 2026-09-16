import { createFileRoute } from "@tanstack/react-router";
import { SystemSettingsSection } from "#/features/settings/pages/admin";
export const Route = createFileRoute("/admin/settings/payment")({
	component: () => <SystemSettingsSection group="payment" />,
});
