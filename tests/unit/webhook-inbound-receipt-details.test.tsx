// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({
	getInboundWebhookReceiptFn: vi.fn(),
}));

vi.mock("#/features/webhooks/server/admin", () => ({
	getInboundWebhookReceiptFn: server.getInboundWebhookReceiptFn,
	listInboundWebhookReceiptsFn: vi.fn(),
}));

import { InboundWebhookReceiptDetailsDialog } from "#/features/webhooks/pages/admin-inbound-records";
import { m } from "#/paraglide/messages";

describe("inbound Webhook receipt details", () => {
	let container: HTMLDivElement | undefined;
	let root: ReturnType<typeof createRoot> | undefined;

	afterEach(async () => {
		if (root) await act(async () => root?.unmount());
		container?.remove();
		container = undefined;
		root = undefined;
		server.getInboundWebhookReceiptFn.mockReset();
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
					<InboundWebhookReceiptDetailsDialog
						receiptId="00000000-0000-4000-8000-000000000001"
						onClose={vi.fn()}
					/>
				</QueryClientProvider>,
			);
		});
	}

	it("loads and renders the stored receipt metadata", async () => {
		server.getInboundWebhookReceiptFn.mockResolvedValue({
			id: "00000000-0000-4000-8000-000000000001",
			endpointCode: "okpay.notify",
			requestId: "request-a",
			method: "POST",
			requestPath: "/api/providers/okpay/notify",
			signatureStatus: "invalid",
			processingStatus: "rejected",
			responseStatus: 401,
			durationMs: 7,
			errorCode: "invalid_signature",
			receivedAt: "2026-07-21T00:00:00.000Z",
		});
		await renderDialog();
		await vi.waitFor(() => {
			expect(document.body.textContent).toContain("request-a");
		});
		expect(document.body.textContent).toContain("okpay.notify");
		expect(document.body.textContent).toContain("invalid_signature");
		expect(document.body.textContent).toContain("/api/providers/okpay/notify");
	});

	it("shows a retry action when detail loading fails", async () => {
		server.getInboundWebhookReceiptFn.mockRejectedValue(
			new Error("temporarily unavailable"),
		);
		await renderDialog();
		await vi.waitFor(() => {
			expect(document.body.textContent).toContain(
				m.webhooks_inbound_record_details_load_failed(),
			);
		});
		const retry = Array.from(document.querySelectorAll("button")).find(
			(button) => button.textContent?.trim() === m.webhooks_retry_load(),
		);
		expect(retry).toBeDefined();
		await act(async () => retry?.click());
		await vi.waitFor(() =>
			expect(server.getInboundWebhookReceiptFn).toHaveBeenCalledTimes(2),
		);
	});
});
