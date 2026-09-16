export function operationDeadline(timeoutMs: number) {
	return Date.now() + timeoutMs;
}

export function remainingOperationMs(deadlineAt: number, operation: string) {
	const remainingMs = deadlineAt - Date.now();
	if (remainingMs <= 0)
		throw new DOMException(`${operation} timed out`, "TimeoutError");
	return remainingMs;
}

export function operationSignal(deadlineAt: number, operation: string) {
	return AbortSignal.timeout(remainingOperationMs(deadlineAt, operation));
}
