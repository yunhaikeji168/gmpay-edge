import { createFileRoute } from "@tanstack/react-router";
import { JobsPage } from "#/features/operations/pages/jobs";
import { validateProTableSearch } from "#/lib/pro-table-url-state";
export const Route = createFileRoute("/admin/operations/scheduled")({
	validateSearch: validateProTableSearch,
	component: JobsPage,
});
