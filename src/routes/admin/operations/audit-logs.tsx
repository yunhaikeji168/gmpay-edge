import { createFileRoute } from "@tanstack/react-router";
import { AuditLogsPage } from "#/features/operations/pages/audit-logs";
import { validateProTableSearch } from "#/lib/pro-table-url-state";
export const Route = createFileRoute("/admin/operations/audit-logs")({
	validateSearch: validateProTableSearch,
	component: AuditLogsPage,
});
