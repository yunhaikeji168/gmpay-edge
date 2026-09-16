// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProTable } from "#/components/pro/table";
import { m } from "#/paraglide/messages";

const columns = [{ accessorKey: "name", header: "Name" }];
const rows = Array.from({ length: 15 }, (_, index) => ({
	id: index + 1,
	name: `Row ${index + 1}`,
}));

describe("ProTable pagination", () => {
	let container: HTMLDivElement | undefined;

	afterEach(() => {
		container?.remove();
		container = undefined;
	});

	it("keeps the current page when a URL navigation recreates the data array", async () => {
		container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(
				<ProTable columns={columns} data={[...rows]} toolbar={false} />,
			);
		});
		const next = container.querySelector<HTMLButtonElement>(
			`button[aria-label="${m.pro_pagination_nextPage()}"]`,
		);
		expect(next).not.toBeNull();

		await act(async () => next?.click());
		expect(container.querySelector("tbody")?.textContent).toContain("Row 11");

		await act(async () => {
			root.render(
				<ProTable columns={columns} data={[...rows]} toolbar={false} />,
			);
		});
		expect(container.querySelector("tbody")?.textContent).toContain("Row 11");

		await act(async () => root.unmount());
	});

	it("adopts a page restored from the URL after the table has mounted", async () => {
		container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(
				<ProTable
					columns={columns}
					data={rows}
					initialState={{ pagination: { pageIndex: 0, pageSize: 10 } }}
					toolbar={false}
				/>,
			);
		});
		expect(container.querySelector("tbody")?.textContent).toContain("Row 1");

		await act(async () => {
			root.render(
				<ProTable
					columns={columns}
					data={rows}
					initialState={{ pagination: { pageIndex: 1, pageSize: 10 } }}
					toolbar={false}
				/>,
			);
		});
		expect(container.querySelector("tbody")?.textContent).toContain("Row 11");

		await act(async () => root.unmount());
	});

	it("does not clamp a restored page while its rows are loading", async () => {
		container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);
		const onChange = vi.fn();

		await act(async () => {
			root.render(
				<ProTable
					columns={columns}
					data={[]}
					initialState={{ pagination: { pageIndex: 1, pageSize: 10 } }}
					loading
					onChange={onChange}
					toolbar={false}
				/>,
			);
		});

		await act(async () => {
			root.render(
				<ProTable
					columns={columns}
					data={rows}
					initialState={{ pagination: { pageIndex: 1, pageSize: 10 } }}
					loading={false}
					onChange={onChange}
					toolbar={false}
				/>,
			);
		});

		expect(container.querySelector("tbody")?.textContent).toContain("Row 11");
		expect(
			onChange.mock.calls.some(([state]) => state.pagination.pageIndex === 0),
		).toBe(false);

		await act(async () => root.unmount());
	});

	it("reloads a remote request from an explicit request key", async () => {
		container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);
		const request = vi.fn(async () => ({ data: rows.slice(0, 10), total: 15 }));

		await act(async () => {
			root.render(
				<ProTable
					columns={columns}
					request={request}
					requestKey={0}
					toolbar={false}
				/>,
			);
		});
		expect(request).toHaveBeenCalledTimes(1);

		await act(async () => {
			root.render(
				<ProTable
					columns={columns}
					request={request}
					requestKey={1}
					toolbar={false}
				/>,
			);
		});
		expect(request).toHaveBeenCalledTimes(2);

		await act(async () => root.unmount());
	});

	it("does not let an older request overwrite refreshed data", async () => {
		container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);
		const first = deferred<{ data: typeof rows; total: number }>();
		const second = deferred<{ data: typeof rows; total: number }>();
		const request = vi
			.fn()
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise);

		await act(async () => {
			root.render(
				<ProTable
					columns={columns}
					request={request}
					requestKey={0}
					toolbar={false}
				/>,
			);
		});
		await act(async () => {
			root.render(
				<ProTable
					columns={columns}
					request={request}
					requestKey={1}
					toolbar={false}
				/>,
			);
		});

		await act(async () =>
			second.resolve({ data: [{ id: 2, name: "Newest" }], total: 1 }),
		);
		expect(container.querySelector("tbody")?.textContent).toContain("Newest");
		await act(async () =>
			first.resolve({ data: [{ id: 1, name: "Stale" }], total: 1 }),
		);
		expect(container.querySelector("tbody")?.textContent).toContain("Newest");
		expect(container.querySelector("tbody")?.textContent).not.toContain(
			"Stale",
		);

		await act(async () => root.unmount());
	});
});

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((next) => {
		resolve = next;
	});
	return { promise, resolve };
}
