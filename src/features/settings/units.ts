const settingUnits = {
	"orders.fixed_expiry_ms": "milliseconds",
	"orders.default_expiry_ms": "milliseconds",
	"orders.max_expiry_ms": "milliseconds",
	"webhooks.timeout_ms": "milliseconds",
	"payments.scan_interval_ms": "milliseconds",
	"payments.webhook_recovery_interval_ms": "milliseconds",
	"payments.rpc_health_interval_ms": "milliseconds",
	"payments.reorg_monitor_ms": "milliseconds",
	"retention.audit_ms": "milliseconds",
} as const;

export type SystemSettingUnit =
	(typeof settingUnits)[keyof typeof settingUnits];

export function systemSettingUnit(key: string) {
	return settingUnits[key as keyof typeof settingUnits];
}
