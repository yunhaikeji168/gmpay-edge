import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { toCrossJSONAsync } from "seroval";
import { describe, expect, it } from "vitest";

import { paymentOperationErrorMessage } from "#/features/payments/error-message";
import { DomainError } from "#/lib/domain-error";
import { m } from "#/paraglide/messages";
import {
	normalizeServerFunctionError,
	ServerFunctionError,
} from "#/server/server-function-errors";

const request = new Request("https://example.com/_serverFn/payment-decision");

describe("payment admin Server Function error presentation", () => {
	it.each([
		["payment_not_found", m.payments_error_not_found()],
		[
			"payment_decision_already_resolved",
			m.payments_error_decision_already_resolved(),
		],
		[
			"payment_decision_not_available",
			m.payments_error_decision_not_available(),
		],
	] as const)("maps reviewed code %s to localized copy", (code, message) => {
		expect(
			paymentOperationErrorMessage(new ServerFunctionError(code, 409, code)),
		).toBe(message);
	});

	it("hides database, Queue, provider, and binding details", () => {
		expect(
			paymentOperationErrorMessage(
				new Error("D1_ERROR: SELECT order_payments; queue token=secret"),
			),
		).toBe(m.payments_decision_failed());
	});

	it("preserves a reviewed code without serializing a stack", async () => {
		const normalized = normalizeServerFunctionError(
			new DomainError("payment_not_found", 404, "Payment not found"),
			request,
		);
		const serialized = JSON.stringify(
			await toCrossJSONAsync(normalized, { refs: new Map(), plugins: [] }),
		);

		expect(serialized).toContain("payment_not_found");
		expect(serialized).not.toMatch(/stack|SELECT|order_payments|secret/);
	});

	it("does not render raw Error messages in the payment admin page", () => {
		const page = readFileSync(
			fileURLToPath(
				new URL(
					"../../src/features/payments/pages/admin-list.tsx",
					import.meta.url,
				),
			),
			"utf8",
		);

		expect(page).toContain("paymentOperationErrorMessage(error)");
		expect(page).not.toContain("error.message");
	});
});
