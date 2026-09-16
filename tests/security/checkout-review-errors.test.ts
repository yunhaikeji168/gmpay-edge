import { describe, expect, it } from "vitest";
import { mapCheckoutReviewError } from "#/features/checkout/server/review-errors";
import { PaymentReviewError } from "#/features/payment-reviews/server/create";

describe("checkout review HTTP error boundary", () => {
	it("preserves reviewed public review failures", () => {
		expect(
			mapCheckoutReviewError(new PaymentReviewError("review_exists", 409)),
		).toEqual({ code: "review_exists", status: 409 });
	});

	it("maps unknown D1 and storage details to an internal error", () => {
		const mapped = mapCheckoutReviewError(
			new Error("D1_ERROR: SELECT secret; R2 token=unsafe"),
		);
		expect(mapped).toEqual({ code: "internal_error", status: 500 });
		expect(JSON.stringify(mapped)).not.toContain("secret");
	});
});
