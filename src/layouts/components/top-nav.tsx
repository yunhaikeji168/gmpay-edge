import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages";

type TopNavProps = React.HTMLAttributes<HTMLElement> & {
	links: {
		title: string;
		href: string;
		isActive: boolean;
		disabled?: boolean;
	}[];
};

export function TopNav({ className, links, ...props }: TopNavProps) {
	return (
		<>
			<div className="lg:hidden">
				<DropdownMenu modal={false}>
					<DropdownMenuTrigger asChild>
						<Button
							aria-label={m.layout_toggleNavigationMenu()}
							className="md:size-7"
							size="icon"
							variant="outline"
						>
							<Menu aria-hidden="true" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" side="bottom">
						{links.map(({ title, href, isActive, disabled }) => (
							<DropdownMenuItem asChild key={`${title}-${href}`}>
								<Link
									className={isActive ? "" : "text-muted-foreground"}
									disabled={disabled}
									to={href}
								>
									{title}
								</Link>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<nav
				className={cn(
					"hidden items-center space-x-4 lg:flex lg:space-x-4 xl:space-x-6",
					className,
				)}
				{...props}
			>
				{links.map(({ title, href, isActive, disabled }) => (
					<Link
						className={`font-medium text-sm transition-colors hover:text-primary ${isActive ? "" : "text-muted-foreground"}`}
						disabled={disabled}
						key={`${title}-${href}`}
						to={href}
					>
						{title}
					</Link>
				))}
			</nav>
		</>
	);
}
