// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({
	getAdminWebhookDeliveryFn: vi.fn(),
}));

vi.mock("#/features/webhooks/server/admin", () => ({
	getAdminWebhookDeliveryFn: server.getAdminWebhookDeliveryFn,
	listAdminWebhooksFn: vi.fn(),
	retryWebhookDeliveryFn: vi.fn(),
}));

import { WebhookDeliveryDetailsDialog } from "#/features/webhooks/pages/admin";
import { m } from "#/paraglide/messages";

describe("Webhook delivery details", () => {
	let container: HTMLDivElement | undefined;
	let root: ReturnType<typeof createRoot> | undefined;

	afterEach(async () => {
		if (root) await act(async () => root?.unmount());
		container?.remove();
		container = undefined;
		root = undefined;
		server.getAdminWebhookDeliveryFn.mockReset();
	});

	async function renderDialog() {
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		await act(async () => {
			root?.render(
				<QueryClientProvider client={client}>
					<WebhookDeliveryDetailsDialog
						deliveryId="00000000-0000-4000-8000-000000000001"
						onClose={vi.fn()}
					/>
				</QueryClientProvider>,
			);
		});
	}

	it("loads and renders redacted request diagnostics", async () => {
		server.getAdminWebhookDeliveryFn.mockResolvedValue({
			id: "delivery-id",
			status: "failed",
			attemptCount: 1,
			protocol: "gmpay",
			url: "https://merchant.example/notify",
			order: { id: "order-id", externalOrderId: "MERCHANT-100" },
			apiKey: { id: "key-id", name: "Production", pid: "gm_prod" },
			event: {
				id: "event-id",
				type: "order.paid",
				payload: { status: "paid" },
				createdAt: "2026-07-14T00:00:00.000Z",
			},
			attempts: [
				{
					attempt: 1,
					requestId: "request-id",
					responseStatus: 500,
					durationMs: 123,
					errorCode: "http_error",
					responseExcerpt: '{"message":"rejected"}',
					requestSnapshot: {
						method: "POST",
						url: "https://merchant.example/notify",
						headers: { "x-gmpay-signature": "[REDACTED]" },
						body: { signature: "[REDACTED]", status: "paid" },
						query: null,
					},
					attemptedAt: "2026-07-14T00:00:01.000Z",
				},
			],
			nextAttemptAt: "2026-07-14T00:01:00.000Z",
			completedAt: null,
			createdAt: "2026-07-14T00:00:00.000Z",
			updatedAt: "2026-07-14T00:00:01.000Z",
		});
		await renderDialog();
		await vi.waitFor(() => {
			expect(document.body.textContent).toContain("MERCHANT-100");
		});
		expect(document.body.textContent).toContain("request-id");
		expect(document.body.textContent).toContain("[REDACTED]");
		expect(document.body.textContent).not.toContain("merchant-secret");
	});

	it("shows a recoverable error when detail loading fails", async () => {
		server.getAdminWebhookDeliveryFn.mockRejectedValue(
			new Error("temporarily unavailable"),
		);
		await renderDialog();
		await vi.waitFor(() => {
			expect(document.body.textContent).toContain(
				m.webhooks_details_load_failed(),
			);
		});
		const retry = Array.from(document.querySelectorAll("button")).find(
			(button) => button.textContent?.trim() === m.webhooks_retry_load(),
		);
		expect(retry).toBeDefined();
		await act(async () => retry?.click());
		await vi.waitFor(() =>
			expect(server.getAdminWebhookDeliveryFn).toHaveBeenCalledTimes(2),
		);
	});
});
