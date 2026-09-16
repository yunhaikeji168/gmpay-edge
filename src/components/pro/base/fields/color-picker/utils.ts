export function normalizeRgba(value: string) {
	if (!value.trim()) return "";
	const rgba = parseRgba(value);
	if (rgba) return formatRgba(rgba);
	const hex = parseHex(value);
	return hex ? formatRgba(hex) : value;
}

function parseRgba(value: string): [number, number, number, number] | null {
	const match =
		/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i.exec(
			value,
		);
	if (!match) return null;
	return [
		Math.min(255, Number(match[1])),
		Math.min(255, Number(match[2])),
		Math.min(255, Number(match[3])),
		Math.min(1, Math.max(0, Number(match[4] ?? 1))),
	];
}

function parseHex(value: string): [number, number, number, number] | null {
	const normalized = value.trim().replace(/^#/, "");
	const expanded =
		normalized.length === 3 || normalized.length === 4
			? [...normalized].map((digit) => digit.repeat(2)).join("")
			: normalized;
	if (!/^[\da-f]{6}(?:[\da-f]{2})?$/i.test(expanded)) return null;
	return [
		Number.parseInt(expanded.slice(0, 2), 16),
		Number.parseInt(expanded.slice(2, 4), 16),
		Number.parseInt(expanded.slice(4, 6), 16),
		expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
	];
}

function formatRgba([red, green, blue, alpha]: [
	number,
	number,
	number,
	number,
]) {
	return `rgba(${red}, ${green}, ${blue}, ${Number(alpha.toFixed(2))})`;
}
