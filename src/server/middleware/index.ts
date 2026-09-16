import { csrfMiddleware } from "#/server/middleware/csrf";
import { protectedApiMiddleware } from "#/server/middleware/protected-api";

export const requestMiddleware = [
	csrfMiddleware,
	protectedApiMiddleware,
] as const;
