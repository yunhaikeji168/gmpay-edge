import { useCallback, useEffect, useRef } from "react";

const maximumPollingDelayMs = 120_000;

export function pollingDelayMs(failures: number, intervalMs: number) {
	return Math.min(intervalMs * 2 ** failures, maximumPollingDelayMs);
}

export function useVisiblePolling(
	onPoll: () => void | Promise<void>,
	intervalMs = 30_000,
	enabled = true,
) {
	const onPollRef = useRef(onPoll);
	const inFlightRef = useRef<Promise<void> | null>(null);
	const failuresRef = useRef(0);
	const blockedUntilRef = useRef(0);
	onPollRef.current = onPoll;

	const pollNow = useCallback(() => {
		if (inFlightRef.current) return inFlightRef.current;
		const request = Promise.resolve()
			.then(() => onPollRef.current())
			.finally(() => {
				inFlightRef.current = null;
			});
		inFlightRef.current = request;
		return request;
	}, []);
	const pollAfterCurrent = useCallback(async () => {
		const current = inFlightRef.current;
		if (current) await current.catch(() => undefined);
		return pollNow();
	}, [pollNow]);

	useEffect(() => {
		if (!enabled) return;
		const timer = window.setInterval(() => {
			if (
				document.visibilityState === "visible" &&
				navigator.onLine &&
				Date.now() >= blockedUntilRef.current
			) {
				void pollNow().catch(() => undefined);
			}
		}, intervalMs);
		return () => window.clearInterval(timer);
	}, [enabled, intervalMs, pollNow]);

	const markSuccess = useCallback(() => {
		failuresRef.current = 0;
		blockedUntilRef.current = 0;
	}, []);
	const markFailure = useCallback(() => {
		failuresRef.current += 1;
		blockedUntilRef.current =
			Date.now() + pollingDelayMs(failuresRef.current, intervalMs);
	}, [intervalMs]);

	return { markFailure, markSuccess, pollAfterCurrent, pollNow };
}
