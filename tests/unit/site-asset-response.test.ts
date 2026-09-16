import { describe, expect, it, vi } from "vitest";
import { siteAssetResponse } from "#/features/settings/server/site-asset-response";
import {
	createDatastoreCounters,
	instrumentR2,
} from "../helpers/datastore-counters";

describe("site asset response", () => {
	it("streams matching R2 objects with cache metadata", async () => {
		const body = new ReadableStream({
			start(controller) {
				controller.enqueue(new Uint8Array([1, 2, 3]));
				controller.close();
			},
		});
		const object = {
			body,
			httpEtag: '"asset-etag"',
			writeHttpMetadata(headers: Headers) {
				headers.set("content-type", "image/png");
				headers.set("cache-control", "public, max-age=3600");
			},
		};
		const get = vi.fn().mockResolvedValue(object);
		const counters = createDatastoreCounters();
		const request = new Request("https://example.com/api/site-logo", {
			headers: { "if-none-match": '"previous"' },
		});

		const response = await siteAssetResponse(
			request,
			instrumentR2({ get } as unknown as R2Bucket, counters),
			"branding/site-logo",
			undefined,
		);

		expect(get).toHaveBeenCalledWith("branding/site-logo", {
			onlyIf: request.headers,
		});
		expect(get).toHaveBeenCalledOnce();
		expect(counters.r2Get).toBe(1);
		expect(response.status).toBe(200);
		expect(response.headers.get("etag")).toBe('"asset-etag"');
		expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(
			new Uint8Array([1, 2, 3]),
		);
	});

	it("caches immutable versioned assets and serves later requests without R2", async () => {
		const cached = new Map<string, Response>();
		const cache = {
			match: vi.fn(async (request: Request) =>
				cached.get(request.url)?.clone(),
			),
			put: vi.fn(async (request: Request, response: Response) => {
				cached.set(request.url, response.clone());
			}),
		} as unknown as Cache;
		const object = {
			body: new Uint8Array([1, 2, 3]),
			httpEtag: '"asset-etag"',
			writeHttpMetadata(headers: Headers) {
				headers.set("content-type", "image/png");
			},
		};
		const get = vi.fn().mockResolvedValue(object);
		const request = new Request("https://example.com/api/site-logo?v=123");

		const first = await siteAssetResponse(
			request,
			{ get } as unknown as R2Bucket,
			"branding/site-logo",
			cache,
		);
		const second = await siteAssetResponse(
			request,
			{ get } as unknown as R2Bucket,
			"branding/site-logo",
			cache,
		);

		expect(get).toHaveBeenCalledOnce();
		expect(cache.put).toHaveBeenCalledOnce();
		expect(first.headers.get("cache-control")).toBe(
			"public, max-age=31536000, immutable",
		);
		expect(new Uint8Array(await second.arrayBuffer())).toEqual(
			new Uint8Array([1, 2, 3]),
		);
	});

	it("returns 304 from a versioned cache hit when the ETag matches", async () => {
		const cache = {
			match: vi.fn().mockResolvedValue(
				new Response(new Uint8Array([1]), {
					headers: { etag: '"asset-etag"' },
				}),
			),
			put: vi.fn(),
		} as unknown as Cache;
		const response = await siteAssetResponse(
			new Request("https://example.com/api/site-logo?v=123", {
				headers: { "if-none-match": '"asset-etag"' },
			}),
			{ get: vi.fn() } as unknown as R2Bucket,
			"branding/site-logo",
			cache,
		);
		expect(response.status).toBe(304);
		expect(response.body).toBeNull();
	});

	it("falls back to R2 when the public cache is unavailable", async () => {
		const cache = {
			match: vi.fn().mockRejectedValue(new Error("cache unavailable")),
			put: vi.fn().mockRejectedValue(new Error("cache unavailable")),
		} as unknown as Cache;
		const response = await siteAssetResponse(
			new Request("https://example.com/api/site-logo?v=123"),
			{
				get: vi.fn().mockResolvedValue({
					body: new Uint8Array([1]),
					httpEtag: '"asset-etag"',
					writeHttpMetadata: vi.fn(),
				}),
			} as unknown as R2Bucket,
			"branding/site-logo",
			cache,
		);
		expect(response.status).toBe(200);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(
			new Uint8Array([1]),
		);
	});

	it("returns 304 without reading an R2 body after an ETag match", async () => {
		const object = {
			httpEtag: '"asset-etag"',
			writeHttpMetadata: vi.fn(),
		};
		const response = await siteAssetResponse(
			new Request("https://example.com/api/site-logo"),
			{ get: vi.fn().mockResolvedValue(object) } as unknown as R2Bucket,
			"branding/site-logo",
		);
		expect(response.status).toBe(304);
		expect(response.body).toBeNull();
	});

	it("returns 404 when the asset is absent", async () => {
		const counters = createDatastoreCounters();
		const get = vi.fn().mockResolvedValue(null);
		const response = await siteAssetResponse(
			new Request("https://example.com/api/site-logo"),
			instrumentR2({ get } as unknown as R2Bucket, counters),
			"branding/site-logo",
		);
		expect(response.status).toBe(404);
		expect(get).toHaveBeenCalledOnce();
		expect(counters.r2Get).toBe(1);
	});

	it("does not retry an R2 storage failure", async () => {
		const counters = createDatastoreCounters();
		const get = vi.fn().mockRejectedValue(new Error("R2 unavailable"));
		await expect(
			siteAssetResponse(
				new Request("https://example.com/api/site-logo"),
				instrumentR2({ get } as unknown as R2Bucket, counters),
				"branding/site-logo",
			),
		).rejects.toThrow("R2 unavailable");
		expect(get).toHaveBeenCalledOnce();
		expect(counters.r2Get).toBe(1);
	});
});
