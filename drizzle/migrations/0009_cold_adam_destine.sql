CREATE TABLE "cv_shares" (
	"token" text PRIMARY KEY NOT NULL,
	"job_id" integer,
	"linkedin_post_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
