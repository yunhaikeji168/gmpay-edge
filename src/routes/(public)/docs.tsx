import { createFileRoute } from "@tanstack/react-router";
import { ApiReferencePage } from "#/features/docs/api-reference";

export const Route = createFileRoute("/(public)/docs")({
	ssr: false,
	component: ApiReferencePage,
});
