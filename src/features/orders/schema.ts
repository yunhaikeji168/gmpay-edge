import { z } from "zod";
import { orderIdPattern } from "#/features/orders/order-id";
import { isSafeWebhookUrl } from "#/lib/webhook-url";

export const orderStatuses = [
	"pending",
	"confirming",
	"paid",
	"partially_paid",
	"overpaid",
	"expired",
	"cancelled",
	"failed",
	"refunded",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const orderIdPathSchema = z.string().regex(orderIdPattern);
export const orderAmountSchema = z
	.string()
	.regex(/^(0|[1-9]\d*)(\.\d{1,8})?$/)
	.refine(
		(value) => value !== "0" && !/^0\.0+$/.test(value),
		"Amount must be positive",
	);
export const orderCurrencySchema = z
	.string()
	.length(3)
	.transform((value) => value.toUpperCase())
	.default("USD");
export const orderDraftSchema = z.object({
	amount: orderAmountSchema,
	currency: orderCurrencySchema,
});

export const createOrderSchema = z
	.object({
		externalOrderId: z.string().trim().min(1).max(128),
		amount: orderAmountSchema,
		currency: orderCurrencySchema,
		receivingMethodId: z.string().trim().min(1).max(100).optional(),
		paymentAsset: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z0-9_-]{2,20}$/)
			.optional(),
		paymentNetwork: z
			.string()
			.trim()
			.toLowerCase()
			.regex(/^[a-z0-9-]{2,32}$/)
			.optional(),
		description: z.string().max(500).optional(),
		returnUrl: z
			.url()
			.refine(
				(value) => value.startsWith("https://"),
				"Return URL must use HTTPS",
			)
			.optional(),
		notifyUrl: z
			.url()
			.refine(isSafeWebhookUrl, "Notify URL must be a public HTTPS endpoint")
			.optional(),
		metadata: z.record(z.string(), z.string().max(500)).optional(),
		expiresInMs: z.number().int().min(60_000).max(604_800_000).optional(),
	})
	.superRefine((value, context) => {
		if (Boolean(value.paymentAsset) === Boolean(value.paymentNetwork)) return;
		context.addIssue({
			code: "custom",
			message: "Payment asset and network must be provided together",
			path: [value.paymentAsset ? "paymentNetwork" : "paymentAsset"],
		});
	});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
