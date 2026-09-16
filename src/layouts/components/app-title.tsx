import { useSiteBrand } from "#/context/site-brand-provider";
import { m } from "#/paraglide/messages";

export function AppTitle({ description = false }: { description?: boolean }) {
	const brand = useSiteBrand();
	return (
		<span className="flex min-w-0 items-center gap-3">
			<img
				alt={brand.name}
				className="size-9 max-w-none shrink-0 object-contain"
				height={36}
				src={brand.logoUrl}
				width={36}
			/>
			<span className="min-w-0">
				<strong className="block truncate font-semibold leading-tight tracking-tight">
					{brand.name === "GMPay Edge" ? (
						<>
							GMPay <span className="text-primary">Edge</span>
						</>
					) : (
						brand.name
					)}
				</strong>
				{description ? (
					<small className="mt-1 block truncate text-muted-foreground text-xs font-normal leading-tight">
						{m.app_title_description()}
					</small>
				) : null}
			</span>
		</span>
	);
}
