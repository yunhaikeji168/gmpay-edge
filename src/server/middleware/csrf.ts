import { createCsrfMiddleware } from "@tanstack/react-start";

export const csrfMiddleware = createCsrfMiddleware({
	filter: (context) => context.handlerType === "serverFn",
});
