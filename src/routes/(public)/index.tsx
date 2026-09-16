import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "#/features/home";
import { createHomeSeoHead } from "#/lib/seo";

export const Route = createFileRoute("/(public)/")({
	head: ({ matches }) => createHomeSeoHead(matches),
	component: HomePage,
});
