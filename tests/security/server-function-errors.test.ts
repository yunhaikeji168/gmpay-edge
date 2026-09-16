import { toCrossJSONAsync } from "seroval";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { AccessDeniedError } from "#/features/access/server/access-cache";
import { requestId } from "#/server/http";
import {
	normalizeServerFunctionError,
	ServerFunctionError,
} from "#/server/server-function-errors";

const request = new Request("https://pay.example/_serverFn/test", {
	headers: { "x-request-id": "request-server-fn" },
});

describe("Server Function error boundary", () => {
	it("preserves reviewed public errors without exposing a stack", () => {
		const expected = new ServerFunctionError(
			"role_not_found",
			404,
			"Role not found",
		);
		const result = normalizeServerFunctionError(expected, request);

		expect(result).toBe(expected);
		expect(result).toMatchObject({
			code: "role_not_found",
			status: 404,
			message: "Role not found",
		});
		expect(Object.hasOwn(result, "stack")).toBe(false);
	});

	it.each([
		[401, "unauthorized", "Unauthorized"],
		[403, "forbidden", "Forbidden"],
	] as const)("maps access denial %s", (status, code, message) => {
		expect(
			normalizeServerFunctionError(new AccessDeniedError(status), request),
		).toMatchObject({ status, code, message });
	});

	it("maps validator failures without returning submitted values", () => {
		const schema = z.object({ secret: z.string().min(20) });
		const error = schema.safeParse({ secret: "private" }).error;
		const result = normalizeServerFunctionError(error, request);

		expect(result).toMatchObject({
			code: "invalid_input",
			status: 400,
			message: "Invalid request",
		});
		expect(JSON.stringify(result)).not.toContain("private");
	});

	it("replaces unknown failures before Seroval crosses the boundary", async () => {
		const result = normalizeServerFunctionError(
			new Error(
				'Failed query: select * from users params=["secret-token"] at db.ts:12',
			),
			request,
		);

		expect(result).toMatchObject({
			code: "internal_error",
			status: 500,
			message: "Internal server error",
			requestId: "request-server-fn",
		});
		expect(JSON.stringify(result)).not.toMatch(
			/secret-token|select \* from users|db\.ts/,
		);
		const serialized = JSON.stringify(
			await toCrossJSONAsync(result, { refs: new Map(), plugins: [] }),
		);
		expect(serialized).not.toMatch(
			/secret-token|select \* from users|db\.ts|server-function-errors\.ts|stack/,
		);
	});

	it("does not reflect an untrusted request id into an internal error", () => {
		const untrusted = new Request("https://pay.example/_serverFn/test", {
			headers: { "x-request-id": "secret token with spaces" },
		});
		const id = requestId(untrusted);
		expect(id).toMatch(/^[0-9a-f-]{36}$/);
		expect(id).not.toContain("secret");
	});
});
