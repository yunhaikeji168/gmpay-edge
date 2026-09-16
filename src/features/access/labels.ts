import type { RbacAction } from "#/features/access/rbac-bitmask";
import type { SystemRbacModule } from "#/features/access/system-rbac";
import { m } from "#/paraglide/messages";

export function systemModuleLabel(id: SystemRbacModule) {
	return {
		dashboard: m.payment_dashboard_title(),
		users: m.nav_user_management(),
		api_keys: m.api_keys_title(),
		webhooks: m.system_nav_webhooks(),
		orders: m.system_nav_orders(),
		payments: m.system_nav_payments(),
		payment_reviews: m.payment_reviews_title(),
		receiving_methods: m.receiving_methods_title(),
		payment_settings: m.nav_payment_settings(),
		telegram: m.system_nav_telegram(),
		operations: m.nav_operations_center(),
		settings: m.system_nav_settings(),
		audit: m.nav_audit_logs(),
		roles: m.nav_role_management(),
	}[id];
}

export function rbacActionLabel(action: RbacAction) {
	return {
		create: m.rbac_action_create(),
		read: m.rbac_action_read(),
		update: m.rbac_action_update(),
		delete: m.rbac_action_delete(),
		test: m.rbac_action_test(),
	}[action];
}
