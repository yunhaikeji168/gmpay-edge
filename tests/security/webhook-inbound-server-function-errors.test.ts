import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { toCrossJSONAsync } from "seroval";
import { describe, expect, it } from "vitest";

import { webhookOperationErrorMessage } from "#/features/webhooks/error-message";
import { DomainError } from "#/lib/domain-error";
import { m } from "#/paraglide/messages";
import {
	normalizeServerFunctionError,
	ServerFunctionError,
} from "#/server/server-function-errors";

const request = new Request("https://example.com/_serverFn/inbound-webhook");

describe("inbound Webhook Server Function error contract", () => {
	it.each([
		[
			"webhook_inbound_receipt_not_found",
			m.webhooks_error_inbound_receipt_not_found(),
		],
		["webhook_inbound_unavailable", m.webhooks_error_inbound_unavailable()],
	] as const)("maps reviewed code %s to localized copy", (code, message) => {
		expect(
			webhookOperationErrorMessage(new ServerFunctionError(code, 409, code)),
		).toBe(message);
	});

	it("serializes a missing receipt without a stack", async () => {
		const normalized = normalizeServerFunctionError(
			new DomainError(
				"webhook_inbound_receipt_not_found",
				404,
				"Inbound webhook receipt not found",
			),
			request,
		);
		const serialized = JSON.stringify(
			await toCrossJSONAsync(normalized, { refs: new Map(), plugins: [] }),
		);
		expect(serialized).toContain("webhook_inbound_receipt_not_found");
		expect(serialized).not.toMatch(/stack|SELECT|secret/);
	});

	it("redacts unknown D1 and binding details", async () => {
		const normalized = normalizeServerFunctionError(
			new Error("D1_ERROR: SELECT secret; binding=DB"),
			request,
		);
		const serialized = JSON.stringify(
			await toCrossJSONAsync(normalized, { refs: new Map(), plugins: [] }),
		);
		expect(normalized).toMatchObject({ code: "internal_error", status: 500 });
		expect(serialized).not.toMatch(/stack|SELECT|secret|binding=DB/);
		expect(webhookOperationErrorMessage(normalized)).toBe(
			m.webhooks_operation_failed(),
		);
	});

	it("keeps the built-in endpoint catalog read-only", () => {
		const server = readFileSync(
			fileURLToPath(
				new URL("../../src/features/webhooks/server/admin.ts", import.meta.url),
			),
			"utf8",
		);
		expect(server).toContain("listInboundWebhookEndpointsFn");
		expect(server).not.toMatch(
			/(create|update|delete|set)InboundWebhookEndpointFn/,
		);
	});

	it("keeps inbound records in the unified list and detail dialog", () => {
		const page = readFileSync(
			fileURLToPath(
				new URL(
					"../../src/features/webhooks/pages/admin-inbound-records.tsx",
					import.meta.url,
				),
			),
			"utf8",
		);
		expect(page).toContain("listInboundWebhookReceiptsFn");
		expect(page).toContain("InboundWebhookReceiptDetailsDialog");
		expect(page).not.toContain('to="/admin/webhooks/$endpointId"');
	});

	it("renders one page-level heading on the inbound endpoint list", () => {
		const page = readFileSync(
			fileURLToPath(
				new URL(
					"../../src/features/webhooks/pages/admin-inbound.tsx",
					import.meta.url,
				),
			),
			"utf8",
		);
		expect(page).toContain("title={m.webhooks_inbound_title()}");
		expect(page).not.toContain("InboundWebhookEndpointPage");
	});

	it("defines inbound errors in all six locale resources", () => {
		for (const locale of [
			"en-US",
			"ja-JP",
			"ko-KR",
			"ru-RU",
			"zh-TW",
			"zh-CN",
		]) {
			const messages = JSON.parse(
				readFileSync(
					fileURLToPath(
						new URL(`../../messages/${locale}.json`, import.meta.url),
					),
					"utf8",
				),
			) as Record<string, unknown>;
			for (const key of [
				"webhooks_error_inbound_receipt_not_found",
				"webhooks_error_inbound_unavailable",
			])
				expect(messages[key], `${locale}:${key}`).toBeTruthy();
		}
	});
});
