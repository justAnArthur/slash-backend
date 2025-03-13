CREATE TABLE `file` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `message_attachment` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`image_file_id` text,
	`json` text,
	FOREIGN KEY (`message_id`) REFERENCES `message`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`image_file_id`) REFERENCES `file`(`id`) ON UPDATE no action ON DELETE set null
);
