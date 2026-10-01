CREATE TABLE `recurrence_rules` (
	`task_id` bigint unsigned NOT NULL,
	`type` enum('none','daily','weekdays','times_per_week') NOT NULL DEFAULT 'none',
	`weekdays` json,
	`times_per_week` tinyint unsigned,
	CONSTRAINT `recurrence_rules_task_id` PRIMARY KEY(`task_id`),
	CONSTRAINT `recurrence_rules_times_per_week_check` CHECK((`recurrence_rules`.`type` = 'times_per_week' AND `recurrence_rules`.`times_per_week` BETWEEN 1 AND 7) OR (`recurrence_rules`.`type` <> 'times_per_week' AND `recurrence_rules`.`times_per_week` IS NULL)),
	CONSTRAINT `recurrence_rules_weekdays_check` CHECK((`recurrence_rules`.`type` = 'weekdays' AND `recurrence_rules`.`weekdays` IS NOT NULL) OR (`recurrence_rules`.`type` <> 'weekdays' AND `recurrence_rules`.`weekdays` IS NULL))
);
--> statement-breakpoint
CREATE TABLE `task_completions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`task_id` bigint unsigned NOT NULL,
	`completed_on` date NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_completions_id` PRIMARY KEY(`id`),
	CONSTRAINT `task_completions_task_date_unique` UNIQUE(`task_id`,`completed_on`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`title` varchar(255) NOT NULL,
	`notes` text,
	`life_area` enum('Career','Fitness','Health','Learning','Personal','Finance') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` bigint unsigned NOT NULL,
	`theme_color` enum('Pink','Purple','Blue','Green','Red') NOT NULL DEFAULT 'Pink',
	`week_start` enum('Monday','Sunday') NOT NULL DEFAULT 'Monday',
	`daily_check_in_enabled` boolean NOT NULL DEFAULT false,
	`daily_check_in_time` time NOT NULL DEFAULT '09:00:00',
	`life_areas` json NOT NULL DEFAULT (JSON_ARRAY('Career','Fitness','Health','Learning','Personal','Finance')),
	CONSTRAINT `user_settings_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `recurrence_rules` ADD CONSTRAINT `recurrence_rules_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_completions` ADD CONSTRAINT `task_completions_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_settings` ADD CONSTRAINT `user_settings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tasks_user_id_idx` ON `tasks` (`user_id`);