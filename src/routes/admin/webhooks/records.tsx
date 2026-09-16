import { createFileRoute } from "@tanstack/react-router";
import { WebhooksSection } from "#/features/webhooks/pages/admin";
import { validateProTableSearch } from "#/lib/pro-table-url-state";

export const Route = createFileRoute("/admin/webhooks/records")({
	validateSearch: validateProTableSearch,
	component: WebhooksSection,
});
