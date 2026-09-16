import { decimalToUnits, unitsToDecimal } from "#/lib/money";

export function currencyDecimals(currency: string) {
	return (
		new Intl.NumberFormat("en", {
			style: "currency",
			currency: currency.toUpperCase(),
			currencyDisplay: "code",
		}).resolvedOptions().maximumFractionDigits ?? 2
	);
}

export function decimalToMinor(amount: string, decimals: number) {
	return decimalToUnits(amount, decimals, "reject");
}

export function minorToDecimal(amountMinor: string | bigint, decimals: number) {
	return unitsToDecimal(BigInt(amountMinor), decimals);
}
