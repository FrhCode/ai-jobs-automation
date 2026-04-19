CREATE TABLE "job_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"company" text,
	"location" text,
	"salary" text,
	"description_summary" text,
	"score" integer,
	"matched_skills" text[],
	"missing_skills" text[],
	"summary" text,
	"recommendation" text,
	"scrape_status" text,
	"app_status" text DEFAULT 'not_applied',
	"app_notes" text,
	"applied_at" timestamp with time zone,
	"cover_letter" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linkedin_post_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"linkedin_post_id" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linkedin_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_hash" text NOT NULL,
	"batch_id" text,
	"author_name" text,
	"author_headline" text,
	"post_content" text NOT NULL,
	"raw_html" text,
	"matched_keywords" text[],
	"is_job" boolean DEFAULT false,
	"title" text,
	"company" text,
	"location" text,
	"salary" text,
	"score" integer,
	"matched_skills" text[],
	"missing_skills" text[],
	"summary" text,
	"recommendation" text,
	"ai_analyzed" boolean DEFAULT false,
	"promoted_to_job_id" integer,
	"app_status" text DEFAULT 'not_applied',
	"app_notes" text,
	"cover_letter" text,
	"applied_at" timestamp with time zone,
	"apply_url" text,
	"contact_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "linkedin_posts_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE TABLE "queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_msg" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"source" text DEFAULT 'manual',
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "resume" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"file_path" text NOT NULL,
	"extracted_text" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_url_idx" ON "jobs" USING btree ("url");--> statement-breakpoint
CREATE INDEX "linkedin_posts_batch_id_idx" ON "linkedin_posts" USING btree ("batch_id");