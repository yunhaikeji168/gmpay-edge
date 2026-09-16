import { createFileRoute } from "@tanstack/react-router";
import { SystemSettingsSection } from "#/features/settings/pages/admin";
export const Route = createFileRoute("/admin/settings/retention")({
	component: () => <SystemSettingsSection group="retention" />,
});
