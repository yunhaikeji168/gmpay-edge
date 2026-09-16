import { createFileRoute, redirect } from "@tanstack/react-router";
import { InstallPage } from "#/features/installation/pages/install";
import { getInstallStatus } from "#/features/installation/server/functions";
import { createDefaultSeoHead, siteNameFromMatches } from "#/lib/seo";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute("/install")({
	head: ({ matches }) => {
		const siteName = siteNameFromMatches(matches);
		return createDefaultSeoHead({
			title: `${m.install_title()} | ${siteName}`,
			description: m.install_description(),
			path: "/install",
			siteName,
		});
	},
	loader: async () => {
		const installStatus = await getInstallStatus();
		if (installStatus.installed) throw redirect({ to: "/admin" });
	},
	component: InstallPage,
});
