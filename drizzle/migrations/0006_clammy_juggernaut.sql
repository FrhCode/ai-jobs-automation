ALTER TABLE "jobs" ADD COLUMN "tailored_resume_status" text DEFAULT 'idle';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "tailored_resume_error" text;--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD COLUMN "tailored_resume_status" text DEFAULT 'idle';--> statement-breakpoint
ALTER TABLE "linkedin_posts" ADD COLUMN "tailored_resume_error" text;