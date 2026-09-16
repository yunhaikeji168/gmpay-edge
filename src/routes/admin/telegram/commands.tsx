import { createFileRoute } from "@tanstack/react-router";
import { TelegramCommandsPage } from "#/features/telegram/pages/commands";
import { validateProTableSearch } from "#/lib/pro-table-url-state";

export const Route = createFileRoute("/admin/telegram/commands")({
	validateSearch: validateProTableSearch,
	component: TelegramCommandsPage,
});
