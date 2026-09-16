import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
	mergeAlchemyEventSourceConfig,
	parseAlchemyAddressActivity,
	reconcileAlchemyWebhookAddresses,
	verifyAlchemyWebhookSignature,
} from "#/integrations/chains/alchemy-webhook";
import fixture from "../../fixtures/providers/alchemy-address-activity.json";

describe("Alchemy address activity boundary", () => {
	it("normalizes a fungible token activity without trusting decimal value", () => {
		expect(parseAlchemyAddressActivity(fixture)).toEqual({
			providerEventId: "whevt_gmpay_payment_1",
			externalSourceId: "wh_gmpay_ethereum",
			externalNetwork: "ETH_MAINNET",
			createdAt: "2026-07-17T01:00:00.000Z",
			invalidActivityCount: 0,
			activities: [
				{
					activityIndex: 0,
					trigger: {
						transactionHash:
							"0x7a4a39da2a3fa1fc2ef88fd1eaea070286ed2aba21e0419dcfb6d5c5d9f02a72",
						eventIndex: 110,
						fromAddress: "0x503828976d22510aad0201ac7ec88293211d23da",
						toAddress: "0xbe3f4b43db5eb49d1f48f53443b9abce45da3b79",
						assetCode: "USDC",
						contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
						blockNumber: "0xdf34a3",
						removed: false,
					},
				},
			],
		});
	});

	it("ignores internal and NFT activities that the accounting adapters do not support", () => {
		const payload = structuredClone(fixture);
		const [activity] = payload.event.activity;
		if (!activity) throw new Error("Expected Alchemy activity fixture");
		activity.category = "internal";
		expect(parseAlchemyAddressActivity(payload).activities).toEqual([]);
	});

	it("skips an unidentifiable token without dropping valid activities in the delivery", () => {
		const [activity] = structuredClone(fixture.event.activity);
		if (!activity) throw new Error("Expected Alchemy activity fixture");
		const payload: unknown = {
			...structuredClone(fixture),
			event: {
				...structuredClone(fixture.event),
				activity: [{ ...structuredClone(activity), asset: null }, activity],
			},
		};

		expect(parseAlchemyAddressActivity(payload).activities).toHaveLength(1);
		expect(
			parseAlchemyAddressActivity(payload).activities[0]?.activityIndex,
		).toBe(1);
	});

	it("isolates a malformed activity instead of poisoning the signed delivery", () => {
		const payload: unknown = {
			...structuredClone(fixture),
			event: {
				...structuredClone(fixture.event),
				activity: [
					{ hash: "provider-shape-changed" },
					...structuredClone(fixture.event.activity),
				],
			},
		};

		const parsed = parseAlchemyAddressActivity(payload);
		expect(parsed.activities).toHaveLength(1);
		expect(parsed.invalidActivityCount).toBe(1);
	});

	it("accepts a signed provider error without pretending it contains activity", () => {
		const payload: unknown = {
			...structuredClone(fixture),
			event: { error: "Monthly capacity limit exceeded" },
		};
		expect(parseAlchemyAddressActivity(payload)).toMatchObject({
			providerEventId: fixture.id,
			externalSourceId: fixture.webhookId,
			externalNetwork: null,
			providerErrorCode: "provider_error",
			activities: [],
		});
	});

	it("does not process partial activity when a provider error is present", () => {
		const payload: unknown = {
			...structuredClone(fixture),
			event: {
				...structuredClone(fixture.event),
				error: "Partial provider response",
			},
		};
		expect(parseAlchemyAddressActivity(payload)).toMatchObject({
			providerErrorCode: "provider_error",
			activities: [],
		});
	});

	it("verifies the raw request body against current and previous keys", async () => {
		const rawBody = JSON.stringify(fixture);
		const previousSigningKey = "previous-signing-key-for-rotation";
		const signature = createHmac("sha256", previousSigningKey)
			.update(rawBody)
			.digest("hex");
		await expect(
			verifyAlchemyWebhookSignature(rawBody, signature, {
				signingKey: "current-signing-key-for-alchemy",
				previousSigningKey,
			}),
		).resolves.toBe(true);
		await expect(
			verifyAlchemyWebhookSignature(`${rawBody} `, signature, {
				signingKey: "current-signing-key-for-alchemy",
				previousSigningKey,
			}),
		).resolves.toBe(false);
	});

	it("rotates signing keys without dropping the management token", () => {
		const current = {
			signingKey: "current-signing-key-for-alchemy",
			authToken: "alchemy-management-token",
		};
		expect(
			mergeAlchemyEventSourceConfig(current, {
				signingKey: "replacement-signing-key-for-alchemy",
			}),
		).toEqual({
			signingKey: "replacement-signing-key-for-alchemy",
			previousSigningKey: "current-signing-key-for-alchemy",
			authToken: "alchemy-management-token",
		});
		expect(
			mergeAlchemyEventSourceConfig(
				{ ...current, previousSigningKey: "old-signing-key-for-alchemy" },
				{ previousSigningKey: null },
			),
		).toEqual(current);
	});

	it("replaces the dedicated address list when the remote list exceeds the read bound", async () => {
		let addressPage = 0;
		const fetchFn = vi.fn(
			async (input: URL | RequestInfo, init?: RequestInit) => {
				const url = String(input);
				if (url.includes("team-webhooks"))
					return Response.json({
						data: [
							{
								id: "wh-source",
								network: "ETH_MAINNET",
								webhook_type: "ADDRESS_ACTIVITY",
								webhook_url: "https://pay.example/api/providers/alchemy/source",
								is_active: true,
							},
						],
					});
				if (url.includes("webhook-addresses") && init?.method !== "PUT") {
					addressPage += 1;
					return Response.json({
						data: Array.from(
							{ length: 100 },
							(_, index) =>
								`0x${(addressPage * 100 + index).toString(16).padStart(40, "0")}`,
						),
						pagination: { cursors: { after: `page-${addressPage}` } },
					});
				}
				expect(init?.method).toBe("PUT");
				expect(JSON.parse(String(init?.body))).toEqual({
					webhook_id: "wh-source",
					addresses: ["0x1111111111111111111111111111111111111111"],
				});
				return Response.json({});
			},
		);
		await expect(
			reconcileAlchemyWebhookAddresses(
				{
					authToken: "alchemy-management-token",
					externalSourceId: "wh-source",
					externalNetwork: "ETH_MAINNET",
					webhookUrl: "https://pay.example/api/providers/alchemy/source",
					requireActive: true,
					desiredAddresses: ["0x1111111111111111111111111111111111111111"],
				},
				fetchFn as typeof fetch,
			),
		).resolves.toMatchObject({
			desiredCount: 1,
			remoteCount: null,
			replaced: true,
		});
		expect(addressPage).toBe(20);
		expect(fetchFn).toHaveBeenCalledTimes(22);
	});
});
