import { cn } from "#/lib/utils";
import type { CheckoutPanelState } from "../checkout-model";

function getCurrentStep(panel: CheckoutPanelState, totalSteps: 2 | 3) {
	if (totalSteps === 2) {
		if (panel === "payment" || panel === "success" || panel === "expired") {
			return 2;
		}
		if (panel === "select") {
			return 1;
		}
		return 0;
	}

	if (panel === "payment" || panel === "success" || panel === "expired") {
		return 3;
	}
	if (panel === "select") {
		return 2;
	}
	if (panel === "method") {
		return 1;
	}
	return 0;
}

export function StepProgress({
	hidden,
	panel,
	totalSteps = 3,
}: {
	hidden?: boolean;
	panel: CheckoutPanelState;
	totalSteps?: 2 | 3;
}) {
	if (hidden) {
		return null;
	}

	const currentStep = getCurrentStep(panel, totalSteps);

	return (
		<div className="mb-4 flex w-full items-center gap-2">
			{Array.from({ length: totalSteps }, (_, index) => index + 1).map(
				(step) => (
					<div
						className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/10"
						key={step}
					>
						<div
							className={cn(
								"h-full rounded-full bg-foreground transition-all",
								currentStep >= step ? "w-full" : "w-0",
							)}
						/>
					</div>
				),
			)}
		</div>
	);
}
