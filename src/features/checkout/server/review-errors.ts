import { z } from "zod";
import { PaymentReviewError } from "#/features/payment-reviews/server/create";

export function mapCheckoutReviewError(error: unknown) {
	if (error instanceof PaymentReviewError)
		return { code: error.code, status: error.status };
	if (error instanceof z.ZodError)
		return { code: "invalid_request", status: 422 } as const;
	return { code: "internal_error", status: 500 } as const;
}
