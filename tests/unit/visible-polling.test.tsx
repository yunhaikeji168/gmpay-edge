// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pollingDelayMs, useVisiblePolling } from "#/lib/use-visible-polling";

describe("visible polling", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("uses bounded exponential backoff", () => {
		expect(pollingDelayMs(1, 10_000)).toBe(20_000);
		expect(pollingDelayMs(2, 10_000)).toBe(40_000);
		expect(pollingDelayMs(10, 10_000)).toBe(120_000);
	});

	it("uses a 30 second default for background admin polling", async () => {
		vi.useFakeTimers();
		Object.defineProperty(document, "visibilityState", {
			configurable: true,
			value: "visible",
		});
		Object.defineProperty(navigator, "onLine", {
			configurable: true,
			value: true,
		});
		const poll = vi.fn();
		function Fixture() {
			useVisiblePolling(poll);
			return null;
		}

		const container = document.createElement("div");
		const root = createRoot(container);
		await act(async () => root.render(<Fixture />));
		await act(async () => vi.advanceTimersByTime(29_999));
		expect(poll).not.toHaveBeenCalled();
		await act(async () => vi.advanceTimersByTime(1));
		expect(poll).toHaveBeenCalledOnce();
		await act(async () => root.unmount());
	});

	it("pauses while hidden or offline and backs off after failures", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		let visible = true;
		let online = true;
		Object.defineProperty(document, "visibilityState", {
			configurable: true,
			get: () => (visible ? "visible" : "hidden"),
		});
		Object.defineProperty(navigator, "onLine", {
			configurable: true,
			get: () => online,
		});

		const poll = vi.fn();
		let controls: ReturnType<typeof useVisiblePolling> | undefined;
		function Fixture() {
			controls = useVisiblePolling(poll, 1_000);
			return null;
		}

		const container = document.createElement("div");
		const root = createRoot(container);
		await act(async () => root.render(<Fixture />));

		visible = false;
		await act(async () => vi.advanceTimersByTime(1_000));
		online = false;
		visible = true;
		await act(async () => vi.advanceTimersByTime(1_000));
		expect(poll).not.toHaveBeenCalled();

		online = true;
		controls?.markFailure();
		await act(async () => vi.advanceTimersByTime(1_000));
		expect(poll).not.toHaveBeenCalled();
		await act(async () => vi.advanceTimersByTime(1_000));
		expect(poll).toHaveBeenCalledTimes(1);

		controls?.markFailure();
		await act(async () => vi.advanceTimersByTime(3_000));
		expect(poll).toHaveBeenCalledTimes(1);
		await act(async () => vi.advanceTimersByTime(1_000));
		expect(poll).toHaveBeenCalledTimes(2);

		controls?.markSuccess();
		await act(async () => vi.advanceTimersByTime(1_000));
		expect(poll).toHaveBeenCalledTimes(3);
		await act(async () => root.unmount());
	});

	it("does not start another poll while the previous poll is running", async () => {
		vi.useFakeTimers();
		Object.defineProperty(document, "visibilityState", {
			configurable: true,
			value: "visible",
		});
		Object.defineProperty(navigator, "onLine", {
			configurable: true,
			value: true,
		});
		let finishPoll: (() => void) | undefined;
		const poll = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finishPoll = resolve;
				}),
		);
		function Fixture() {
			useVisiblePolling(poll, 1_000);
			return null;
		}

		const container = document.createElement("div");
		const root = createRoot(container);
		await act(async () => root.render(<Fixture />));
		await act(async () => vi.advanceTimersByTime(3_000));
		expect(poll).toHaveBeenCalledOnce();

		await act(async () => finishPoll?.());
		await act(async () => vi.advanceTimersByTime(1_000));
		expect(poll).toHaveBeenCalledTimes(2);
		await act(async () => root.unmount());
	});

	it("stops and restarts its timer with the enabled state", async () => {
		vi.useFakeTimers();
		const poll = vi.fn();
		function Fixture({ enabled }: { enabled: boolean }) {
			useVisiblePolling(poll, 1_000, enabled);
			return null;
		}

		const container = document.createElement("div");
		const root = createRoot(container);
		await act(async () => root.render(<Fixture enabled={false} />));
		await act(async () => vi.advanceTimersByTime(1_000));
		expect(poll).not.toHaveBeenCalled();

		await act(async () => root.render(<Fixture enabled />));
		await act(async () => vi.advanceTimersByTime(1_000));
		expect(poll).toHaveBeenCalledOnce();
		await act(async () => root.render(<Fixture enabled={false} />));
		await act(async () => vi.advanceTimersByTime(1_000));
		expect(poll).toHaveBeenCalledOnce();
		await act(async () => root.unmount());
	});

	it("queues an explicit refresh behind the current poll", async () => {
		vi.useFakeTimers();
		const finishes: Array<() => void> = [];
		const poll = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finishes.push(resolve);
				}),
		);
		let controls: ReturnType<typeof useVisiblePolling> | undefined;
		function Fixture() {
			controls = useVisiblePolling(poll, 1_000, false);
			return null;
		}

		const container = document.createElement("div");
		const root = createRoot(container);
		await act(async () => root.render(<Fixture />));
		const current = controls?.pollNow();
		await act(async () => Promise.resolve());
		const queued = controls?.pollAfterCurrent();
		expect(poll).toHaveBeenCalledOnce();

		await act(async () => finishes[0]?.());
		await current;
		await act(async () => Promise.resolve());
		expect(poll).toHaveBeenCalledTimes(2);
		await act(async () => finishes[1]?.());
		await queued;
		await act(async () => root.unmount());
	});
});
