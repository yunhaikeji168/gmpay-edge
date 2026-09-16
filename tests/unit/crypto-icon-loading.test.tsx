// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssetIcon } from "#/components/crypto-icons/crypto-icon";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("crypto icon loading", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("loads the token catalog only after every direct image mirror fails", async () => {
		const fetchMock = vi.fn(async () => ({ ok: false }));
		vi.stubGlobal("fetch", fetchMock);
		const container = document.createElement("div");
		const root = createRoot(container);

		await act(async () => {
			root.render(<AssetIcon network="ethereum" />);
		});
		expect(fetchMock).not.toHaveBeenCalled();

		for (let mirror = 0; mirror < 4; mirror += 1) {
			const image = container.querySelector("img");
			expect(image).not.toBeNull();
			await act(async () => {
				image?.dispatchEvent(new Event("error"));
				await Promise.resolve();
			});
		}

		expect(fetchMock).toHaveBeenCalledTimes(4);
		expect(container.querySelector("img")).toBeNull();
		await act(async () => root.unmount());
	});
});
