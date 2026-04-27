import { pgTable, text, integer, timestamp, serial, uniqueIndex, boolean, index } from 'drizzle-orm/pg-core';

export const jobs = pgTable('jobs', {
  id: serial('id').primaryKey(),
  url: text('url').notNull(),
  title: text('title'),
  company: text('company'),
  location: text('location'),
  salary: text('salary'),
  descriptionSummary: text('description_summary'),
  score: integer('score'),
  matchedSkills: text('matched_skills').array(),
  missingSkills: text('missing_skills').array(),
  summary: text('summary'),
  recommendation: text('recommendation'),
  scrapeStatus: text('scrape_status'),
  appStatus: text('app_status').default('not_applied'),
  appNotes: text('app_notes'),
  appliedAt: timestamp('applied_at', { withTimezone: true }),
  coverLetter: text('cover_letter'),
  coverLetterStatus: text('cover_letter_status').default('idle'),
  coverLetterError: text('cover_letter_error'),
  tailoredResume: text('tailored_resume'),
  tailoredResumePdfPath: text('tailored_resume_pdf_path'),
  tailoredResumeStatus: text('tailored_resume_status').default('idle'),
  tailoredResumeError: text('tailored_resume_error'),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ urlIdx: uniqueIndex('jobs_url_idx').on(t.url) }));

export const queue = pgTable('queue', {
  id: serial('id').primaryKey(),
  url: text('url').notNull(),
  status: text('status').notNull().default('pending'),
  errorMsg: text('error_msg'),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  source: text('source').default('manual'),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

export const resume = pgTable('resume', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  filePath: text('file_path').notNull(),
  extractedText: text('extracted_text').notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
});

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const jobQuestions = pgTable('job_questions', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').notNull(),
  question: text('question').notNull(),
  answer: text('answer'),
  answerStatus: text('answer_status').default('idle'),
  answerError: text('answer_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const linkedinPostQuestions = pgTable('linkedin_post_questions', {
  id: serial('id').primaryKey(),
  linkedinPostId: integer('linkedin_post_id').notNull(),
  question: text('question').notNull(),
  answer: text('answer'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const linkedinPosts = pgTable('linkedin_posts', {
  id: serial('id').primaryKey(),
  contentHash: text('content_hash').notNull().unique(),
  batchId: text('batch_id'),
  authorName: text('author_name'),
  authorHeadline: text('author_headline'),
  postContent: text('post_content').notNull(),
  rawHtml: text('raw_html'),
  matchedKeywords: text('matched_keywords').array(),
  isJob: boolean('is_job').default(false),
  title: text('title'),
  company: text('company'),
  location: text('location'),
  salary: text('salary'),
  score: integer('score'),
  matchedSkills: text('matched_skills').array(),
  missingSkills: text('missing_skills').array(),
  summary: text('summary'),
  recommendation: text('recommendation'),
  aiAnalyzed: boolean('ai_analyzed').default(false),
  aiFailed: boolean('ai_failed').default(false),
  promotedToJobId: integer('promoted_to_job_id'),
  appStatus: text('app_status').default('not_applied'),
  appNotes: text('app_notes'),
  coverLetter: text('cover_letter'),
  tailoredResume: text('tailored_resume'),
  tailoredResumePdfPath: text('tailored_resume_pdf_path'),
  tailoredResumeStatus: text('tailored_resume_status').default('idle'),
  tailoredResumeError: text('tailored_resume_error'),
  emailSubject: text('email_subject'),
  emailBody: text('email_body'),
  appliedAt: timestamp('applied_at', { withTimezone: true }),
  emailSentAt: timestamp('email_sent_at', { withTimezone: true }),
  reminderAt: timestamp('reminder_at', { withTimezone: true }),
  applyUrl: text('apply_url'),
  contactEmail: text('contact_email'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  batchIdIdx: index('linkedin_posts_batch_id_idx').on(t.batchId),
}));

export type SelectJob = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;
export type SelectQueue = typeof queue.$inferSelect;
export type InsertQueue = typeof queue.$inferInsert;
export type SelectResume = typeof resume.$inferSelect;
export type InsertResume = typeof resume.$inferInsert;
export type SelectSettings = typeof settings.$inferSelect;
export type SelectSession = typeof sessions.$inferSelect;
export type SelectJobQuestion = typeof jobQuestions.$inferSelect;
export type InsertJobQuestion = typeof jobQuestions.$inferInsert;
export type SelectLinkedInPostQuestion = typeof linkedinPostQuestions.$inferSelect;
export type InsertLinkedInPostQuestion = typeof linkedinPostQuestions.$inferInsert;
export const recruiterContacts = pgTable('recruiter_contacts', {
  id: serial('id').primaryKey(),
  contactEmail: text('contact_email').notNull().unique(),
  authorName: text('author_name'),
  lastEmailedAt: timestamp('last_emailed_at', { withTimezone: true }),
  emailCount: integer('email_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type SelectLinkedInPost = typeof linkedinPosts.$inferSelect;
export type InsertLinkedInPost = typeof linkedinPosts.$inferInsert;
export type SelectRecruiterContact = typeof recruiterContacts.$inferSelect;
