import { describe, expect, it } from "vitest";
import { BinancePayAdapter } from "#/integrations/exchanges/binance";
import { OkxPayAdapter } from "#/integrations/exchanges/okx";
import { OkPayAdapter } from "#/integrations/wallets/okpay";

const binanceEnabled = hasEnvironment(
	"BINANCE_SMOKE_API_KEY",
	"BINANCE_SMOKE_SECRET_KEY",
	"BINANCE_SMOKE_UID",
);
const okxEnabled = hasEnvironment(
	"OKX_SMOKE_API_KEY",
	"OKX_SMOKE_SECRET_KEY",
	"OKX_SMOKE_PASSPHRASE",
	"OKX_SMOKE_UID",
);
const okpayEnabled = hasEnvironment(
	"OKPAY_SMOKE_SHOP_ID",
	"OKPAY_SMOKE_API_KEY",
);
const alchemyEnabled = hasEnvironment(
	"ALCHEMY_SMOKE_AUTH_TOKEN",
	"ALCHEMY_SMOKE_WEBHOOK_ID",
);

describe.skip("read-only payment provider smoke", () => {
	it.skipIf(!binanceEnabled)(
		"authenticates and reads Binance Pay history",
		async () => {
			const adapter = new BinancePayAdapter({
				apiKey: environment("BINANCE_SMOKE_API_KEY"),
				secretKey: environment("BINANCE_SMOKE_SECRET_KEY"),
				apiUrl: process.env.BINANCE_SMOKE_API_URL,
			});
			await expect(adapter.healthCheck()).resolves.toMatchObject({
				healthy: true,
			});
			await expect(
				adapter.findTransactions({
					address: environment("BINANCE_SMOKE_UID"),
					assetCode: process.env.BINANCE_SMOKE_ASSET ?? "USDT",
				}),
			).resolves.toBeInstanceOf(Array);
		},
	);

	it.skipIf(!okxEnabled)(
		"authenticates and reads OKX funding bills",
		async () => {
			const accountId = environment("OKX_SMOKE_UID");
			const adapter = new OkxPayAdapter({
				apiKey: environment("OKX_SMOKE_API_KEY"),
				secretKey: environment("OKX_SMOKE_SECRET_KEY"),
				passphrase: environment("OKX_SMOKE_PASSPHRASE"),
				accountId,
				apiUrl: process.env.OKX_SMOKE_API_URL,
				simulatedTrading: process.env.OKX_SMOKE_SIMULATED === "1",
			});
			await expect(adapter.healthCheck()).resolves.toMatchObject({
				healthy: true,
			});
			await expect(
				adapter.findTransactions({
					address: accountId,
					assetCode: process.env.OKX_SMOKE_ASSET ?? "USDT",
				}),
			).resolves.toBeInstanceOf(Array);
		},
	);

	it.skipIf(!okpayEnabled)(
		"authenticates with the OKPay shop API",
		async () => {
			const adapter = new OkPayAdapter({
				shopId: environment("OKPAY_SMOKE_SHOP_ID"),
				apiKey: environment("OKPAY_SMOKE_API_KEY"),
				apiUrl: process.env.OKPAY_SMOKE_API_URL,
			});
			await expect(adapter.healthCheck()).resolves.toMatchObject({
				healthy: true,
			});
			const providerOrderId = process.env.OKPAY_SMOKE_ORDER_ID;
			if (providerOrderId)
				await expect(
					adapter.getTransaction(providerOrderId),
				).resolves.toBeDefined();
		},
	);

	it.skipIf(!alchemyEnabled)(
		"authenticates and reads Alchemy webhook addresses without mutation",
		async () => {
			const url = new URL(
				"https://dashboard.alchemy.com/api/webhook-addresses",
			);
			url.searchParams.set(
				"webhook_id",
				environment("ALCHEMY_SMOKE_WEBHOOK_ID"),
			);
			url.searchParams.set("limit", "1");
			const response = await fetch(url, {
				headers: {
					"x-alchemy-token": environment("ALCHEMY_SMOKE_AUTH_TOKEN"),
				},
			});
			expect(response.ok).toBe(true);
			const payload: unknown = await response.json();
			expect(payload).toEqual(
				expect.objectContaining({ data: expect.any(Array) }),
			);
		},
	);
});

function hasEnvironment(...names: string[]) {
	return names.every((name) => Boolean(process.env[name]));
}

function environment(name: string) {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required`);
	return value;
}
