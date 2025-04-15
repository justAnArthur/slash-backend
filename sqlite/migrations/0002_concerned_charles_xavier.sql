CREATE TABLE `device` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`pushToken` text NOT NULL,
	`brand` text,
	`model` text,
	`osName` text,
	`osVersion` text,
	`deviceName` text,
	`deviceYear` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
