"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "#/components/ui/button";
import { ScrollArea } from "#/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { Main } from "#/layouts/components/main";
import { PageHeader } from "#/layouts/components/page-header";
import { m } from "#/paraglide/messages";

export type SettingsLayoutItem<TValue extends string> = {
	value: TValue;
	title: string;
	description?: string;
	icon: LucideIcon;
};

export function SettingsLayout<TValue extends string>({
	title,
	description,
	actions,
	items,
	value,
	onValueChange,
	children,
}: {
	title: string;
	description?: string;
	actions?: ReactNode;
	items: readonly SettingsLayoutItem<TValue>[];
	value: TValue;
	onValueChange: (value: TValue) => void;
	children: ReactNode;
}) {
	const active = items.find((item) => item.value === value) ?? items[0];
	return (
		<Main fixed>
			<PageHeader actions={actions} description={description} title={title} />
			<Separator className="my-4 lg:my-6" />
			<div className="flex min-h-0 flex-1 flex-col space-y-2 overflow-hidden lg:flex-row lg:space-x-12 lg:space-y-0">
				<aside className="top-0 lg:sticky lg:w-1/5">
					<div className="p-1 md:hidden">
						<Select
							value={value}
							onValueChange={(next) => onValueChange(next as TValue)}
						>
							<SelectTrigger
								aria-label={m.common_settings_sections({ title })}
								className="h-12 sm:w-48"
							>
								<SelectValue placeholder={m.common_select_section()} />
							</SelectTrigger>
							<SelectContent>
								{items.map((item) => (
									<SelectItem key={item.value} value={item.value}>
										<item.icon />
										{item.title}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<ScrollArea
						className="hidden w-full min-w-40 px-1 py-2 md:block"
						type="always"
					>
						<nav
							className="flex space-x-2 py-1 lg:flex-col lg:space-x-0 lg:space-y-1"
							aria-label={m.common_settings_sections({ title })}
						>
							{items.map((item) => (
								<Button
									className={`justify-start hover:bg-accent hover:underline ${value === item.value ? "bg-muted" : ""}`}
									key={item.value}
									onClick={() => onValueChange(item.value)}
									variant="ghost"
								>
									<item.icon className="me-2 size-[18px] shrink-0" />
									<span className="min-w-0 text-start">
										<span className="block">{item.title}</span>
										{item.description ? (
											<span className="mt-0.5 block text-xs font-normal text-muted-foreground no-underline">
												{item.description}
											</span>
										) : null}
									</span>
								</Button>
							))}
						</nav>
					</ScrollArea>
				</aside>
				<section
					className="flex min-h-0 w-full flex-1 overflow-y-hidden p-1"
					aria-label={active?.title}
				>
					{children}
				</section>
			</div>
		</Main>
	);
}
