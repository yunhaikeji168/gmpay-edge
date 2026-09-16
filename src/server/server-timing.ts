type ServerTimingMetric = {
	name: "app" | "authority" | "rbac" | "session" | "total";
	durationMs: number;
};

const requestMetrics = new WeakMap<
	Request,
	Map<ServerTimingMetric["name"], number>
>();
const requestTimingNames = ["session", "rbac"] as const;

export async function measureRequestTiming<T>(
	request: Request,
	name: "rbac" | "session",
	operation: () => Promise<T>,
) {
	const startedAt = performance.now();
	try {
		return await operation();
	} finally {
		const metrics = requestMetrics.get(request) ?? new Map();
		metrics.set(name, (metrics.get(name) ?? 0) + performance.now() - startedAt);
		requestMetrics.set(request, metrics);
	}
}

export function takeRequestTiming(request: Request): ServerTimingMetric[] {
	const metrics = requestMetrics.get(request);
	requestMetrics.delete(request);
	if (!metrics) return [];
	return requestTimingNames.flatMap((name) => {
		const durationMs = metrics.get(name);
		return durationMs === undefined ? [] : [{ name, durationMs }];
	});
}

export function appendServerTiming(
	response: Response,
	metrics: ServerTimingMetric[],
) {
	const headers = new Headers(response.headers);
	const value = metrics
		.map(
			({ name, durationMs }) =>
				`${name};dur=${Math.max(0, durationMs).toFixed(1)}`,
		)
		.join(", ");
	const current = headers.get("server-timing");
	headers.set("server-timing", current ? `${current}, ${value}` : value);
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
