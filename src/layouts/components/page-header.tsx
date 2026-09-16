import type { ReactNode } from "react";
import { Separator } from "#/components/ui/separator";

interface PageHeaderProps {
	actions?: ReactNode;
	children?: ReactNode;
	description?: string;
	title: string;
	variant?: "page" | "section";
}

export function PageHeader({
	title,
	description,
	actions,
	children,
	variant = "page",
}: PageHeaderProps) {
	if (variant === "section") {
		return (
			<div className="flex flex-1 flex-col">
				<div className="flex-none">
					<h3 className="font-medium text-lg">{title}</h3>
					{description && (
						<p className="text-muted-foreground text-sm">{description}</p>
					)}
				</div>
				<Separator className="my-4 flex-none" />
				<div className="faded-bottom h-full w-full overflow-y-auto scroll-smooth pe-4 pb-12">
					<div className="-mx-1 px-1.5 lg:max-w-xl">{children}</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-wrap items-end justify-between gap-2">
			<div>
				<h2 className="font-bold text-2xl tracking-tight">{title}</h2>
				{description && <p className="text-muted-foreground">{description}</p>}
			</div>
			{actions && <div className="flex gap-2">{actions}</div>}
		</div>
	);
}
