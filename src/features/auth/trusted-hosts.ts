export function trustedOriginsFromAllowedHosts(value: unknown) {
	if (!Array.isArray(value)) return [];
	return value.flatMap((entry) => {
		if (typeof entry !== "string") return [];
		try {
			const parsed = new URL(`https://${entry}`);
			if (
				parsed.host.toLowerCase() !== entry.toLowerCase() ||
				parsed.pathname !== "/" ||
				parsed.search ||
				parsed.hash ||
				parsed.username ||
				parsed.password
			)
				return [];
			const local = ["localhost", "127.0.0.1", "[::1]"].includes(
				parsed.hostname,
			);
			return [`${local ? "http" : "https"}://${parsed.host.toLowerCase()}`];
		} catch {
			return [];
		}
	});
}
