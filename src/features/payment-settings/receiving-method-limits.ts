import { paymentSettingsError } from "#/features/payment-settings/errors";
import { decimalToUnits } from "#/lib/money";

export const receivingLimitDecimals = 2;

export function parseReceivingUsdLimits(
	minAmount: string | undefined,
	maxAmount: string | undefined,
) {
	const limits = {
		min: minAmount ? decimalToUnits(minAmount, receivingLimitDecimals) : null,
		max: maxAmount ? decimalToUnits(maxAmount, receivingLimitDecimals) : null,
	};
	if (limits.min !== null && limits.max !== null && limits.min > limits.max)
		throw paymentSettingsError("receiving_method_invalid_limits");
	return limits;
}
