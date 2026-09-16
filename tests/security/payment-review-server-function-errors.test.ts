import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { toCrossJSONAsync } from "seroval";
import { describe, expect, it } from "vitest";

import { paymentReviewErrorMessage } from "#/features/payment-reviews/error-message";
import { DomainError } from "#/lib/domain-error";
import { m } from "#/paraglide/messages";
import {
	normalizeServerFunctionError,
	ServerFunctionError,
} from "#/server/server-function-errors";

const request = new Request("https://example.com/_serverFn/payment-review");

describe("Payment review Server Function error presentation", () => {
	it.each([
		["payment_review_not_found", m.payment_reviews_error_not_found()],
		[
			"payment_review_already_resolved",
			m.payment_reviews_error_already_resolved(),
		],
		[
			"payment_review_transaction_required",
			m.payment_reviews_error_transaction_required(),
		],
		[
			"payment_review_transaction_not_found",
			m.payment_reviews_error_transaction_not_found(),
		],
		[
			"payment_review_transaction_mismatch",
			m.payment_reviews_error_transaction_mismatch(),
		],
		[
			"payment_review_transaction_unavailable",
			m.payment_reviews_error_transaction_unavailable(),
		],
		[
			"payment_review_resolution_conflict",
			m.payment_reviews_error_resolution_conflict(),
		],
		[
			"payment_review_service_unavailable",
			m.payment_reviews_error_service_unavailable(),
		],
	] as const)("maps reviewed code %s to localized copy", (code, message) => {
		expect(
			paymentReviewErrorMessage(new ServerFunctionError(code, 409, code)),
		).toBe(message);
	});

	it("does not show database or provider details", () => {
		expect(
			paymentReviewErrorMessage(
				new Error("D1_ERROR: SELECT secret; provider token=unsafe"),
			),
		).toBe(m.payment_reviews_resolve_failed());
	});

	it("normalizes unknown persistence failures to a redacted internal error", async () => {
		const normalized = normalizeServerFunctionError(
			new Error("D1_ERROR: SELECT api_secret FROM settings; provider=unsafe"),
			request,
		);
		const serialized = JSON.stringify(
			await toCrossJSONAsync(normalized, { refs: new Map(), plugins: [] }),
		);
		expect(normalized).toMatchObject({ code: "internal_error", status: 500 });
		expect(serialized).not.toMatch(/stack|SELECT|api_secret|provider=unsafe/);
	});

	it("serializes a reviewed conflict without a stack", async () => {
		const error = normalizeServerFunctionError(
			new DomainError(
				"payment_review_resolution_conflict",
				409,
				"Payment review was resolved concurrently",
			),
			request,
		);
		const serialized = JSON.stringify(
			await toCrossJSONAsync(error, { refs: new Map(), plugins: [] }),
		);

		expect(serialized).toContain("payment_review_resolution_conflict");
		expect(serialized).not.toMatch(/stack|SELECT|secret|token/);
	});

	it("never renders arbitrary error messages in the admin page", () => {
		const page = readFileSync(
			fileURLToPath(
				new URL(
					"../../src/features/payment-reviews/pages/admin-list.tsx",
					import.meta.url,
				),
			),
			"utf8",
		);
		expect(page).toContain("paymentReviewErrorMessage(error)");
		expect(page).not.toContain("error.message");
	});

	it("defines every reviewed error in all six locale resources", () => {
		const keys = [
			"payment_reviews_error_not_found",
			"payment_reviews_error_already_resolved",
			"payment_reviews_error_transaction_required",
			"payment_reviews_error_transaction_not_found",
			"payment_reviews_error_transaction_mismatch",
			"payment_reviews_error_transaction_unavailable",
			"payment_reviews_error_resolution_conflict",
			"payment_reviews_error_service_unavailable",
		];
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
			for (const key of keys)
				expect(messages[key], `${locale}:${key}`).toBeTruthy();
		}
	});
});
