CREATE TABLE `role_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`module` text NOT NULL,
	`permission_mask` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `role_permissions_role_module_uidx` ON `role_permissions` (`role_id`,`module`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`built_in` integer DEFAULT false NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_uidx` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_roles_user_role_uidx` ON `user_roles` (`user_id`,`role_id`);--> statement-breakpoint
CREATE INDEX `user_roles_role_idx` ON `user_roles` (`role_id`);--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_account_uidx` ON `accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `two_factors` (
	`id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`backup_codes` text NOT NULL,
	`user_id` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`failed_verification_count` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `two_factors_user_uidx` ON `two_factors` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`enabled` integer DEFAULT true NOT NULL,
	`two_factor_enabled` integer DEFAULT false NOT NULL,
	`disabled_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_created_idx` ON `users` (`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`pid` text NOT NULL,
	`secret_encrypted` text NOT NULL,
	`scopes` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_used_at` integer,
	`expires_at` integer,
	`revoked_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_pid_unique` ON `api_keys` (`pid`);--> statement-breakpoint
CREATE INDEX `api_keys_created_idx` ON `api_keys` (`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `blockchain_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`network` text NOT NULL,
	`tx_hash` text NOT NULL,
	`event_index` integer DEFAULT 0 NOT NULL,
	`from_address` text NOT NULL,
	`to_address` text NOT NULL,
	`asset_code` text NOT NULL,
	`amount_units` text NOT NULL,
	`block_number` text NOT NULL,
	`block_hash` text NOT NULL,
	`confirmations` integer NOT NULL,
	`status` text NOT NULL,
	`observed_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blockchain_transactions_event_uidx` ON `blockchain_transactions` (`network`,`tx_hash`,`event_index`);--> statement-breakpoint
CREATE TABLE `exchange_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`base` text NOT NULL,
	`quote` text NOT NULL,
	`raw_rate` text,
	`rate` text,
	`source` text NOT NULL,
	`adjustment_bps` integer DEFAULT 0 NOT NULL,
	`observed_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exchange_rates_category_pair_uidx` ON `exchange_rates` (`category`,`base`,`quote`);--> statement-breakpoint
CREATE INDEX `exchange_rates_pair_idx` ON `exchange_rates` (`base`,`quote`,`observed_at`);--> statement-breakpoint
CREATE TABLE `idempotency_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`request_hash` text NOT NULL,
	`response_status` integer,
	`response_body` text,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idempotency_key_uidx` ON `idempotency_keys` (`key`);--> statement-breakpoint
CREATE INDEX `idempotency_keys_expires_idx` ON `idempotency_keys` (`expires_at`);--> statement-breakpoint
CREATE TABLE `order_payment_snapshots` (
	`order_id` text PRIMARY KEY NOT NULL,
	`receiving_method_id` text NOT NULL,
	`receiving_method_name` text NOT NULL,
	`rail_code` text NOT NULL,
	`rail_kind` text NOT NULL,
	`asset_id` text NOT NULL,
	`asset_code` text NOT NULL,
	`decimals` integer NOT NULL,
	`contract_address` text,
	`target_value` text NOT NULL,
	`connection_id` text,
	`adapter` text NOT NULL,
	`required_confirmations` integer NOT NULL,
	`expected_amount_units` text NOT NULL,
	`rate_source` text,
	`raw_rate` text,
	`rate_adjustment` text,
	`final_rate` text,
	`rate_observed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`receiving_method_id`) REFERENCES `receiving_methods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `order_payment_snapshots_receiving_method_idx` ON `order_payment_snapshots` (`receiving_method_id`);--> statement-breakpoint
CREATE INDEX `order_payment_snapshots_connection_idx` ON `order_payment_snapshots` (`connection_id`);--> statement-breakpoint
CREATE INDEX `order_payment_snapshots_target_idx` ON `order_payment_snapshots` (`rail_code`,`target_value`,`asset_code`);--> statement-breakpoint
CREATE INDEX `order_payment_snapshots_target_nocase_idx` ON `order_payment_snapshots` (`rail_code`,LOWER("target_value"),`asset_code`);--> statement-breakpoint
CREATE TABLE `order_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`transaction_id` text NOT NULL,
	`amount_units` text NOT NULL,
	`confirmations` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`detected_at` integer NOT NULL,
	`confirmed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_payments_transaction_uidx` ON `order_payments` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `order_payments_order_idx` ON `order_payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_payments_detected_at_idx` ON `order_payments` (`detected_at`,`id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`external_order_id` text NOT NULL,
	`api_key_id` text,
	`api_protocol` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`amount_minor` text NOT NULL,
	`currency` text NOT NULL,
	`currency_decimals` integer NOT NULL,
	`payment_asset_id` text,
	`provider_order_id` text,
	`payment_url` text,
	`received_amount_units` text DEFAULT '0' NOT NULL,
	`description` text,
	`return_url` text,
	`notify_url` text,
	`metadata` text,
	`expires_at` integer NOT NULL,
	`paid_at` integer,
	`last_payment_scan_at` integer,
	`payment_scan_cursor` text,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`api_key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_asset_id`) REFERENCES `payment_assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_api_key_external_id_uidx` ON `orders` (`api_key_id`,`external_order_id`) WHERE "orders"."api_key_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_internal_external_id_uidx` ON `orders` (`external_order_id`) WHERE "orders"."api_key_id" IS NULL;--> statement-breakpoint
CREATE INDEX `orders_created_at_idx` ON `orders` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_expiration_idx` ON `orders` (`expires_at`,`id`) WHERE "orders"."status" IN ('pending', 'confirming', 'partially_paid');--> statement-breakpoint
CREATE INDEX `orders_payment_scan_idx` ON `orders` (`last_payment_scan_at`,`created_at`,`id`) WHERE "orders"."status" IN ('pending', 'confirming', 'partially_paid', 'paid', 'overpaid', 'expired');--> statement-breakpoint
CREATE UNIQUE INDEX `orders_provider_order_uidx` ON `orders` (`provider_order_id`);--> statement-breakpoint
CREATE TABLE `payment_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`rail_code` text NOT NULL,
	`code` text NOT NULL,
	`symbol` text NOT NULL,
	`kind` text NOT NULL,
	`contract_address` text,
	`decimals` integer NOT NULL,
	`default_confirmations` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`rail_code`) REFERENCES `payment_rails`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_assets_rail_code_uidx` ON `payment_assets` (`rail_code`,`code`);--> statement-breakpoint
CREATE TABLE `payment_ingresses` (
	`id` text PRIMARY KEY NOT NULL,
	`rail_code` text,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`transport` text DEFAULT 'http' NOT NULL,
	`endpoint` text,
	`api_key` text,
	`provider` text,
	`network` text,
	`external_network` text,
	`external_source_id` text,
	`config_encrypted` text,
	`mode` text,
	`desired_addresses_hash` text,
	`reconcile_required_at` integer,
	`last_reconciled_at` integer,
	`last_event_at` integer,
	`priority` integer DEFAULT 100 NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`health_status` text DEFAULT 'unknown' NOT NULL,
	`last_latency_ms` integer,
	`last_checked_at` integer,
	`last_error_code` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`rail_code`) REFERENCES `payment_rails`(`code`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payment_ingresses_shape_check" CHECK(("payment_ingresses"."type" = 'provider_webhook'
				AND "payment_ingresses"."rail_code" IS NULL
				AND "payment_ingresses"."provider" IS NOT NULL
				AND "payment_ingresses"."network" IS NOT NULL
				AND "payment_ingresses"."external_network" IS NOT NULL
				AND "payment_ingresses"."external_source_id" IS NOT NULL
				AND "payment_ingresses"."config_encrypted" IS NOT NULL
				AND "payment_ingresses"."mode" IS NOT NULL
				AND "payment_ingresses"."transport" = 'webhook')
			OR ("payment_ingresses"."type" != 'provider_webhook'
				AND "payment_ingresses"."rail_code" IS NOT NULL
				AND "payment_ingresses"."provider" IS NULL
				AND "payment_ingresses"."network" IS NULL
				AND "payment_ingresses"."external_network" IS NULL
				AND "payment_ingresses"."external_source_id" IS NULL
				AND "payment_ingresses"."config_encrypted" IS NULL
				AND "payment_ingresses"."mode" IS NULL
				AND "payment_ingresses"."transport" != 'webhook')),
	CONSTRAINT "payment_ingresses_provider_enabled_check" CHECK(type != 'provider' OR enabled = 1)
);
--> statement-breakpoint
CREATE INDEX `payment_ingresses_rail_priority_idx` ON `payment_ingresses` (`rail_code`,`enabled`,`priority`);--> statement-breakpoint
CREATE INDEX `payment_ingresses_health_due_idx` ON `payment_ingresses` ("last_checked_at" IS NOT NULL,`last_checked_at`,`priority`,`id`) WHERE "payment_ingresses"."enabled" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX `payment_ingresses_provider_network_uidx` ON `payment_ingresses` (`provider`,`network`) WHERE "payment_ingresses"."type" = 'provider_webhook';--> statement-breakpoint
CREATE UNIQUE INDEX `payment_ingresses_external_uidx` ON `payment_ingresses` (`provider`,`external_source_id`) WHERE "payment_ingresses"."type" = 'provider_webhook';--> statement-breakpoint
CREATE INDEX `payment_ingresses_reconcile_idx` ON `payment_ingresses` (`reconcile_required_at`,`id`);--> statement-breakpoint
CREATE TABLE `payment_rails` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`adapter` text NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`transaction_hash` text,
	`description` text NOT NULL,
	`evidence_key` text NOT NULL,
	`evidence_content_type` text NOT NULL,
	`evidence_size_bytes` integer NOT NULL,
	`evidence_sha256` text NOT NULL,
	`reviewer_user_id` text,
	`resolution_note` text,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_reviews_evidence_key_unique` ON `payment_reviews` (`evidence_key`);--> statement-breakpoint
CREATE INDEX `payment_reviews_order_idx` ON `payment_reviews` (`order_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `payment_reviews_status_idx` ON `payment_reviews` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `payment_reviews_list_idx` ON `payment_reviews` (CASE "status" WHEN 'pending' THEN 0 ELSE 1 END,"created_at" DESC,"id" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_reviews_pending_order_uidx` ON `payment_reviews` (`order_id`) WHERE "payment_reviews"."status" = 'pending';--> statement-breakpoint
CREATE TABLE `rate_limit_counters` (
	`id` text PRIMARY KEY NOT NULL,
	`bucket_key` text NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rate_limit_counters_bucket_window_uidx` ON `rate_limit_counters` (`bucket_key`,`window_start`);--> statement-breakpoint
CREATE INDEX `rate_limit_counters_expires_idx` ON `rate_limit_counters` (`expires_at`);--> statement-breakpoint
CREATE TABLE `receiving_method_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`receiving_method_id` text NOT NULL,
	`payment_asset_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`receiving_method_id`) REFERENCES `receiving_methods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_asset_id`) REFERENCES `payment_assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receiving_method_assets_pair_uidx` ON `receiving_method_assets` (`receiving_method_id`,`payment_asset_id`);--> statement-breakpoint
CREATE INDEX `receiving_method_assets_asset_idx` ON `receiving_method_assets` (`payment_asset_id`);--> statement-breakpoint
CREATE TABLE `receiving_method_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`receiving_method_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`order_id` text NOT NULL,
	`expected_amount_units` text NOT NULL,
	`collision_key` text,
	`expires_at` integer NOT NULL,
	`reusable_at` integer NOT NULL,
	`released_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`receiving_method_id`) REFERENCES `receiving_methods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `payment_assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receiving_method_locks_collision_key_unique` ON `receiving_method_locks` (`collision_key`);--> statement-breakpoint
CREATE INDEX `receiving_method_locks_collision_idx` ON `receiving_method_locks` (`reusable_at`);--> statement-breakpoint
CREATE INDEX `receiving_method_locks_expiry_idx` ON `receiving_method_locks` (`released_at`,`expires_at`);--> statement-breakpoint
CREATE TABLE `receiving_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`rail_code` text NOT NULL,
	`target_type` text NOT NULL,
	`target_value` text NOT NULL,
	`normalized_target_value` text NOT NULL,
	`target_metadata` text,
	`config_encrypted` text,
	`min_amount_minor` text,
	`max_amount_minor` text,
	`sort_order` integer DEFAULT 100 NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`rail_code`) REFERENCES `payment_rails`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receiving_methods_rail_target_uidx` ON `receiving_methods` (`rail_code`,`normalized_target_value`);--> statement-breakpoint
CREATE INDEX `receiving_methods_enabled_sort_idx` ON `receiving_methods` (`enabled`,`sort_order`);--> statement-breakpoint
CREATE INDEX `receiving_methods_rail_idx` ON `receiving_methods` (`rail_code`);--> statement-breakpoint
CREATE TABLE `audit_exports` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`exported_by` text,
	`record_count` integer NOT NULL,
	`delete_after` integer NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`exported_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_exports_object_key_unique` ON `audit_exports` (`object_key`);--> statement-breakpoint
CREATE INDEX `audit_exports_retention_idx` ON `audit_exports` (`delete_after`,`id`) WHERE "audit_exports"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`request_id` text,
	`ip_address` text,
	`before` text,
	`after` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_logs_created_idx` ON `audit_logs` (`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `operation_task_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`task` text NOT NULL,
	`trigger` text NOT NULL,
	`schedule` text,
	`status` text DEFAULT 'running' NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`duration_ms` integer,
	`error_code` text,
	`result` text
);
--> statement-breakpoint
CREATE INDEX `operation_task_runs_task_started_idx` ON `operation_task_runs` (`task`,`started_at`);--> statement-breakpoint
CREATE INDEX `operation_task_runs_retention_idx` ON `operation_task_runs` (`completed_at`,`id`) WHERE "operation_task_runs"."status" IN ('succeeded', 'failed');--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`is_secret` integer DEFAULT false NOT NULL,
	`updated_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `telegram_bindings` (
	`id` text PRIMARY KEY NOT NULL,
	`bot_id` text NOT NULL,
	`user_id` text,
	`telegram_user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`bot_id`) REFERENCES `telegram_bots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_bindings_bot_user_uidx` ON `telegram_bindings` (`bot_id`,`telegram_user_id`);--> statement-breakpoint
