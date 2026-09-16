import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { loadAdminBootstrap } from "#/features/auth/server/admin-bootstrap";

export const getAdminBootstrapFn = createServerFn({ method: "GET" }).handler(
	() => loadAdminBootstrap(getRequest()),
);
