// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ComponentType, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CheckoutOrder } from "#/features/checkout/checkout-model";

const state = vi.hoisted(() => ({
	orderId: "",
	order: null as CheckoutOrder | null,
	getOrder: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: { component: ComponentType }) => ({
		options,
		useParams: () => ({ orderId: state.orderId }),
		useLoaderData: () => ({ order: state.order, renderedAt: Date.now() }),
	}),
	useNavigate: () => vi.fn(),
	Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("#/context/site-brand-provider", () => ({
	useSiteBrand: () => ({
		name: "GMPay Edge",
		title: "Checkout",
		logoUrl: "/logo.svg",
	}),
}));
vi.mock("#/features/checkout/server/functions", () => ({
	getCheckoutOrderFn: state.getOrder,
	listCheckoutPaymentOptionsFn: async () => ({ options: [] }),
	selectCheckoutPaymentOptionFn: vi.fn(),
	submitCheckoutTransactionFn: vi.fn(),
}));
vi.mock("#/layouts/components/locale-switch", () => ({
	LocaleSwitch: () => null,
}));
vi.mock("#/layouts/components/theme-switch", () => ({
	ThemeSwitch: () => null,
}));
vi.mock("#/features/checkout/components/payment-review-dialog", () => ({
	PaymentReviewDialog: () => null,
}));
vi.mock("#/features/checkout/components/order-summary-card", () => ({
	OrderSummaryCard: ({ order }: { order: CheckoutOrder }) => (
		<output>
			{order.trade_id}:{order.amount}
		</output>
	),
}));
vi.mock("#/features/checkout/components/payment-details-panel", () => ({
	PaymentDetailsPanel: ({
		order,
		txHash,
		onTxHashChange,
	}: {
		order: CheckoutOrder;
		txHash: string;
		onTxHashChange: (value: string) => void;
	}) => (
		<div>
			<output>{order.receive_address}</output>
			<output data-hash>{txHash}</output>
			<button
				type="button"
				onClick={() => onTxHashChange("old-transaction-hash")}
			>
				Set hash
			</button>
		</div>
	),
}));
vi.mock("#/features/checkout/components/status-panels", () => ({
	SuccessPanel: () => <output>paid</output>,
	CancelledPanel: () => <output>cancelled</output>,
	ConfirmingPanel: () => <output>confirming</output>,
	ExpiredPanel: () => <output>expired</output>,
	FailedPanel: () => <output>failed</output>,
	NotFoundPanel: () => <output>not-found</output>,
	OverpaidPanel: () => <output>overpaid</output>,
	PartiallyPaidPanel: () => <output>partial</output>,
	RefundedPanel: () => <output>refunded</output>,
	TimeoutPanel: () => <output>timeout</output>,
}));

import { Route } from "#/routes/checkout/$orderId";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("checkout navigation state ownership", () => {
	let root: ReturnType<typeof createRoot> | undefined;
	let container: HTMLDivElement;
	let queryClient: QueryClient;
	afterEach(async () => {
		if (root) await act(async () => root?.unmount());
		container?.remove();
		queryClient?.clear();
		root = undefined;
		vi.useRealTimers();
		vi.restoreAllMocks();
		state.getOrder.mockReset();
	});

	it("starts fresh after a terminal order, clears transaction input, and ignores an old in-flight refresh", async () => {
		vi.useFakeTimers();
		Object.defineProperty(document, "visibilityState", {
			configurable: true,
			value: "visible",
		});
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const RouteComponent = Route.options.component;
		if (!RouteComponent) throw new Error("Checkout route component is missing");
		const navigate = async (
			id: string,
			status: CheckoutOrder["status_detail"],
		) => {
			state.orderId = id;
			state.order = {
				trade_id: id,
				amount: id,
				token: "USDT",
				status_detail: status,
				receive_address: `address-${id}`,
				expiration_time: new Date(Date.now() + 900_000).toISOString(),
			};
			await act(async () =>
				root?.render(
					<QueryClientProvider client={queryClient}>
						<RouteComponent />
					</QueryClientProvider>,
				),
			);
		};
		await navigate("A", "paid");
		expect(container.textContent).toContain("paid");
		await navigate("B", "pending");
		expect(container.textContent).toContain("address-B");
		expect(container.textContent).not.toContain("paid");
		await act(async () => container.querySelector("button")?.click());
		expect(container.querySelector("[data-hash]")?.textContent).toBe(
			"old-transaction-hash",
		);
		let resolvePending = (_order: CheckoutOrder) => {};
		const pending = new Promise<CheckoutOrder>((resolve) => {
			resolvePending = resolve;
		});
		state.getOrder.mockReturnValueOnce(pending);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(5_000);
		});
		expect(state.getOrder).toHaveBeenCalledWith({ data: { orderId: "B" } });
		await navigate("C", "pending");
		expect(container.querySelector("[data-hash]")?.textContent).toBe("");
		await act(async () =>
			resolvePending({ trade_id: "B", amount: "999", status_detail: "paid" }),
		);
		expect(container.textContent).toContain("address-C");
		expect(container.textContent).not.toContain("paid");
	});
});
