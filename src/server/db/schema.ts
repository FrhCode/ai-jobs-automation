import { pgTable, text, integer, timestamp, serial, uniqueIndex } from 'drizzle-orm/pg-core';

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

export type SelectJob = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;
export type SelectQueue = typeof queue.$inferSelect;
export type InsertQueue = typeof queue.$inferInsert;
export type SelectResume = typeof resume.$inferSelect;
export type InsertResume = typeof resume.$inferInsert;
export type SelectSettings = typeof settings.$inferSelect;
export type SelectSession = typeof sessions.$inferSelect;
