import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { NavigationModuleId } from "#/layouts/components/data/sidebar-data";
import { visibleModuleEntries } from "#/layouts/components/data/sidebar-data";
import { useNavigation } from "#/layouts/components/navigation-context";
import { SettingsLayout } from "#/layouts/settings";

export function ModuleNavigation({
	moduleId,
	title,
	description,
	children,
}: {
	moduleId: NavigationModuleId;
	title: string;
	description?: string;
	children: ReactNode;
}) {
	const navigate = useNavigate();
	const { permissions } = useNavigation();
	const pathname = useRouterState({
		select: (state) => state.location.pathname.replace(/\/$/, ""),
	});
	const entries = visibleModuleEntries(moduleId, permissions);
	const items = entries.map((item) => ({
		value: item.id,
		title: item.title(),
		icon: item.icon,
		path: item.url,
	}));
	const active = items.find((item) => item.path === pathname) ?? items[0];
	return (
		<SettingsLayout
			title={title}
			description={description}
			items={items}
			value={active?.value ?? ""}
			onValueChange={(value) => {
				const target = items.find((item) => item.value === value);
				if (target) navigate({ to: target.path });
			}}
		>
			{children}
		</SettingsLayout>
	);
}
