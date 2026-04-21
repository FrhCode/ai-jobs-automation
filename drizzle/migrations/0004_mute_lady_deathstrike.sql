CREATE TABLE "recruiter_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_email" text NOT NULL,
	"author_name" text,
	"last_emailed_at" timestamp with time zone,
	"email_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recruiter_contacts_contact_email_unique" UNIQUE("contact_email")
);
