import { createFileRoute } from "@tanstack/react-router";
import { TwoFactorPage } from "#/features/auth/pages/two-factor";
import { createDefaultSeoHead, siteNameFromMatches } from "#/lib/seo";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute("/(auth)/two-factor")({
	head: ({ matches }) => {
		const siteName = siteNameFromMatches(matches);
		return createDefaultSeoHead({
			title: `${m.auth_two_factor_title()} | ${siteName}`,
			description: m.auth_two_factor_description(),
			path: "/two-factor",
			siteName,
		});
	},
	component: TwoFactorPage,
});
