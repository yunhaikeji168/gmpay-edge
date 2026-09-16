// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimatedCharacters } from "#/features/auth/components/animated-characters";

const gsap = vi.hoisted(() => ({
	killTweensOf: vi.fn(),
	quickTo: vi.fn(() => vi.fn()),
	registerPlugin: vi.fn(),
	set: vi.fn(),
	to: vi.fn(),
}));

vi.mock("gsap", () => ({ default: gsap }));
vi.mock("@gsap/react", async () => {
	const { useEffect } = await import("react");
	return {
		useGSAP: (
			callback: () => void,
			options?: { dependencies?: readonly unknown[] },
		) => {
			useEffect(callback, options?.dependencies ?? []);
			return {
				contextSafe: <T extends (...arguments_: never[]) => unknown>(
					value: T,
				) => value,
			};
		},
	};
});

describe("auth animation reduced motion", () => {
	let container: HTMLDivElement;
	let matches = false;
	const listeners = new Set<() => void>();

	beforeEach(() => {
		matches = false;
		(
			globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
		).IS_REACT_ACT_ENVIRONMENT = true;
		vi.useFakeTimers();
		vi.spyOn(Math, "random").mockReturnValue(0);
		container = document.createElement("div");
		document.body.appendChild(container);
		Object.defineProperty(window, "matchMedia", {
			configurable: true,
			value: vi.fn(() => ({
				addEventListener: (_event: string, listener: () => void) =>
					listeners.add(listener),
				get matches() {
					return matches;
				},
				removeEventListener: (_event: string, listener: () => void) =>
					listeners.delete(listener),
			})),
		});
		vi.stubGlobal(
			"requestAnimationFrame",
			vi.fn(() => 1),
		);
		vi.stubGlobal("cancelAnimationFrame", vi.fn());
	});

	afterEach(() => {
		delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
			.IS_REACT_ACT_ENVIRONMENT;
		container.remove();
		listeners.clear();
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("does not start animation work when reduced motion is already enabled", () => {
		matches = true;
		const root = createRoot(container);
		act(() => root.render(<AnimatedCharacters />));

		expect(requestAnimationFrame).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);

		act(() => root.unmount());
	});

	it("cancels RAF and every nested animation timer when preference changes", () => {
		const root = createRoot(container);
		act(() =>
			root.render(
				<AnimatedCharacters passwordLength={1} showPassword={true} />,
			),
		);
		expect(requestAnimationFrame).toHaveBeenCalledOnce();
		expect(vi.getTimerCount()).toBe(3);

		act(() => vi.advanceTimersByTime(3_100));
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		matches = true;
		act(() => {
			for (const listener of listeners) listener();
		});

		expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
		expect(vi.getTimerCount()).toBe(0);

		act(() => root.unmount());
	});
});
