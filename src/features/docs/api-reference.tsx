import { lazy, Suspense } from "react";

const ClientApiReferencePage = import.meta.env.SSR
	? null
	: lazy(() =>
			import("./api-reference-client").then((module) => ({
				default: module.ApiReferenceClientPage,
			})),
		);

export function ApiReferencePage() {
	if (!ClientApiReferencePage) {
		return null;
	}

	return (
		<Suspense
			fallback={
				<section className="container h-[calc(100svh-4rem)] px-4 py-6 sm:py-8">
					<div className="mx-auto h-full w-full max-w-7xl animate-pulse rounded-2xl border bg-muted/40" />
				</section>
			}
		>
			<ClientApiReferencePage />
		</Suspense>
	);
}
