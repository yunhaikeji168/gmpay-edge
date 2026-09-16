import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { paymentConnectionToggleInput } from "#/features/payment-settings/schema";

describe("payment connection identifiers", () => {
	it("accepts stable seeded RPC identifiers", () => {
		expect(
			paymentConnectionToggleInput.parse({
				type: "rpc",
				id: "rpc-tron-default",
				enabled: false,
			}),
		).toEqual({ type: "rpc", id: "rpc-tron-default", enabled: false });
	});

	it("loads connections and rail options with one page request", async () => {
		const source = await readFile(
			new URL(
				"../../src/features/payment-settings/pages/admin-ingresses.tsx",
				import.meta.url,
			),
			"utf8",
		);

		expect(source).not.toContain("useQueries");
		expect(source).toContain("getPaymentIngressesPageFn()");
	});

	it("loads all built-in payment methods with one page request", async () => {
		const source = await readFile(
			new URL(
				"../../src/features/payment-settings/pages/admin-payment-methods.tsx",
				import.meta.url,
			),
			"utf8",
		);

		expect(source).not.toContain("useQueries");
		expect(source).toContain("listPaymentMethodsFn()");
	});

	it("keeps save-and-run rate synchronization inside the settings form", async () => {
		const source = await readFile(
			new URL(
				"../../src/features/payment-settings/pages/admin-rates.tsx",
				import.meta.url,
			),
			"utf8",
		);

		expect(source).toContain('name: "enabled"');
		expect(source).toContain("fieldProps: { autoFocus: true }");
		expect(source).toContain("submitter={({ submitting })");
		expect(source).not.toContain("onClick={cancel}");
		expect(source).toContain("runNowRef.current = true");
		expect(source.match(/m\.rates_sync_now\(\)/g)).toHaveLength(1);
		expect(source).not.toContain("syncExchangeRatesFn");
	});
});
