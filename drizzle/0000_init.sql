CREATE TABLE `checkups` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`photo_key` text,
	`question` text,
	`result` text NOT NULL,
	`model` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `checkups_pet_idx` ON `checkups` (`pet_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `feedings` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`fed_at` integer NOT NULL,
	`prey_type` text NOT NULL,
	`prey_size` text,
	`prey_state` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`accepted` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `feedings_pet_idx` ON `feedings` (`pet_id`,`fed_at`);--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`measured_at` integer NOT NULL,
	`length_cm` real,
	`weight_g` real,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `measurements_pet_idx` ON `measurements` (`pet_id`,`measured_at`);--> statement-breakpoint
CREATE TABLE `pets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`species` text,
	`sex` text DEFAULT 'unknown' NOT NULL,
	`birth_date` text,
	`length_cm` real,
	`weight_g` real,
	`feeding_interval_days` integer DEFAULT 7 NOT NULL,
	`avatar_key` text,
	`notes` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`key` text NOT NULL,
	`caption` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `photos_pet_idx` ON `photos` (`pet_id`);