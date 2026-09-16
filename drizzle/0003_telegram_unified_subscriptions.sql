INSERT OR IGNORE INTO `system_settings`
(`key`, `value`, `is_secret`, `updated_by`, `created_at`, `updated_at`)
SELECT 'telegram.default_template_translations', `translations`, 0, NULL, `created_at`, `updated_at`
FROM `telegram_message_templates`
WHERE `id` = 'telegram-template-notifications';--> statement-breakpoint

CREATE TABLE `__new_telegram_notification_bindings` (
  `id` text PRIMARY KEY NOT NULL,
  `bot_id` text NOT NULL,
  `template_translations` text NOT NULL,
  `name` text NOT NULL,
  `target_username` text,
  `target_type` text NOT NULL,
  `target_id` text NOT NULL,
  `locale` text DEFAULT 'en-US' NOT NULL,
  `events` text NOT NULL,
  `enabled` integer DEFAULT true NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`bot_id`) REFERENCES `telegram_bots`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint

INSERT INTO `__new_telegram_notification_bindings`
(`id`, `bot_id`, `template_translations`, `name`, `target_username`, `target_type`, `target_id`, `locale`, `events`, `enabled`, `created_at`, `updated_at`)
SELECT target.`id`, target.`bot_id`,
  COALESCE(template.`translations`, defaults.`translations`, '{}'),
  target.`name`, NULL, target.`target_type`, target.`target_id`, target.`locale`,
  target.`events`, target.`enabled`, target.`created_at`, target.`updated_at`
FROM `telegram_notification_bindings` target
LEFT JOIN `telegram_message_templates` template ON template.`id` = target.`template_id`
LEFT JOIN `telegram_message_templates` defaults ON defaults.`id` = 'telegram-template-notifications';--> statement-breakpoint

INSERT INTO `__new_telegram_notification_bindings`
(`id`, `bot_id`, `template_translations`, `name`, `target_username`, `target_type`, `target_id`, `locale`, `events`, `enabled`, `created_at`, `updated_at`)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
  binding.`bot_id`,
  COALESCE(defaults.`translations`, '{}'),
  binding.`telegram_user_id`, NULL, 'private', binding.`telegram_user_id`, 'en-US',
  COALESCE((SELECT `value` FROM `system_settings` WHERE `key` = 'telegram.default_events'), '["*"]'),
  1, binding.`created_at`, binding.`updated_at`
FROM `telegram_bindings` binding
LEFT JOIN `telegram_message_templates` defaults ON defaults.`id` = 'telegram-template-notifications'
WHERE NOT EXISTS (
  SELECT 1 FROM `__new_telegram_notification_bindings` target
  WHERE target.`bot_id` = binding.`bot_id` AND target.`target_id` = binding.`telegram_user_id`
);--> statement-breakpoint

DROP TABLE `telegram_notification_bindings`;--> statement-breakpoint
ALTER TABLE `__new_telegram_notification_bindings` RENAME TO `telegram_notification_bindings`;--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_notifications_bot_target_uidx` ON `telegram_notification_bindings` (`bot_id`,`target_id`);--> statement-breakpoint
CREATE INDEX `telegram_notifications_event_idx` ON `telegram_notification_bindings` (`bot_id`,`enabled`);--> statement-breakpoint
CREATE INDEX `telegram_notifications_created_idx` ON `telegram_notification_bindings` (`created_at`,`id`);--> statement-breakpoint

CREATE TABLE `__new_telegram_bot_commands` (
  `id` text PRIMARY KEY NOT NULL,
  `command` text NOT NULL,
  `description_en_us` text NOT NULL,
  `description_ja_jp` text NOT NULL,
  `description_ko_kr` text NOT NULL,
  `description_ru_ru` text NOT NULL,
  `description_zh_tw` text NOT NULL,
  `description_zh_cn` text NOT NULL,
  `handler_type` text NOT NULL,
  `template_translations` text NOT NULL,
  `scope` text DEFAULT 'default' NOT NULL,
  `sort_order` integer DEFAULT 100 NOT NULL,
  `enabled` integer DEFAULT true NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);--> statement-breakpoint

INSERT INTO `__new_telegram_bot_commands`
(`id`, `command`, `description_en_us`, `description_ja_jp`, `description_ko_kr`, `description_ru_ru`, `description_zh_tw`, `description_zh_cn`, `handler_type`, `template_translations`, `scope`, `sort_order`, `enabled`, `created_at`, `updated_at`)
SELECT command.`id`, command.`command`, command.`description_en_us`, command.`description_ja_jp`,
  command.`description_ko_kr`, command.`description_ru_ru`, command.`description_zh_tw`,
  command.`description_zh_cn`, command.`handler_type`, COALESCE(template.`translations`, '{}'),
  command.`scope`, command.`sort_order`, command.`enabled`, command.`created_at`, command.`updated_at`
FROM `telegram_bot_commands` command
LEFT JOIN `telegram_message_templates` template ON template.`id` = command.`template_id`;--> statement-breakpoint

DROP TABLE `telegram_bot_commands`;--> statement-breakpoint
ALTER TABLE `__new_telegram_bot_commands` RENAME TO `telegram_bot_commands`;--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_commands_command_scope_uidx` ON `telegram_bot_commands` (`command`,`scope`);--> statement-breakpoint
CREATE INDEX `telegram_commands_sort_idx` ON `telegram_bot_commands` (`enabled`,`sort_order`);--> statement-breakpoint

DROP TABLE `telegram_bindings`;--> statement-breakpoint
DROP TABLE `telegram_message_templates`;--> statement-breakpoint
DELETE FROM `system_settings` WHERE `key` IN ('telegram.auto_subscribe_on_start', 'telegram.default_template_id');
