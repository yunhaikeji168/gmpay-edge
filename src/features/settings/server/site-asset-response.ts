export async function siteAssetResponse(
	request: Request,
	bucket: R2Bucket | undefined,
	key: string,
	cache: Cache | undefined = defaultCache(),
) {
	const cacheKey = versionedCacheKey(request);
	if (cacheKey && cache) {
		const cached = await cache.match(cacheKey).catch(() => undefined);
		if (cached) return conditionalResponse(request, cached);
	}
	const object = await bucket?.get(key, { onlyIf: request.headers });
	if (!object) return new Response("Not found", { status: 404 });
	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("etag", object.httpEtag);
	headers.set("x-content-type-options", "nosniff");
	if (!("body" in object)) return new Response(null, { status: 304, headers });
	if (cacheKey)
		headers.set("cache-control", "public, max-age=31536000, immutable");
	const response = new Response(object.body, { headers });
	if (cacheKey && cache)
		await cache.put(cacheKey, response.clone()).catch(() => undefined);
	return response;
}

function versionedCacheKey(request: Request) {
	const url = new URL(request.url);
	const version = url.searchParams.get("v");
	if (!/^\d+$/.test(version ?? "")) return undefined;
	url.search = `?v=${version}`;
	return new Request(url, { method: "GET" });
}

function conditionalResponse(request: Request, response: Response) {
	if (request.headers.get("if-none-match") !== response.headers.get("etag"))
		return response;
	return new Response(null, { status: 304, headers: response.headers });
}

function defaultCache() {
	return (
		globalThis as typeof globalThis & {
			caches?: CacheStorage & { default?: Cache };
		}
	).caches?.default;
}
