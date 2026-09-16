import { createFileRoute } from "@tanstack/react-router";
import { QueuesPage } from "#/features/operations/pages/queues";
import { validateProTableSearch } from "#/lib/pro-table-url-state";
export const Route = createFileRoute("/admin/operations/queues")({
	validateSearch: validateProTableSearch,
	component: QueuesPage,
});
