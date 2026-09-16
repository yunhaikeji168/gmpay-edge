import { afterEach, describe, expect, it, vi } from "vitest";
import {
	observeProviderOperation,
	recordProviderOperation,
} from "#/integrations/provider-observability";

describe("provider operation observability", () => {
	afterEach(() => vi.restoreAllMocks());

	it("records only fixed fields and bounded operation counters", async () => {
		const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
		vi.spyOn(Math, "random").mockReturnValue(0);
		vi.spyOn(performance, "now")
			.mockReturnValueOnce(10)
			.mockReturnValueOnce(22.34);

		await expect(
			observeProviderOperation(
				{
					adapter: "binance",
					operation: "find_transactions",
					classifyError: () => "permanent",
				},
				async (counters) => {
					counters.request();
					counters.request();
					counters.retry();
					counters.page();
					return [];
				},
			),
		).resolves.toEqual([]);
		expect(info).toHaveBeenCalledWith({
			event: "provider_operation",
			adapter: "binance",
			operation: "find_transactions",
			outcome: "success",
			status: "empty",
			errorCode: null,
			durationMs: 12.3,
			sampleRate: 0.1,
			timeoutCount: 0,
			retryCount: 1,
			requestCount: 2,
			paginationRequestCount: 1,
		});
	});

	it("samples successful operations but always records failures", () => {
		const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
		const base = {
			adapter: "okpay" as const,
			operation: "health_check" as const,
			status: "ok" as const,
			errorCode: null,
			durationMs: 1,
			timeoutCount: 0,
			retryCount: 0,
			requestCount: 1,
			paginationRequestCount: 0,
		};
		recordProviderOperation({ ...base, outcome: "success" }, () => 0.9);
		expect(info).not.toHaveBeenCalled();
		recordProviderOperation(
			{
				...base,
				outcome: "failure",
				status: "error",
				errorCode: "network",
			},
			() => 0.9,
		);
		expect(info).toHaveBeenCalledWith(
			expect.objectContaining({ outcome: "failure", sampleRate: 1 }),
		);
	});

	it("normalizes failures without logging provider-controlled text", async () => {
		const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
		const sensitive =
			"https://uid:secret@provider.example/address/tx?signature=private";

		await expect(
			observeProviderOperation(
				{
					adapter: "okx",
					operation: "get_transaction",
					classifyError: () => "authentication",
				},
				async (counters) => {
					counters.request();
					throw new Error(sensitive);
				},
			),
		).rejects.toThrow(sensitive);

		const metric = info.mock.calls[0]?.[0];
		expect(metric).toMatchObject({
			event: "provider_operation",
			adapter: "okx",
			operation: "get_transaction",
			outcome: "failure",
			status: "error",
			errorCode: "authentication",
			requestCount: 1,
		});
		expect(JSON.stringify(metric)).not.toContain(sensitive);
		expect(metric).not.toHaveProperty("url");
		expect(metric).not.toHaveProperty("body");
	});

	it("distinguishes timeout failures from caller cancellation", async () => {
		const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
		await expect(
			observeProviderOperation(
				{
					adapter: "evm",
					operation: "health_check",
					classifyError: () => "network",
				},
				async () => {
					throw new DOMException("provider details", "TimeoutError");
				},
			),
		).rejects.toThrow();
		expect(info).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: "timeout",
				errorCode: "timeout",
				timeoutCount: 1,
			}),
		);

		await expect(
			observeProviderOperation(
				{
					adapter: "evm",
					operation: "health_check",
					classifyError: () => "network",
				},
				async () => {
					throw new DOMException("caller cancelled", "AbortError");
				},
			),
		).rejects.toThrow();
		expect(info).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: "error",
				errorCode: "network",
				timeoutCount: 0,
			}),
		);
	});
});
