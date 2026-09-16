// @vitest-environment jsdom

import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNow } from "#/features/checkout/use-checkout-clock";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.useRealTimers());

function Clock({ initialNow }: { initialNow: number }) {
	return <span>{useNow(initialNow, true)}</span>;
}

describe("checkout clock", () => {
	it("uses a request-owned server snapshot", () => {
		expect(renderToString(<Clock initialNow={100} />)).toContain(">100<");
		expect(renderToString(<Clock initialNow={200} />)).toContain(">200<");
	});

	it("hydrates from the loader timestamp before switching to the live clock", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(900);
		const container = document.createElement("div");
		container.innerHTML = renderToString(<Clock initialNow={100} />);
		const recoverableErrors: unknown[] = [];
		let root: ReturnType<typeof hydrateRoot>;
		await act(async () => {
			root = hydrateRoot(container, <Clock initialNow={100} />, {
				onRecoverableError: (error) => recoverableErrors.push(error),
			});
		});
		expect(recoverableErrors).toEqual([]);
		expect(container.textContent).toBe("900");
		await act(async () => root.unmount());
	});
});
