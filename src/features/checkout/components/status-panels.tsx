import {
	Ban,
	Check,
	CircleDollarSign,
	FileX,
	LoaderCircle,
	RotateCcw,
	TriangleAlert,
	X,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "#/components/ui/button";
import { m } from "#/paraglide/messages";

function StatePanel({
	children,
	description,
	icon,
	title,
}: {
	children?: ReactNode;
	description: string;
	icon: ReactNode;
	title: string;
}) {
	return (
		<output
			aria-live="polite"
			className="flex min-h-96 w-full flex-col items-center justify-center rounded-2xl border bg-card px-6 py-10 text-center text-card-foreground shadow-md"
		>
			<div className="mb-6 flex size-20 items-center justify-center rounded-full bg-muted">
				{icon}
			</div>
			<p className="mb-2 font-bold text-xl">{title}</p>
			<p className="mb-6 text-muted-foreground text-sm">{description}</p>
			{children}
		</output>
	);
}

export function SuccessPanel({ redirecting }: { redirecting: boolean }) {
	return (
		<StatePanel
			description={
				redirecting ? m.checkout_redirecting() : m.checkout_success_sub()
			}
			icon={<Check className="size-10 text-green-500" />}
			title={m.checkout_success()}
		>
			{redirecting ? (
				<LoaderCircle className="size-6 animate-spin text-muted-foreground" />
			) : null}
		</StatePanel>
	);
}

export function ConfirmingPanel({
	children,
	confirmations,
	required,
}: {
	children?: ReactNode;
	confirmations: number;
	required: number;
}) {
	return (
		<StatePanel
			description={m.checkout_confirming_sub({ confirmations, required })}
			icon={<LoaderCircle className="size-10 animate-spin text-primary" />}
			title={m.checkout_confirming()}
		>
			{children}
		</StatePanel>
	);
}

export function PartiallyPaidPanel({
	asset,
	children,
	expected,
	received,
}: {
	asset: string;
	children?: ReactNode;
	expected: string;
	received: string;
}) {
	return (
		<StatePanel
			description={m.checkout_partially_paid_sub({ asset, expected, received })}
			icon={<CircleDollarSign className="size-10 text-orange-500" />}
			title={m.checkout_partially_paid()}
		>
			{children}
		</StatePanel>
	);
}

export function OverpaidPanel({
	asset,
	received,
}: {
	asset: string;
	received: string;
}) {
	return (
		<StatePanel
			description={m.checkout_overpaid_sub({ asset, received })}
			icon={<Check className="size-10 text-green-500" />}
			title={m.checkout_overpaid()}
		/>
	);
}

export function CancelledPanel({ onBack }: { onBack: () => void }) {
	return (
		<TerminalPanel
			description={m.checkout_cancelled_sub()}
			icon={<Ban className="size-10 text-muted-foreground" />}
			onBack={onBack}
			title={m.checkout_cancelled()}
		/>
	);
}

export function FailedPanel({ onBack }: { onBack: () => void }) {
	return (
		<TerminalPanel
			description={m.checkout_failed_sub()}
			icon={<TriangleAlert className="size-10 text-destructive" />}
			onBack={onBack}
			title={m.checkout_failed()}
		/>
	);
}

export function RefundedPanel({ onBack }: { onBack: () => void }) {
	return (
		<TerminalPanel
			description={m.checkout_refunded_sub()}
			icon={<RotateCcw className="size-10 text-primary" />}
			onBack={onBack}
			title={m.checkout_refunded()}
		/>
	);
}

function TerminalPanel({
	description,
	icon,
	onBack,
	title,
}: {
	description: string;
	icon: ReactNode;
	onBack: () => void;
	title: string;
}) {
	return (
		<div className="space-y-4">
			<StatePanel description={description} icon={icon} title={title} />
			<Button
				className="h-12 w-full rounded-xl"
				onClick={onBack}
				type="button"
				variant="outline"
			>
				{m.checkout_back()}
			</Button>
		</div>
	);
}

export function ExpiredPanel({
	children,
	onBack,
}: {
	children?: ReactNode;
	onBack: () => void;
}) {
	return (
		<div className="space-y-4">
			<StatePanel
				description={m.checkout_expired_sub()}
				icon={<X className="size-10 text-destructive" />}
				title={m.checkout_expired()}
			>
				{children}
			</StatePanel>
			<Button
				className="h-12 w-full rounded-xl"
				onClick={onBack}
				type="button"
				variant="outline"
			>
				{m.checkout_back()}
			</Button>
		</div>
	);
}

export function TimeoutPanel({
	onBack,
	onRetry,
}: {
	onBack: () => void;
	onRetry: () => void;
}) {
	return (
		<div className="space-y-4">
			<StatePanel
				description={m.checkout_timeout_sub()}
				icon={<TriangleAlert className="size-10 text-orange-500" />}
				title={m.checkout_timeout()}
			/>
			<div className="flex gap-3">
				<Button
					className="h-12 flex-1 rounded-xl"
					onClick={onBack}
					type="button"
					variant="outline"
				>
					{m.checkout_back()}
				</Button>
				<Button
					className="h-12 flex-1 rounded-xl"
					onClick={onRetry}
					type="button"
				>
					{m.checkout_retry()}
				</Button>
			</div>
		</div>
	);
}

export function NotFoundPanel({ onBack }: { onBack: () => void }) {
	return (
		<div className="space-y-4">
			<StatePanel
				description={m.checkout_not_found_sub()}
				icon={<FileX className="size-10 text-muted-foreground" />}
				title={m.checkout_not_found()}
			/>
			<Button
				className="h-12 w-full rounded-xl"
				onClick={onBack}
				type="button"
				variant="outline"
			>
				{m.checkout_back()}
			</Button>
		</div>
	);
}
