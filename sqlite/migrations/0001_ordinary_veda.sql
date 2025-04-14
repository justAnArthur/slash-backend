CREATE TABLE `twoFactor` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`secret` text,
	`backupCodes` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE user ADD `twoFactorEnabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `totpSecret`;