import { createFileRoute } from "@tanstack/react-router";
import { InboundWebhookEndpointsPage } from "#/features/webhooks/pages/admin-inbound";
import { validateProTableSearch } from "#/lib/pro-table-url-state";
export const Route = createFileRoute("/admin/webhooks/")({
	validateSearch: validateProTableSearch,
	component: InboundWebhookEndpointsPage,
});
