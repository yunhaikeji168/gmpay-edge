import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { toCrossJSONAsync } from "seroval";
import { describe, expect, it } from "vitest";

import { orderOperationErrorMessage } from "#/features/orders/error-message";
import { DomainError } from "#/lib/domain-error";
import { m } from "#/paraglide/messages";
import {
	normalizeServerFunctionError,
	ServerFunctionError,
} from "#/server/server-function-errors";

const request = new Request("https://example.com/_serverFn/order-operation");

describe("order Server Function error presentation", () => {
	it.each([
		["order_not_found", m.orders_error_not_found()],
		["order_payment_target_not_found", m.orders_error_not_found()],
		["order_development_only", m.orders_error_development_only()],
		["order_status_conflict", m.orders_error_status_conflict()],
		[
			"order_payment_queue_unavailable",
			m.orders_error_payment_queue_unavailable(),
		],
		[
			"order_webhook_queue_unavailable",
			m.orders_error_webhook_queue_unavailable(),
		],
		["order_notification_missing", m.orders_error_notification_missing()],
		["order_mock_only", m.orders_error_mock_only()],
	] as const)("maps reviewed code %s to localized copy", (code, message) => {
		expect(
			orderOperationErrorMessage(new ServerFunctionError(code, 409, code)),
		).toBe(message);
	});

	it("hides persistence, provider, and binding details from order toasts", () => {
		expect(
			orderOperationErrorMessage(
				new Error("D1_ERROR: SELECT notify_url; queue token=secret"),
			),
		).toBe(m.orders_operation_failed());
	});

	it("preserves a reviewed order code without serializing a stack", async () => {
		const normalized = normalizeServerFunctionError(
			new DomainError(
				"order_status_conflict",
				409,
				"Order status does not allow this operation",
			),
			request,
		);
		const serialized = JSON.stringify(
			await toCrossJSONAsync(normalized, { refs: new Map(), plugins: [] }),
		);

		expect(serialized).toContain("order_status_conflict");
		expect(serialized).not.toMatch(/stack|SELECT|notify_url|secret/);
	});

	it("does not render raw Error messages in the order admin page", () => {
		const page = readFileSync(
			fileURLToPath(
				new URL(
					"../../src/features/orders/pages/admin-list.tsx",
					import.meta.url,
				),
			),
			"utf8",
		);

		expect(page).toContain("orderOperationErrorMessage(error)");
		expect(page).not.toContain("error.message");
	});
});
