import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/payment-settings/rates")({
	component: Outlet,
});
