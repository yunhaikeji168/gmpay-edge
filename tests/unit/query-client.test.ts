import { readFile } from "node:fs/promises";
import { dehydrate, hydrate } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { getContext } from "#/context/tanstack-query";

describe("QueryClient defaults", () => {
	it("keeps hydrated queries fresh long enough to avoid an immediate refetch", () => {
		const { queryClient } = getContext();

		expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(15_000);
	});

	it("creates an isolated cache for every request", () => {
		const first = getContext().queryClient;
		const second = getContext().queryClient;

		first.setQueryData(["request-owned"], "first");

		expect(second).not.toBe(first);
		expect(second.getQueryData(["request-owned"])).toBeUndefined();
	});

	it("does not mix locale or order data between SSR request caches", () => {
		const english = getContext().queryClient;
		const chinese = getContext().queryClient;
		english.setQueryData(["checkout", "order-a"], {
			locale: "en-US",
			orderId: "order-a",
		});
		chinese.setQueryData(["checkout", "order-b"], {
			locale: "zh-CN",
			orderId: "order-b",
		});

		const englishPayload = JSON.stringify(dehydrate(english));
		const chinesePayload = JSON.stringify(dehydrate(chinese));
		expect(englishPayload).toContain("order-a");
		expect(englishPayload).toContain("en-US");
		expect(englishPayload).not.toMatch(/order-b|zh-CN/);
		expect(chinesePayload).toContain("order-b");
		expect(chinesePayload).toContain("zh-CN");
		expect(chinesePayload).not.toMatch(/order-a|en-US/);
	});

	it("deduplicates concurrent reads owned by the same query key", async () => {
		const { queryClient } = getContext();
		let resolve!: (value: string) => void;
		const queryFn = vi.fn(
			() =>
				new Promise<string>((next) => {
					resolve = next;
				}),
		);
		const options = { queryKey: ["dashboard"] as const, queryFn };

		const first = queryClient.fetchQuery(options);
		const second = queryClient.fetchQuery(options);
		resolve("ready");

		await expect(Promise.all([first, second])).resolves.toEqual([
			"ready",
			"ready",
		]);
		expect(queryFn).toHaveBeenCalledOnce();
	});

	it("reuses dehydrated data during the freshness window", async () => {
		const server = getContext().queryClient;
		const queryKey = ["admin", "dashboard"] as const;
		await server.fetchQuery({ queryKey, queryFn: async () => "server" });

		const browser = getContext().queryClient;
		hydrate(browser, dehydrate(server));
		const browserQuery = vi.fn(async () => "browser");

		await expect(
			browser.fetchQuery({ queryKey, queryFn: browserQuery }),
		).resolves.toBe("server");
		expect(browserQuery).not.toHaveBeenCalled();
	});

	it("starts the dashboard prefetch without blocking the route shell", async () => {
		const source = await readFile(
			new URL("../../src/routes/admin/index.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain(
			"void context.queryClient.prefetchQuery(dashboardQuery)",
		);
		expect(source).not.toContain(
			"await context.queryClient.prefetchQuery(dashboardQuery)",
		);
	});

	it("wires the bounded dehydration policy into the Router integration", async () => {
		const source = await readFile(
			new URL("../../src/router.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain("setupRouterSsrQueryIntegration({");
		expect(source).toContain("dehydrateOptions: ssrQueryDehydrateOptions");
	});

	it("keeps intent preloads fresh across the following navigation", async () => {
		const source = await readFile(
			new URL("../../src/router.tsx", import.meta.url),
			"utf8",
		);
		const adminRoute = await readFile(
			new URL("../../src/routes/admin/route.tsx", import.meta.url),
			"utf8",
		);

		expect(source).toContain("defaultPreloadStaleTime: 30_000");
		expect(adminRoute).toContain("gcTime: 0");
		expect(adminRoute).not.toContain("beforeLoad:");
	});

	it("keeps root brand data warm until a brand mutation invalidates it", async () => {
		const rootRoute = await readFile(
			new URL("../../src/routes/__root.tsx", import.meta.url),
			"utf8",
		);
		const brandPage = await readFile(
			new URL("../../src/features/settings/pages/brand.tsx", import.meta.url),
			"utf8",
		);

		expect(rootRoute).toContain("staleTime: 5 * 60_000");
		expect(brandPage).toContain(
			'filter: (match) => match.routeId === "__root__"',
		);
	});

	it("starts payment settings queries from intent-preloaded routes", async () => {
		const cases = [
			["payment-settings/index.tsx", "paymentMethodsQueryOptions"],
			["payment-settings/ingresses.tsx", "paymentIngressesQueryOptions"],
			["payment-settings/rates/index.tsx", 'ratesPageQueryOptions("crypto")'],
			["payment-settings/rates/fiat.tsx", 'ratesPageQueryOptions("fiat")'],
		] as const;

		for (const [file, options] of cases) {
			const route = await readFile(
				new URL(`../../src/routes/admin/${file}`, import.meta.url),
				"utf8",
			);
			expect(route).toContain("context.queryClient.prefetchQuery");
			expect(route).toContain(options);
			expect(route).not.toContain("await context.queryClient.prefetchQuery");
		}
	});

	it("defers receiving-method form options until the create modal opens", async () => {
		const source = await readFile(
			new URL(
				"../../src/features/payment-settings/pages/admin-methods.tsx",
				import.meta.url,
			),
			"utf8",
		);
		const page = source.slice(
			source.indexOf("export function ReceivingMethodsPage"),
			source.indexOf("function CreateReceivingMethodForm"),
		);
		const createForm = source.slice(
			source.indexOf("function CreateReceivingMethodForm"),
			source.indexOf("function ReceivingConfigurationFields"),
		);

		expect(page).not.toContain(
			'queryKey: ["admin", "receiving-method-options"]',
		);
		expect(page).toContain("loading={query.isLoading}");
		expect(page).toContain("onRefresh={() => query.refetch()}");
		expect(createForm).toContain(
			'queryKey: ["admin", "receiving-method-options"]',
		);
		expect(createForm).toContain("enabled: open");
	});
});
