import { createFileRoute } from "@tanstack/react-router";
import { TelegramBotsPage } from "#/features/telegram/pages/bots";
import { validateProTableSearch } from "#/lib/pro-table-url-state";

export const Route = createFileRoute("/admin/telegram/")({
	validateSearch: validateProTableSearch,
	component: TelegramBotsPage,
});
