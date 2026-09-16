// @vitest-environment jsdom

import type { ColumnDef, ColumnPinningState } from "@tanstack/react-table";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProTable } from "#/components/pro/table";
import { m } from "#/paraglide/messages";

type Row = { name: string; status: string };
const data: Row[] = [{ name: "Alpha", status: "Ready" }];
(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("ProTable column settings", () => {
	let container: HTMLDivElement | undefined;
	let root: Root | undefined;

	afterEach(async () => {
		vi.restoreAllMocks();
		if (root) await act(async () => root?.unmount());
		container?.remove();
		container = undefined;
		root = undefined;
	});

	it("keeps visibility and pinning when equivalent column definitions rerender", async () => {
		await render(columns());
		await openColumnSettings();

		const statusRow = columnSetting("Status");
		const statusCheckbox =
			statusRow.querySelector<HTMLButtonElement>('[role="checkbox"]');
		const pinLeft = statusRow.querySelector<HTMLButtonElement>(
			`button[aria-label="${m.pro_action_pinLeft()}"]`,
		);
		expect(statusCheckbox).not.toBeNull();
		expect(pinLeft).not.toBeNull();

		await act(async () => statusRow.querySelector("label")?.click());
		expect(headerTexts()).toEqual(["Name"]);
		expect(statusCheckbox?.getAttribute("data-state")).toBe("unchecked");

		await act(async () => pinLeft?.click());
		expect(
			statusRow.querySelector(
				`button[aria-label="${m.pro_action_unpinLeft()}"]`,
			),
		).not.toBeNull();

		await render(columns());
		expect(headerTexts()).toEqual(["Name"]);
		const rerenderedStatus = columnSetting("Status");
		expect(
			rerenderedStatus
				.querySelector('[role="checkbox"]')
				?.getAttribute("data-state"),
		).toBe("unchecked");
		expect(
			rerenderedStatus.querySelector(
				`button[aria-label="${m.pro_action_unpinLeft()}"]`,
			),
		).not.toBeNull();
	});

	it("reconciles added and removed columns without stale settings", async () => {
		await render(columns());
		await openColumnSettings();
		await act(async () =>
			columnSetting("Status")
				.querySelector<HTMLButtonElement>('[role="checkbox"]')
				?.click(),
		);

		await render([
			{ accessorKey: "name", header: "Name" },
			{ id: "created", header: "Created", cell: () => "Now" },
		]);
		expect(headerTexts()).toEqual(["Name", "Created"]);
		expect(document.body.textContent).not.toContain("Status");
		expect(columnSetting("Created")).toBeTruthy();
	});

	it("applies pinning immediately and reset restores declared defaults", async () => {
		await render([
			{ accessorKey: "name", header: "Name", meta: { pinned: "left" } },
			{ accessorKey: "status", header: "Status" },
		]);
		await openColumnSettings();

		const nameRow = columnSetting("Name");
		await act(async () =>
			nameRow
				.querySelector<HTMLButtonElement>(
					`button[aria-label="${m.pro_action_unpinLeft()}"]`,
				)
				?.click(),
		);
		expect(
			nameRow.querySelector(`button[aria-label="${m.pro_action_pinLeft()}"]`),
		).not.toBeNull();

		const statusRow = columnSetting("Status");
		await act(async () =>
			statusRow
				.querySelector<HTMLButtonElement>(
					`button[aria-label="${m.pro_action_pinRight()}"]`,
				)
				?.click(),
		);
		expect(
			statusRow.querySelector(
				`button[aria-label="${m.pro_action_unpinRight()}"]`,
			),
		).not.toBeNull();
		await act(async () =>
			statusRow.querySelector<HTMLButtonElement>('[role="checkbox"]')?.click(),
		);

		const reset = [
			...document.querySelectorAll<HTMLButtonElement>("button"),
		].find((button) => button.textContent?.trim() === m.common_reset());
		expect(reset).not.toBeUndefined();
		await act(async () => reset?.click());

		expect(headerTexts()).toEqual(["Name", "Status"]);
		expect(
			columnSetting("Name").querySelector(
				`button[aria-label="${m.pro_action_unpinLeft()}"]`,
			),
		).not.toBeNull();
		expect(
			columnSetting("Status").querySelector(
				`button[aria-label="${m.pro_action_pinRight()}"]`,
			),
		).not.toBeNull();
	});

	it("uses an empty controlled pinning value as the update base", async () => {
		const onChange = vi.fn<(value: ColumnPinningState) => void>();
		await render(columns(), { pinning: { value: {}, onChange } });
		await openColumnSettings();

		await act(async () =>
			columnSetting("Status")
				.querySelector<HTMLButtonElement>(
					`button[aria-label="${m.pro_action_pinLeft()}"]`,
				)
				?.click(),
		);

		expect(onChange).toHaveBeenCalledWith({ left: ["status"], right: [] });
		expect(
			columnSetting("Status").querySelector(
				`button[aria-label="${m.pro_action_pinLeft()}"]`,
			),
		).not.toBeNull();
	});

	it("reorders columns with the keyboard drag controls", async () => {
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
			function (this: HTMLElement) {
				const top = this.textContent?.includes("Status") ? 40 : 0;
				return {
					x: 0,
					y: top,
					top,
					left: 0,
					right: 200,
					bottom: top + 32,
					width: 200,
					height: 32,
					toJSON: () => undefined,
				};
			},
		);
		await render(columns());
		await openColumnSettings();
		const handles = document.querySelectorAll<HTMLButtonElement>(
			`button[aria-label="${m.pro_action_dragToReorder()}"]`,
		);
		expect(handles).toHaveLength(2);
		const handle = handles[0];
		expect(handle).toBeDefined();

		handle?.focus();
		for (const [key, code] of [
			[" ", "Space"],
			["ArrowDown", "ArrowDown"],
			[" ", "Space"],
		] as const)
			await act(async () => {
				handle?.dispatchEvent(
					new KeyboardEvent("keydown", { bubbles: true, key, code }),
				);
				await Promise.resolve();
			});

		expect(headerTexts()).toEqual(["Status", "Name"]);
		expect(columnSettingLabels()).toEqual(["Status", "Name"]);
	});

	async function render(
		nextColumns: ColumnDef<Row>[],
		table?: {
			pinning?: {
				value?: ColumnPinningState;
				onChange?: (value: ColumnPinningState) => void;
			};
		},
	) {
		if (!container) {
			container = document.createElement("div");
			document.body.appendChild(container);
			root = createRoot(container);
		}
		await act(async () => {
			root?.render(
				<ProTable
					columns={nextColumns}
					data={data}
					pagination={false}
					table={table}
				/>,
			);
		});
	}

	async function openColumnSettings() {
		const trigger = container?.querySelector<HTMLButtonElement>(
			`button[aria-label="${m.pro_action_columns()}"]`,
		);
		expect(trigger).not.toBeNull();
		await act(async () => {
			trigger?.dispatchEvent(
				new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
			);
			await Promise.resolve();
		});
	}
});

function columns(): ColumnDef<Row>[] {
	return [
		{ accessorKey: "name", header: "Name" },
		{ accessorKey: "status", header: "Status" },
	];
}

function columnSetting(label: string) {
	const element = [...document.querySelectorAll("label")].find(
		(item) => item.textContent?.trim() === label,
	);
	if (!element?.parentElement)
		throw new Error(`Missing column setting: ${label}`);
	return element.parentElement;
}

function headerTexts() {
	return [...document.querySelectorAll("thead th")]
		.map((header) => header.textContent?.trim() ?? "")
		.filter(Boolean);
}

function columnSettingLabels() {
	return [...document.querySelectorAll("label")].map(
		(label) => label.textContent?.trim() ?? "",
	);
}
