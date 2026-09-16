import { AssetIcon } from "./crypto-icon";

export function NetworkBadge({
	className,
	displayName,
	network,
}: {
	className?: string;
	displayName?: string;
	network: string;
}) {
	return (
		<span
			className={`inline-flex min-w-0 items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 ${className ?? ""}`}
		>
			<AssetIcon
				className="size-4 rounded-full"
				height={16}
				network={network}
				width={16}
			/>
			<span className="truncate font-semibold text-xs">
				{displayName?.trim() || network}
			</span>
		</span>
	);
}
