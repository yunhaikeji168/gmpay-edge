import { createFileRoute } from "@tanstack/react-router";
import { BrandSettingsPage } from "#/features/settings/pages/brand";
export const Route = createFileRoute("/admin/settings/")({
	component: BrandSettingsPage,
});
