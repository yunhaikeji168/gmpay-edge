import { createContext, useContext } from "react";
import type { SystemPermissionGrant } from "#/features/access/system-rbac";
import type { SidebarData } from "./types";

type NavigationContextValue = {
	navigation: SidebarData;
	permissions: readonly SystemPermissionGrant[];
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({
	children,
	navigation,
	permissions,
}: NavigationContextValue & { children: React.ReactNode }) {
	return (
		<NavigationContext value={{ navigation, permissions }}>
			{children}
		</NavigationContext>
	);
}

export function useNavigation() {
	const value = useContext(NavigationContext);
	if (!value)
		throw new Error("useNavigation must be used within NavigationProvider");
	return value;
}
