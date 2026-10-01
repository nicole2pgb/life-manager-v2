ALTER TABLE `tasks` ADD `scheduled_date` date;--> statement-breakpoint
ALTER TABLE `tasks` ADD `due_date` date;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_single_date_check` CHECK (`tasks`.`scheduled_date` IS NULL OR `tasks`.`due_date` IS NULL);