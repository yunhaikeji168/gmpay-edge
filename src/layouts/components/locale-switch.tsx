import { Check, Languages } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { localeLabels } from "#/lib/locales";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages";
import { getLocale, locales, setLocale } from "#/paraglide/runtime";

type Locale = (typeof locales)[number];

export function LocaleSwitch() {
	const currentLocale = getLocale();

	const handleSelect = (l: Locale) => {
		if (l === currentLocale) {
			return;
		}
		setLocale(l);
	};

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<Button className="scale-95 rounded-full" size="icon" variant="ghost">
					<Languages className="size-[1.2rem]" />
					<span className="sr-only">{m.switch_language()}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{locales.map((l) => (
					<DropdownMenuItem key={l} onClick={() => handleSelect(l)}>
						{localeLabels[l] ?? l}
						<Check
							className={cn("ms-auto", currentLocale !== l && "hidden")}
							size={14}
						/>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
