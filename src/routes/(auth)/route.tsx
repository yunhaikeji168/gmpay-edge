import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "#/layouts/auth";

export const Route = createFileRoute("/(auth)")({ component: AuthLayout });
