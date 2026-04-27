ALTER TABLE "linkedin_posts" ADD COLUMN "email_status" text DEFAULT 'idle';--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD COLUMN "email_error" text;