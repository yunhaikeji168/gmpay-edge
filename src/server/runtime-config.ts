import { loadRequestSettings } from "./request-settings";

const runtimeConfigKeys = {
	betterAuthSecret: "runtime.better_auth_secret",
	betterAuthUrl: "runtime.better_auth_url",
	apiKeyPepper: "runtime.api_key_pepper",
	integrationConfigSecret: "runtime.integration_config_secret",
} as const;

export type RuntimeConfig = {
	betterAuthSecret: string;
	betterAuthUrl: string;
	apiKeyPepper: string;
	integrationConfigSecret: string;
};

const requestRuntimeConfig = new WeakMap<Request, Promise<RuntimeConfig>>();

export function loadRequestRuntimeConfig(
	request: Request,
	db: D1Database,
	origin = "",
) {
	const cached = requestRuntimeConfig.get(request);
	if (cached) return cached;
	const pending = loadRequestSettings(request, db).then((settings) =>
		runtimeConfigFromSettings(settings, origin),
	);
	requestRuntimeConfig.set(request, pending);
	return pending;
}

export async function loadRuntimeConfig(
	db: D1Database,
): Promise<RuntimeConfig> {
	const rows = await db
		.prepare(`SELECT key, value FROM system_settings WHERE key IN (?, ?, ?, ?)`)
		.bind(...Object.values(runtimeConfigKeys))
		.all<{ key: string; value: string }>();
	return runtimeConfigFromSettings(
		new Map(rows.results.map((row) => [row.key, row.value])),
		"",
	);
}

function runtimeConfigFromSettings(
	settings: ReadonlyMap<string, string>,
	origin: string,
): RuntimeConfig {
	const stored = new Map(
		[...settings].map(([key, value]) => [key, parseString(value)]),
	);
	return {
		betterAuthSecret: stored.get(runtimeConfigKeys.betterAuthSecret) ?? "",
		betterAuthUrl: stored.get(runtimeConfigKeys.betterAuthUrl) ?? origin,
		apiKeyPepper: stored.get(runtimeConfigKeys.apiKeyPepper) ?? "",
		integrationConfigSecret:
			stored.get(runtimeConfigKeys.integrationConfigSecret) ?? "",
	};
}

export function createInitialRuntimeConfig(origin = ""): RuntimeConfig {
	return {
		betterAuthSecret: generateRuntimeSecret(),
		betterAuthUrl: origin,
		apiKeyPepper: generateRuntimeSecret(),
		integrationConfigSecret: generateRuntimeSecret(),
	};
}

export function runtimeConfigEntries(config: RuntimeConfig) {
	return (
		Object.keys(runtimeConfigKeys) as Array<keyof typeof runtimeConfigKeys>
	).map((field) => ({
		key: runtimeConfigKeys[field],
		value: config[field],
		isSecret: field !== "betterAuthUrl",
	}));
}

function generateRuntimeSecret() {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
}

function parseString(value: string) {
	try {
		const parsed: unknown = JSON.parse(value);
		return typeof parsed === "string" ? parsed : "";
	} catch {
		return "";
	}
}
