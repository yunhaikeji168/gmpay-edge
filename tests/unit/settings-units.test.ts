import { describe, expect, it } from "vitest";
import { systemSettingUnit } from "#/features/settings/units";

describe("system setting units", () => {
	it("maps every duration setting to an input suffix", () => {
		expect(systemSettingUnit("orders.fixed_expiry_ms")).toBe("milliseconds");
		expect(systemSettingUnit("orders.default_expiry_ms")).toBe("milliseconds");
		expect(systemSettingUnit("orders.max_expiry_ms")).toBe("milliseconds");
		expect(systemSettingUnit("webhooks.timeout_ms")).toBe("milliseconds");
		expect(systemSettingUnit("payments.scan_interval_ms")).toBe("milliseconds");
		expect(systemSettingUnit("payments.webhook_recovery_interval_ms")).toBe(
			"milliseconds",
		);
		expect(systemSettingUnit("payments.rpc_health_interval_ms")).toBe(
			"milliseconds",
		);
		expect(systemSettingUnit("payments.reorg_monitor_ms")).toBe("milliseconds");
		expect(systemSettingUnit("retention.audit_ms")).toBe("milliseconds");
	});

	it("does not invent units for counts and priorities", () => {
		expect(systemSettingUnit("webhooks.max_attempts")).toBeUndefined();
		expect(systemSettingUnit("payments.scan_batch_size")).toBeUndefined();
	});
});
