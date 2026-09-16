import { Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar";
import { LayoutProvider } from "#/context/layout-provider";
import { SearchProvider } from "#/context/search-provider";
import type { SystemPermissionGrant } from "#/features/access/system-rbac";
import { AppHeader } from "#/layouts/components/app-header";
import { AppSidebar } from "#/layouts/components/app-sidebar";
import { CommandMenu } from "#/layouts/components/command-menu";
import { NavigationProvider } from "#/layouts/components/navigation-context";
import { SkipToMain } from "#/layouts/components/skip-to-main";
import type { SidebarData } from "#/layouts/components/types";
import { getCookie } from "#/lib/cookies";
import { cn } from "#/lib/utils";
import { type AuthUser, authStore } from "#/stores/auth-store";

interface DashboardLayoutProps {
	children?: React.ReactNode;
	user?: AuthUser;
	navigation?: SidebarData;
	permissions?: readonly SystemPermissionGrant[];
	homeHref?: string;
}

export function DashboardLayout({
	children,
	user,
	navigation,
	permissions = [],
	homeHref,
}: DashboardLayoutProps) {
	useEffect(() => {
		if (!user) return;
		authStore.actions.setUser(user);
	}, [user]);
	const defaultOpen = getCookie("sidebar_state") !== "false";

	const safeNavigation = navigation ?? { navGroups: [] };
	return (
		<NavigationProvider navigation={safeNavigation} permissions={permissions}>
			<SearchProvider>
				<CommandMenu />
				<LayoutProvider>
					<SidebarProvider defaultOpen={defaultOpen}>
						<SkipToMain />
						<AppSidebar data={navigation} homeHref={homeHref} user={user} />
						<SidebarInset
							className={cn(
								"@container/content",
								"has-data-[layout=fixed]:h-svh",
								"peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]",
							)}
							id="content"
							tabIndex={-1}
						>
							<AppHeader />
							{children ?? <Outlet />}
						</SidebarInset>
					</SidebarProvider>
				</LayoutProvider>
			</SearchProvider>
		</NavigationProvider>
	);
}