CREATE INDEX `telegram_bindings_created_idx` ON `telegram_bindings` (`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `telegram_bot_commands` (
	`id` text PRIMARY KEY NOT NULL,
	`command` text NOT NULL,
	`description_en_us` text NOT NULL,
	`description_ja_jp` text NOT NULL,
	`description_ko_kr` text NOT NULL,
	`description_ru_ru` text NOT NULL,
	`description_zh_tw` text NOT NULL,
	`description_zh_cn` text NOT NULL,
	`handler_type` text NOT NULL,
	`template_id` text,
	`scope` text DEFAULT 'default' NOT NULL,
	`sort_order` integer DEFAULT 100 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `telegram_message_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_commands_command_scope_uidx` ON `telegram_bot_commands` (`command`,`scope`);--> statement-breakpoint
CREATE INDEX `telegram_commands_sort_idx` ON `telegram_bot_commands` (`enabled`,`sort_order`);--> statement-breakpoint
CREATE TABLE `telegram_bots` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`token_encrypted` text NOT NULL,
	`webhook_secret_encrypted` text NOT NULL,
	`username` text,
	`enabled` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `telegram_message_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`translations` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `telegram_templates_enabled_idx` ON `telegram_message_templates` (`enabled`);--> statement-breakpoint
CREATE TABLE `telegram_notification_bindings` (
	`id` text PRIMARY KEY NOT NULL,
	`bot_id` text NOT NULL,
	`template_id` text,
	`name` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`locale` text DEFAULT 'en-US' NOT NULL,
	`events` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`bot_id`) REFERENCES `telegram_bots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `telegram_message_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_notifications_bot_target_uidx` ON `telegram_notification_bindings` (`bot_id`,`target_id`);--> statement-breakpoint
CREATE INDEX `telegram_notifications_event_idx` ON `telegram_notification_bindings` (`bot_id`,`enabled`);--> statement-breakpoint
CREATE INDEX `telegram_notifications_created_idx` ON `telegram_notification_bindings` (`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `inbound_provider_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`provider_event_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`accepted_activity_count` integer NOT NULL,
	`invalid_activity_count` integer NOT NULL,
	`provider_created_at` integer,
	`received_at` integer NOT NULL,
	`changed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `payment_ingresses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inbound_provider_deliveries_identity_uidx` ON `inbound_provider_deliveries` (`source_id`,`provider_event_id`);--> statement-breakpoint
CREATE INDEX `inbound_provider_deliveries_retention_idx` ON `inbound_provider_deliveries` (`received_at`,`id`);--> statement-breakpoint
CREATE TABLE `inbound_provider_events` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`provider_event_id` text NOT NULL,
	`activity_index` integer NOT NULL,
	`network` text NOT NULL,
	`event_type` text NOT NULL,
	`transaction_hash` text NOT NULL,
	`event_index` integer NOT NULL,
	`payload_hash` text NOT NULL,
	`trigger` text NOT NULL,
	`ingest_mode` text DEFAULT 'shadow' NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer,
	`lease_until` integer,
	`last_error_code` text,
	`received_at` integer NOT NULL,
	`queued_at` integer,
	`processed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `payment_ingresses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inbound_provider_events_delivery_uidx` ON `inbound_provider_events` (`source_id`,`provider_event_id`,`activity_index`);--> statement-breakpoint
CREATE INDEX `inbound_provider_events_outbox_idx` ON `inbound_provider_events` (`status`,`next_attempt_at`,`received_at`,`id`);--> statement-breakpoint
CREATE INDEX `inbound_provider_events_lease_idx` ON `inbound_provider_events` (`status`,`lease_until`,`id`);--> statement-breakpoint
CREATE INDEX `inbound_provider_events_source_received_idx` ON `inbound_provider_events` (`source_id`,`received_at`,`id`);--> statement-breakpoint
CREATE INDEX `inbound_provider_events_received_idx` ON `inbound_provider_events` (`received_at`,`id`);--> statement-breakpoint
CREATE INDEX `inbound_provider_events_retention_idx` ON `inbound_provider_events` (`processed_at`,`id`) WHERE "inbound_provider_events"."status" IN ('succeeded', 'ignored', 'ambiguous', 'dead');--> statement-breakpoint
CREATE TABLE `inbound_webhook_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint_code` text NOT NULL,
	`request_id` text NOT NULL,
	`method` text NOT NULL,
	`request_path` text NOT NULL,
	`signature_status` text NOT NULL,
	`processing_status` text NOT NULL,
	`response_status` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`error_code` text,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inbound_webhook_receipts_request_uidx` ON `inbound_webhook_receipts` (`endpoint_code`,`request_id`);--> statement-breakpoint
CREATE INDEX `inbound_webhook_receipts_list_idx` ON `inbound_webhook_receipts` (`endpoint_code`,`received_at`,`id`);--> statement-breakpoint
CREATE INDEX `inbound_webhook_receipts_retention_idx` ON `inbound_webhook_receipts` (`received_at`,`id`);--> statement-breakpoint
CREATE TABLE `webhook_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`delivery_id` text NOT NULL,
	`attempt` integer NOT NULL,
	`request_id` text NOT NULL,
	`response_status` integer,
	`duration_ms` integer,
	`error_code` text,
	`response_excerpt` text,
	`request_snapshot` text,
	`attempted_at` integer NOT NULL,
	FOREIGN KEY (`delivery_id`) REFERENCES `webhook_deliveries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_attempts_delivery_attempt_uidx` ON `webhook_attempts` (`delivery_id`,`attempt`);--> statement-breakpoint
CREATE INDEX `webhook_attempts_retention_idx` ON `webhook_attempts` (`attempted_at`,`id`);--> statement-breakpoint
CREATE TABLE `webhook_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`order_id` text NOT NULL,
	`api_key_id` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `webhook_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`api_key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_deliveries_event_order_uidx` ON `webhook_deliveries` (`event_id`,`order_id`);--> statement-breakpoint
CREATE INDEX `webhook_deliveries_created_idx` ON `webhook_deliveries` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `webhook_deliveries_retention_idx` ON `webhook_deliveries` (`completed_at`,`id`) WHERE "webhook_deliveries"."status" IN ('succeeded', 'dead');--> statement-breakpoint
CREATE INDEX `webhook_deliveries_outbox_idx` ON `webhook_deliveries` (`created_at`,`id`) WHERE ("webhook_deliveries"."status" = 'queued' AND "webhook_deliveries"."attempt_count" = 0)
					OR ("webhook_deliveries"."status" = 'failed' AND "webhook_deliveries"."attempt_count" > 0);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text,
	`type` text NOT NULL,
	`deduplication_key` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_events_deduplication_key_unique` ON `webhook_events` (`deduplication_key`);--> statement-breakpoint
CREATE INDEX `webhook_events_retention_idx` ON `webhook_events` (`created_at`,`id`);