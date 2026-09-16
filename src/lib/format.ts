import { getLocale } from "#/paraglide/runtime";

export function formatDateTime(
	value: Date | string | number,
	locale = getLocale(),
	timeZone?: string,
) {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return new Intl.DateTimeFormat(locale, {
		dateStyle: "medium",
		timeStyle: "medium",
		timeZone,
	}).format(date);
}

export function formatNumber(value: number, locale = getLocale()) {
	return new Intl.NumberFormat(locale).format(value);
}
