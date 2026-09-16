import { AccessDeniedError } from "#/features/access/server/access-cache";
import { apiError } from "#/server/http";

export function adminAccessErrorResponse(request: Request, error: unknown) {
	if (error instanceof AccessDeniedError)
		return apiError(
			request,
			error.status,
			error.status === 401 ? "unauthorized" : "forbidden",
			error.message,
		);
	return apiError(request, 500, "internal_error", "Internal server error");
}
