import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/receiving-methods")({
	component: Outlet,
});
