// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	defaultDirection,
	defaultFont,
	defaultLayoutCollapsible,
	defaultLayoutVariant,
	defaultTheme,
	preferencesStore,
} from "#/stores/preferences-store";

const setCookie = vi.fn().mockResolvedValue(undefined);

describe("UI preferences store", () => {
	beforeEach(() => {
		localStorage.clear();
		setCookie.mockClear();
		Object.defineProperty(globalThis, "cookieStore", {
			configurable: true,
			value: { set: setCookie },
		});
		preferencesStore.actions.resetTheme();
		preferencesStore.actions.resetFont();
		preferencesStore.actions.resetDirection();
		preferencesStore.actions.resetLayout();
	});

	it("shares and persists theme, font and direction changes", () => {
		preferencesStore.actions.setTheme("dark");
		preferencesStore.actions.setFont("inter");
		preferencesStore.actions.setDirection("rtl");

		expect(preferencesStore.state).toMatchObject({
			theme: "dark",
			font: "inter",
			direction: "rtl",
		});
		expect(localStorage.getItem("theme")).toBe("dark");
		expect(localStorage.getItem("font")).toBe("inter");
		expect(localStorage.getItem("direction")).toBe("rtl");

		preferencesStore.actions.resetTheme();
		preferencesStore.actions.resetFont();
		preferencesStore.actions.resetDirection();
		expect(preferencesStore.state).toMatchObject({
			theme: defaultTheme,
			font: defaultFont,
			direction: defaultDirection,
		});
	});

	it("shares layout changes and persists them through cookies", () => {
		preferencesStore.actions.setCollapsible("offcanvas");
		preferencesStore.actions.setVariant("inset");
		expect(preferencesStore.state).toMatchObject({
			collapsible: "offcanvas",
			variant: "inset",
		});
		expect(setCookie).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "layout_collapsible",
				value: "offcanvas",
			}),
		);
		expect(setCookie).toHaveBeenCalledWith(
			expect.objectContaining({ name: "layout_variant", value: "inset" }),
		);

		preferencesStore.actions.resetLayout();
		expect(preferencesStore.state).toMatchObject({
			collapsible: defaultLayoutCollapsible,
			variant: defaultLayoutVariant,
		});
	});

	it("hydrates persisted browser preferences only when requested after mount", () => {
		localStorage.setItem("theme", "dark");
		localStorage.setItem("font", "inter");
		localStorage.setItem("direction", "rtl");
		Reflect.set(document, "cookie", "layout_collapsible=offcanvas; Path=/");
		Reflect.set(document, "cookie", "layout_variant=inset; Path=/");

		expect(preferencesStore.state).toMatchObject({
			theme: defaultTheme,
			font: defaultFont,
			direction: defaultDirection,
		});
		preferencesStore.actions.hydrate();
		expect(preferencesStore.state).toMatchObject({
			theme: "dark",
			font: "inter",
			direction: "rtl",
			collapsible: "offcanvas",
			variant: "inset",
		});
	});
});
