import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
	type InstallInput,
	installSystem,
	isInstalled,
} from "#/features/installation/server/install";
import { getDb } from "#/server/db.server";
import { createInitialRuntimeConfig } from "#/server/runtime-config";

export const getInstallStatus = createServerFn({ method: "GET" }).handler(
	async () => {
		const request = getRequest();
		const db = getDb(request);
		return { installed: await isInstalled(db) };
	},
);

export const installSystemFn = createServerFn({ method: "POST" })
	.validator((input: InstallInput) =>
		z
			.object({
				name: z.string().trim().min(1).max(100),
				email: z.email(),
				password: z.string().min(12).max(200),
			})
			.parse(input),
	)
	.handler(async ({ data }) => {
		const request = getRequest();
		const db = getDb(request);
		return await installSystem(
			db,
			data,
			createInitialRuntimeConfig(new URL(request.url).origin),
		);
	});
