import { describe, expect, it } from "vitest";
import { validateProTableSearch } from "#/lib/pro-table-url-state";

describe("ProTable URL search validation", () => {
	it("keeps valid pagination, search, sorting, and order parameters", () => {
		expect(
			validateProTableSearch({
				page: "3",
				pageSize: 25,
				q: "pending",
				sort: "createdAt",
				order: "desc",
			}),
		).toEqual({
			page: 3,
			pageSize: 25,
			q: "pending",
			sort: "createdAt",
			order: "desc",
		});
	});

	it("drops empty, invalid, and unknown parameters instead of resetting valid state", () => {
		expect(
			validateProTableSearch({
				page: 0,
				pageSize: "-1",
				q: "",
				sort: "",
				order: "descending",
				cursor: "stale",
			}),
		).toEqual({});
	});

	it("rejects non-integer pagination values", () => {
		expect(
			validateProTableSearch({
				page: "2.5",
				pageSize: "10.5",
			}),
		).toEqual({});
	});
});
