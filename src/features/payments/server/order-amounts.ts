import { unitsToDecimal } from "#/lib/money";
import { minorToDecimal } from "#/lib/units";

export type StoredOrderAmounts = {
	amount_minor: string;
	currency_decimals: number;
	expected_amount_units: string | null;
	decimals: number | null;
};

export function displayOrderAmounts<T extends StoredOrderAmounts>(row: T) {
	return {
		...row,
		amount: minorToDecimal(row.amount_minor, row.currency_decimals),
		paymentAmount:
			row.expected_amount_units !== null && row.decimals !== null
				? unitsToDecimal(BigInt(row.expected_amount_units), row.decimals)
				: null,
	};
}
