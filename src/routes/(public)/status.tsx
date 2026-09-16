import { createFileRoute } from "@tanstack/react-router";
import { StatusPage } from "#/features/status/pages/status";
import { getStatusFn } from "#/features/status/server/functions";

export const Route = createFileRoute("/(public)/status")({
	loader: () => getStatusFn(),
	component: StatusRoute,
});

function StatusRoute() {
	return <StatusPage report={Route.useLoaderData()} />;
}
