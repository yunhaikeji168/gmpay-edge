import { useSyncExternalStore } from "react";

const clockSubscribers = new Set<() => void>();
let clockTimer: number | undefined;
let currentNow = Date.now();

function subscribeClock(callback: () => void) {
	currentNow = Date.now();
	clockSubscribers.add(callback);
	if (clockTimer === undefined) {
		clockTimer = window.setInterval(() => {
			currentNow = Date.now();
			for (const subscriber of clockSubscribers) {
				subscriber();
			}
		}, 1000);
	}
	return () => {
		clockSubscribers.delete(callback);
		if (clockSubscribers.size === 0 && clockTimer !== undefined) {
			window.clearInterval(clockTimer);
			clockTimer = undefined;
		}
	};
}

function getNow() {
	return currentNow;
}

export function useNow(initialNow: number, enabled: boolean) {
	return useSyncExternalStore(
		enabled ? subscribeClock : () => () => undefined,
		getNow,
		() => initialNow,
	);
}
