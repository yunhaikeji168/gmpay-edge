import { createFileRoute } from "@tanstack/react-router";
import { AssetsPage } from "#/features/status/pages/assets";
import { getPublicPaymentMethodsFn } from "#/features/status/server/assets";

export const Route = createFileRoute("/(public)/assets")({
	loader: () => getPublicPaymentMethodsFn(),
	component: AssetsRoute,
});

function AssetsRoute() {
	return <AssetsPage rows={Route.useLoaderData()} />;
}
