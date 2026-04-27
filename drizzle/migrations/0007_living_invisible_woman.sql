ALTER TABLE "job_questions" ADD COLUMN "answer_status" text DEFAULT 'idle';--> statement-breakpoint
ALTER TABLE "job_questions" ADD COLUMN "answer_error" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "cover_letter_status" text DEFAULT 'idle';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "cover_letter_error" text;