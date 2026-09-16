import type { z } from "zod";
import {
	type paymentOptionInput,
	selectCheckoutPaymentOption,
} from "#/features/checkout/server/payment-options";
import { claimCheckoutRateLimit } from "#/features/checkout/server/rate-limit";
import {
	type CheckoutTransactionSubmission,
	submitCheckoutTransaction,
} from "#/features/checkout/server/submit-transaction";
import type { PaymentRuntime } from "#/features/payments/server/payment-events";
import { DomainError } from "#/lib/domain-error";

export async function selectCheckoutPaymentOptionForRequest(
	env: Pick<Env, "DB">,
	input: z.infer<typeof paymentOptionInput>,
	clientAddress: string,
) {
	const limit = await claimCheckoutRateLimit(env.DB, {
		action: "option",
		orderId: input.orderId,
		clientAddress,
	});
	if (!limit.allowed)
		throw new DomainError(
			"payment_option_rate_limited",
			429,
			"Too many payment option changes",
		);
	return selectCheckoutPaymentOption(env.DB, input);
}

export async function submitCheckoutTransactionForRequest(
	env: PaymentRuntime,
	input: CheckoutTransactionSubmission,
	clientAddress: string,
	createAdapters?: Parameters<typeof submitCheckoutTransaction>[2],
) {
	const limit = await claimCheckoutRateLimit(env.DB, {
		action: "transaction",
		orderId: input.orderId,
		clientAddress,
	});
	if (!limit.allowed)
		throw new DomainError(
			"transaction_rate_limited",
			429,
			"Too many transaction verification attempts",
		);
	return submitCheckoutTransaction(env, input, createAdapters);
}
