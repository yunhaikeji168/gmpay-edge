import { createFileRoute } from "@tanstack/react-router";
import { InboundNotificationRecordsPage } from "#/features/webhooks/pages/admin-inbound-records";
import { validateProTableSearch } from "#/lib/pro-table-url-state";

export const Route = createFileRoute("/admin/webhooks/inbound-records")({
	validateSearch: validateProTableSearch,
	component: InboundNotificationRecordsPage,
});
