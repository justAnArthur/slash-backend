ALTER TABLE message ADD `type` text DEFAULT 'TEXT' NOT NULL;--> statement-breakpoint
ALTER TABLE `message` DROP COLUMN `image_url`;