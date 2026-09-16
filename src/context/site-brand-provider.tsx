import { createContext, use } from "react";
import type { SiteBrand } from "#/features/settings/site-brand";

const SiteBrandContext = createContext<SiteBrand | null>(null);

export function SiteBrandProvider({
	brand,
	children,
}: {
	brand: SiteBrand;
	children: React.ReactNode;
}) {
	return <SiteBrandContext value={brand}>{children}</SiteBrandContext>;
}

export function useSiteBrand() {
	const brand = use(SiteBrandContext);
	if (!brand) throw new Error("SiteBrandProvider is missing");
	return brand;
}
