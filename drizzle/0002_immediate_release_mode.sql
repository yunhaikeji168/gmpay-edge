CREATE TRIGGER `receiving_method_locks_reconcile_after_delete`
AFTER DELETE ON `receiving_method_locks`
BEGIN
	UPDATE `payment_ingresses`
	SET `reconcile_required_at` = COALESCE(`reconcile_required_at`, unixepoch() * 1000),
		`updated_at` = unixepoch() * 1000
	WHERE `type` = 'provider_webhook' AND `enabled` = 1 AND EXISTS (
		SELECT 1 FROM `receiving_methods` method
		WHERE method.`id` = OLD.`receiving_method_id` AND method.`enabled` = 0
		AND method.`rail_code` = `payment_ingresses`.`network`
	);
END;
--> statement-breakpoint
CREATE TRIGGER `receiving_method_locks_delete_after_release`
AFTER UPDATE OF `released_at` ON `receiving_method_locks`
WHEN NEW.`released_at` IS NOT NULL AND COALESCE(
	(SELECT json_extract(`value`, '$') FROM `system_settings`
	 WHERE `key` = 'orders.immediate_release_mode'), 0
) = 1
BEGIN
	DELETE FROM `receiving_method_locks` WHERE `id` = NEW.`id`;
END;
