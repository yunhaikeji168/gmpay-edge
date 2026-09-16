import { createFileRoute } from "@tanstack/react-router";
import { TelegramNotificationsPage } from "#/features/telegram/pages/notifications";
import { validateProTableSearch } from "#/lib/pro-table-url-state";

export const Route = createFileRoute("/admin/telegram/notifications")({
	validateSearch: validateProTableSearch,
	component: TelegramNotificationsPage,
});
