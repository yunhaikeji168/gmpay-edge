const redirectBase = new URL("https://gmpay.invalid");

export function safePostAuthRedirect(value: unknown) {
	if (typeof value !== "string" || !value.startsWith("/")) return "/admin";
	if (value.includes("\\") || /%5c/i.test(value)) return "/admin";
	try {
		const target = new URL(value, redirectBase);
		if (
			target.origin !== redirectBase.origin ||
			target.username ||
			target.password
		) {
			return "/admin";
		}
		return `${target.pathname}${target.search}${target.hash}`;
	} catch {
		return "/admin";
	}
}
