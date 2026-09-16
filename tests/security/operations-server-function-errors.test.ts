import { describe, expect, it } from "vitest";
import { operationsErrorMessage } from "#/features/operations/error-message";
import { OperationTaskAlreadyRunningError } from "#/features/operations/server/task-runs";
import { DomainError } from "#/lib/domain-error";
import { normalizeServerFunctionError } from "#/server/server-function-errors";

describe("operations Server Function errors", () => {
	it("normalizes an overlapping task to the reviewed conflict contract", () => {
		const error = normalizeServerFunctionError(
			new OperationTaskAlreadyRunningError("rpc_health", "attempt", "active"),
			new Request("https://example.com/admin/operations/jobs"),
		);

		expect(error).toMatchObject({ code: "already_running", status: 409 });
		expect(error).not.toHaveProperty("task");
		expect(error).not.toHaveProperty("attemptId");
		expect(error).not.toHaveProperty("activeRunId");
	});

	it("maps only reviewed codes and never renders an unknown raw message", () => {
		const fallback = () => "safe fallback";

		expect(operationsErrorMessage({ code: "already_running" }, fallback)).toBe(
			"Already running",
		);
		expect(
			operationsErrorMessage({ code: "binding_unavailable" }, fallback),
		).toBe("Required binding unavailable");
		expect(
			operationsErrorMessage(
				{ code: "internal_error", message: "SQL token=secret" },
				fallback,
			),
		).toBe("safe fallback");
	});

	it("normalizes expected runtime failures without provider details", () => {
		for (const error of [
			new DomainError(
				"queue_enqueue_failed",
				502,
				"Payment Queue rejected the retry batch",
			),
			new DomainError(
				"storage_write_failed",
				502,
				"Audit export could not be written to storage",
			),
		]) {
			const normalized = normalizeServerFunctionError(
				error,
				new Request("https://example.com/admin/operations"),
			);
			expect(normalized).toMatchObject({ code: error.code, status: 502 });
			expect(JSON.stringify(normalized)).not.toContain("secret");
		}
	});
});
