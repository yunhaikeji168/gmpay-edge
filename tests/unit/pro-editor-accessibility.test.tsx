// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ProEditor } from "#/components/pro/editor";
import { m } from "#/paraglide/messages";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("ProEditor accessibility", () => {
	let container: HTMLDivElement | undefined;

	afterEach(() => {
		container?.remove();
		container = undefined;
	});

	it("names both the editor and rendered preview", async () => {
		container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(
				<ProEditor
					toolbarTitle="Telegram template"
					value="**paid**"
					preview={{ component: ({ content }) => <p>{content}</p> }}
				/>,
			);
		});

		expect(
			container.querySelector("textarea")?.getAttribute("aria-label"),
		).toBe("Telegram template");
		expect(
			container
				.querySelector("section[aria-label]")
				?.getAttribute("aria-label"),
		).toBe(m.common_preview());

		await act(async () => root.unmount());
	});
});
