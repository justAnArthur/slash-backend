CREATE TABLE `chats` (
	`id` text PRIMARY KEY NOT NULL,
	`user1_id` text NOT NULL,
	`user2_id` text NOT NULL,
	FOREIGN KEY (`user1_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user2_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`content` text,
	`image_url` text,
	`timestamp` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
