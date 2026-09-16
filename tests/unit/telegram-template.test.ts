import { describe, expect, it } from "vitest";
import {
	escapeTelegramMarkdownValue,
	hasOnlySafeTelegramTemplateVariables,
	renderTelegramTemplate,
} from "#/features/telegram/template";

describe("Telegram message templates", () => {
	it("renders the same safe variables used by delivery and preview", () => {
		const template =
			"{{externalOrderId}} · {{payment.amount}} {{payment.asset}}";
		expect(hasOnlySafeTelegramTemplateVariables(template)).toBe(true);
		expect(
			renderTelegramTemplate(template, {
				externalOrderId: "ORDER-1",
				payment: { amount: "10.00", asset: "USDT" },
			}),
		).toBe("ORDER-1 · 10.00 USDT");
	});

	it("keeps event selection outside reusable template content", () => {
		expect(hasOnlySafeTelegramTemplateVariables("{{event}} {{status}}")).toBe(
			false,
		);
		expect(
			renderTelegramTemplate("{{event}} {{status}}", { status: "paid" }),
		).toBe(" paid");
	});

	it("escapes dynamic values without escaping administrator Markdown", () => {
		expect(escapeTelegramMarkdownValue("ORDER_[1]*`test`\\value")).toBe(
			"ORDER\\_\\[1\\]\\*\\`test\\`\\\\value",
		);
		expect(
			renderTelegramTemplate("*Order:* {{externalOrderId}}", {
				externalOrderId: "ORDER_1",
			}),
		).toBe("*Order:* ORDER\\_1");
	});

	it("rejects unsupported placeholders and never exposes object paths", () => {
		expect(hasOnlySafeTelegramTemplateVariables("{{user.password}}")).toBe(
			false,
		);
		expect(
			renderTelegramTemplate("safe {{status}} {{user.password}}", {
				status: "paid",
				user: { password: "secret" },
			}),
		).toBe("safe paid ");
	});
});
