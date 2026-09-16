/** Cookie helpers with Cookie Store and document.cookie support. */

const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | undefined {
	if (typeof document === "undefined") return undefined;

	const encodedName = `${encodeURIComponent(name)}=`;
	const value = document.cookie
		.split("; ")
		.find((part) => part.startsWith(encodedName))
		?.slice(encodedName.length);
	if (value === undefined) return undefined;
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

/**
 * Set a cookie with name, value, and optional max age
 */
export function setCookie(
	name: string,
	value: string,
	maxAge: number = DEFAULT_MAX_AGE,
): void {
	if (typeof document === "undefined") return;

	const store = browserCookieStore();
	if (store) {
		void store.set({
			name,
			value,
			path: "/",
			sameSite: "lax",
			expires: Date.now() + maxAge * 1000,
		});
		return;
	}
	Reflect.set(
		document,
		"cookie",
		`${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=${Math.max(0, Math.floor(maxAge))}`,
	);
}

type BrowserCookieStore = {
	set(options: {
		name: string;
		value: string;
		path: string;
		sameSite: "lax";
		expires: number;
	}): Promise<void>;
};

function browserCookieStore(): BrowserCookieStore | undefined {
	return (
		globalThis as typeof globalThis & { cookieStore?: BrowserCookieStore }
	).cookieStore;
}
