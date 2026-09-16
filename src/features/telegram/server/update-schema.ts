import { z } from "zod";

const telegramUserSchema = z.object({
	id: z.number().int(),
	language_code: z.string().max(35).optional(),
	username: z.string().max(32).optional(),
	first_name: z.string().max(64).optional(),
	last_name: z.string().max(64).optional(),
});
const telegramChatSchema = z.object({
	id: z.number().int(),
	type: z.enum(["private", "group", "supergroup", "channel"]),
	title: z.string().max(255).optional(),
	username: z.string().max(32).optional(),
	first_name: z.string().max(64).optional(),
	last_name: z.string().max(64).optional(),
});
const telegramMessageSchema = z.object({
	chat: telegramChatSchema,
	from: telegramUserSchema.optional(),
	text: z.string().max(4_096).optional(),
});
const telegramUpdateSchema = z
	.object({
		update_id: z.number().int().nonnegative(),
		message: telegramMessageSchema.optional(),
		inline_query: z
			.object({
				id: z.string().min(1).max(128),
				from: telegramUserSchema,
				query: z.string().max(256),
			})
			.optional(),
		chosen_inline_result: z
			.object({
				result_id: z.string().min(1).max(128),
				from: telegramUserSchema,
				query: z.string().max(256),
				inline_message_id: z.string().min(1).max(512).optional(),
			})
			.optional(),
		callback_query: z
			.object({
				id: z.string().min(1).max(128),
				from: telegramUserSchema,
				data: z.string().max(64).optional(),
				message: telegramMessageSchema.optional(),
			})
			.optional(),
		my_chat_member: z
			.object({
				chat: telegramChatSchema,
				from: telegramUserSchema,
				date: z.number().int().nonnegative(),
				old_chat_member: z.object({
					status: z.string().min(1).max(32),
					is_member: z.boolean().optional(),
				}),
				new_chat_member: z.object({
					status: z.string().min(1).max(32),
					is_member: z.boolean().optional(),
				}),
			})
			.optional(),
	})
	.refine((update) =>
		Boolean(
			update.message ||
				update.inline_query ||
				update.chosen_inline_result ||
				update.callback_query ||
				update.my_chat_member,
		),
	);

export type TelegramUpdateInput = z.infer<typeof telegramUpdateSchema>;

export function parseTelegramUpdate(value: unknown) {
	return telegramUpdateSchema.safeParse(value);
}
