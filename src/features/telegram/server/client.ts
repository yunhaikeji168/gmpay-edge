import { Api, GrammyError, HttpError } from "grammy";

export function createTelegramApi(
	token: string,
	request: typeof fetch = fetch,
	environment: "prod" | "test" = "prod",
) {
	return new Api(token, {
		fetch: request,
		timeoutSeconds: 8,
		sensitiveLogs: false,
		environment,
	});
}

export class TelegramApiRequestError extends Error {
	readonly code: "api_rejected" | "transport_error" | "request_failed";

	constructor(error: unknown) {
		const code =
			error instanceof GrammyError
				? "api_rejected"
				: error instanceof HttpError
					? "transport_error"
					: "request_failed";
		super("Telegram Bot API request failed");
		this.name = "TelegramApiRequestError";
		this.code = code;
	}
}
