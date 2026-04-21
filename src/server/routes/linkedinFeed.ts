import Elysia from 'elysia';
import { z } from 'zod';
import { eq, inArray, desc, asc, sql, and, gte, isNotNull, lte } from 'drizzle-orm';
import { db } from '../db';
import { linkedinPosts, resume, settings, linkedinPostQuestions, recruiterContacts } from '../db/schema';
import { authPlugin } from '../plugins/auth';
import { parseLinkedInHtml } from '../lib/linkedinParser';
import type { ParsedPost } from '../lib/linkedinParser';
import { processLinkedInBatch } from '../lib/linkedinProcessor';
import { generateCoverLetter, generateAnswer, generateApplicationEmail } from '../lib/aiAnalyzer';
import { mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export const linkedinFeedRoutes = new Elysia({ prefix: '/api' })
  .use(authPlugin)

  .post('/linkedin-feed/upload/init', async ({ set }) => {
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const chunksDir = join(process.env.UPLOADS_DIR || './uploads', 'chunks', uploadId);
    await mkdir(chunksDir, { recursive: true });
    return { uploadId };
  }, {
    requireAuth: true,
  })

  .post('/linkedin-feed/upload/chunk', async ({ body, set }) => {
    const { uploadId, chunkIndex, totalChunks } = body;
    const CHUNK_SIZE_LIMIT = 512 * 1024; // 512 KB
    const MAX_CHUNKS = 200; // 100 MB total

    if (totalChunks > MAX_CHUNKS) {
      set.status = 400;
      return { message: `File too large. Maximum 100 MB allowed.` };
    }

    const chunksDir = join(process.env.UPLOADS_DIR || './uploads', 'chunks', uploadId);
    const chunkPath = join(chunksDir, `chunk-${String(chunkIndex).padStart(6, '0')}`);

    const raw = body.data;
    let chunkBuffer: Buffer;
    if (raw instanceof Blob) {
      chunkBuffer = Buffer.from(await raw.arrayBuffer());
    } else if (typeof raw === 'string') {
      chunkBuffer = Buffer.from(raw, 'binary');
    } else {
      chunkBuffer = Buffer.from(raw as ArrayBuffer);
    }

    if (chunkBuffer.length > CHUNK_SIZE_LIMIT) {
      set.status = 413;
      return { message: 'Chunk too large. Max 512 KB per chunk.' };
    }

    await writeFile(chunkPath, chunkBuffer);
    return { received: chunkIndex };
  }, {
    requireAuth: true,
    body: z.object({
      uploadId: z.string().min(1),
      chunkIndex: z.coerce.number().int().min(0),
      totalChunks: z.coerce.number().int().min(1),
      data: z.any(),
    }),
  })

  .post('/linkedin-feed/upload/finalize', async ({ body, set }) => {
    const { uploadId, filename } = body;
    const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100 MB

    const rawFilename = filename || 'linkedin.html';
    const isHtml = rawFilename.toLowerCase().endsWith('.html') || rawFilename.toLowerCase().endsWith('.htm');
    if (!isHtml) {
      set.status = 400;
      return { message: 'Only HTML files are allowed' };
    }

    const chunksDir = join(process.env.UPLOADS_DIR || './uploads', 'chunks', uploadId);
    let chunkFiles: string[];
    try {
      chunkFiles = (await readdir(chunksDir)).sort();
    } catch {
      set.status = 400;
      return { message: 'Upload session not found or expired' };
    }

    if (chunkFiles.length === 0) {
      set.status = 400;
      return { message: 'No chunks received' };
    }

    const parts = await Promise.all(chunkFiles.map((f) => readFile(join(chunksDir, f))));
    const assembled = Buffer.concat(parts);

    // Cleanup temp chunks
    rm(chunksDir, { recursive: true, force: true }).catch(() => {});

    if (assembled.length > MAX_TOTAL_SIZE) {
      set.status = 413;
      return { message: 'File too large. Maximum 100 MB allowed.' };
    }

    const html = assembled.toString('utf-8');
    const parsedPosts = parseLinkedInHtml(html);

    if (parsedPosts.length === 0) {
      return { batchId: null, total: 0, matched: 0, status: 'empty', message: 'No posts found in HTML' };
    }

    const seen = new Set<string>();
    const keywordMatchedPosts = parsedPosts.filter((p) => {
      if (p.matchedKeywords.length === 0 || seen.has(p.contentHash)) return false;
      seen.add(p.contentHash);
      return true;
    });

    if (keywordMatchedPosts.length === 0) {
      return { batchId: null, total: parsedPosts.length, matched: 0, status: 'no_keywords', message: 'No job-related keywords found in any post' };
    }

    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const hashes = keywordMatchedPosts.map((p) => p.contentHash);
    const existingRows = await db
      .select()
      .from(linkedinPosts)
      .where(inArray(linkedinPosts.contentHash, hashes));

    const existingMap = new Map(existingRows.map((r) => [r.contentHash, r]));

    const [resumeRow, apiKeyRow, modelRow] = await Promise.all([
      db.select().from(resume).limit(1),
      db.select().from(settings).where(eq(settings.key, 'openrouter_api_key')).limit(1),
      db.select().from(settings).where(eq(settings.key, 'openrouter_model')).limit(1),
    ]);

    const resumeText = resumeRow[0]?.extractedText || '';
    const apiKey = apiKeyRow[0]?.value || process.env.OPENROUTER_API_KEY || '';
    const model = modelRow[0]?.value || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-6';

    processLinkedInBatch(keywordMatchedPosts, existingMap, {
      batchId,
      resumeText,
      apiKey,
      model,
    }).catch((err) => {
      console.error(`[LinkedIn Batch] ${batchId} failed:`, err);
    });

    return {
      batchId,
      total: parsedPosts.length,
      matched: keywordMatchedPosts.length,
      status: 'processing',
      message: `Processing ${keywordMatchedPosts.length} keyword-matched posts in the background`,
    };
  }, {
    requireAuth: true,
    body: z.object({
      uploadId: z.string().min(1),
      filename: z.string().optional(),
    }),
  })

  .get('/linkedin-feed/batches', async () => {
    const rows = await db
      .select({
        batchId: linkedinPosts.batchId,
        total: sql<number>`count(*)`,
        processed: sql<number>`sum(case when ${linkedinPosts.aiAnalyzed} = true then 1 else 0 end)`,
        failed: sql<number>`sum(case when ${linkedinPosts.aiFailed} = true then 1 else 0 end)`,
        createdAt: sql<string>`min(${linkedinPosts.createdAt})`,
      })
      .from(linkedinPosts)
      .where(sql`${linkedinPosts.batchId} is not null`)
      .groupBy(linkedinPosts.batchId)
      .orderBy(sql`min(${linkedinPosts.createdAt}) desc`);

    return rows.map((r) => ({
      batchId: r.batchId!,
      total: Number(r.total),
      processed: Number(r.processed),
      failed: Number(r.failed),
      createdAt: r.createdAt,
    }));
  }, {
    requireAuth: true,
  })

  .get('/linkedin-feed/batch/:batchId', async ({ params }) => {
    const { batchId } = params;

    const countResult = await db
      .select({
        count: sql<number>`count(*)`,
        analyzed: sql<number>`sum(case when ${linkedinPosts.aiAnalyzed} = true then 1 else 0 end)`,
        failed: sql<number>`sum(case when ${linkedinPosts.aiFailed} = true then 1 else 0 end)`,
      })
      .from(linkedinPosts)
      .where(eq(linkedinPosts.batchId, batchId));

    const total = Number(countResult[0]?.count ?? 0);
    const processed = Number(countResult[0]?.analyzed ?? 0);
    const failed = Number(countResult[0]?.failed ?? 0);

    const posts = await db
      .select()
      .from(linkedinPosts)
      .where(eq(linkedinPosts.batchId, batchId))
      .orderBy(desc(linkedinPosts.createdAt))
      .limit(50);

    return {
      batchId,
      total,
      processed,
      failed,
      status: processed + failed >= total ? 'completed' : 'processing',
      posts,
    };
  }, {
    requireAuth: true,
    params: z.object({ batchId: z.string().min(1) }),
  })

  .post('/linkedin-feed/batch/:batchId/retry', async ({ params, set }) => {
    const { batchId } = params;

    const failedPosts = await db
      .select()
      .from(linkedinPosts)
      .where(and(
        eq(linkedinPosts.batchId, batchId),
        eq(linkedinPosts.aiFailed, true)
      ));

    if (failedPosts.length === 0) {
      return { retriedCount: 0, batchId, message: 'No failed posts found' };
    }

    await db
      .update(linkedinPosts)
      .set({ aiAnalyzed: false, aiFailed: false, summary: null, updatedAt: new Date() })
      .where(inArray(linkedinPosts.id, failedPosts.map((p) => p.id)));

    const [resumeRow, apiKeyRow, modelRow] = await Promise.all([
      db.select().from(resume).limit(1),
      db.select().from(settings).where(eq(settings.key, 'openrouter_api_key')).limit(1),
      db.select().from(settings).where(eq(settings.key, 'openrouter_model')).limit(1),
    ]);

    const resumeText = resumeRow[0]?.extractedText || '';
    const apiKey = apiKeyRow[0]?.value || process.env.OPENROUTER_API_KEY || '';
    const model = modelRow[0]?.value || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-6';

    if (!resumeText || !apiKey) {
      set.status = 400;
      return { message: 'Resume and API key required' };
    }

    const parsedPosts: ParsedPost[] = failedPosts.map((p) => ({
      contentHash: p.contentHash,
      authorName: p.authorName,
      authorHeadline: p.authorHeadline,
      postContent: p.postContent,
      rawHtml: p.rawHtml || '',
      matchedKeywords: p.matchedKeywords || [],
    }));

    processLinkedInBatch(parsedPosts, new Map(), {
      batchId,
      resumeText,
      apiKey,
      model,
    }).catch((err) => {
      console.error(`[LinkedIn Batch] ${batchId} retry failed:`, err);
    });

    return { retriedCount: failedPosts.length, batchId, message: `Retrying ${failedPosts.length} failed posts` };
  }, {
    requireAuth: true,
    params: z.object({ batchId: z.string().min(1) }),
  })

  .get('/linkedin-posts', async ({ query }) => {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const sort = (query.sort as string) ?? 'createdAt';
    const dir = (query.dir as string) ?? 'desc';
    const isJobFilter = query.isJob === 'true' ? true : query.isJob === 'false' ? false : undefined;
    const recommendationFilter = (query.recommendation as string) || undefined;
    const minScore = query.minScore ? Number(query.minScore) : undefined;
    const appStatusFilter = (query.appStatus as string) || undefined;

    const conditions = [];
    if (isJobFilter !== undefined) {
      conditions.push(eq(linkedinPosts.isJob, isJobFilter));
    }
    if (recommendationFilter) {
      conditions.push(eq(linkedinPosts.recommendation, recommendationFilter));
    }
    if (minScore !== undefined && !Number.isNaN(minScore)) {
      conditions.push(gte(linkedinPosts.score, minScore));
    }
    if (appStatusFilter) {
      conditions.push(eq(linkedinPosts.appStatus, appStatusFilter));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(linkedinPosts)
      .where(whereClause);

    const total = Number(countResult[0]?.count ?? 0);

    const rows = await db
      .select()
      .from(linkedinPosts)
      .where(whereClause)
      .orderBy(dir === 'desc' ? desc(linkedinPosts[sort as keyof typeof linkedinPosts.$inferSelect]) : asc(linkedinPosts[sort as keyof typeof linkedinPosts.$inferSelect]))
      .limit(limit)
      .offset((page - 1) * limit);

    return { posts: rows, total, page };
  }, {
    requireAuth: true,
  })

  .get('/linkedin-posts/reminders', async () => {
    const rows = await db
      .select({
        id: linkedinPosts.id,
        authorName: linkedinPosts.authorName,
        company: linkedinPosts.company,
        title: linkedinPosts.title,
        reminderAt: linkedinPosts.reminderAt,
        appStatus: linkedinPosts.appStatus,
        emailSentAt: linkedinPosts.emailSentAt,
      })
      .from(linkedinPosts)
      .where(isNotNull(linkedinPosts.reminderAt))
      .orderBy(asc(linkedinPosts.reminderAt));
    return rows;
  }, {
    requireAuth: true,
  })

  .get('/linkedin-posts/:id', async ({ params, set }) => {
    const [post] = await db.select().from(linkedinPosts).where(eq(linkedinPosts.id, params.id)).limit(1);
    if (!post) {
      set.status = 404;
      return { message: 'Not found' };
    }
    return post;
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  })

  .patch('/linkedin-posts/:id', async ({ params, body, set }) => {
    const [existing] = await db.select().from(linkedinPosts).where(eq(linkedinPosts.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return { message: 'Not found' };
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.appStatus !== undefined) updateData.appStatus = body.appStatus;
    if (body.appNotes !== undefined) updateData.appNotes = body.appNotes;
    if (body.appliedAt !== undefined) updateData.appliedAt = body.appliedAt ? new Date(body.appliedAt) : null;
    if (body.emailSentAt !== undefined) updateData.emailSentAt = body.emailSentAt ? new Date(body.emailSentAt) : null;
    if (body.reminderAt !== undefined) updateData.reminderAt = body.reminderAt ? new Date(body.reminderAt) : null;

    const [updated] = await db
      .update(linkedinPosts)
      .set(updateData)
      .where(eq(linkedinPosts.id, params.id))
      .returning();

    // When email is marked as sent, upsert global recruiter contact tracking
    if (body.emailSentAt && existing.contactEmail) {
      const sentAt = new Date(body.emailSentAt);
      await db
        .insert(recruiterContacts)
        .values({
          contactEmail: existing.contactEmail,
          authorName: existing.authorName,
          lastEmailedAt: sentAt,
          emailCount: 1,
        })
        .onConflictDoUpdate({
          target: recruiterContacts.contactEmail,
          set: {
            lastEmailedAt: sentAt,
            emailCount: sql`${recruiterContacts.emailCount} + 1`,
            updatedAt: new Date(),
          },
        });
    }

    return updated;
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: z.object({
      appStatus: z.string().optional(),
      appNotes: z.string().optional(),
      appliedAt: z.string().datetime().optional().nullable(),
      emailSentAt: z.string().datetime().optional().nullable(),
      reminderAt: z.string().datetime().optional().nullable(),
    }),
  })

  .post('/linkedin-posts/:id/cover-letter', async ({ params, set }) => {
    const [post] = await db.select().from(linkedinPosts).where(eq(linkedinPosts.id, params.id)).limit(1);
    if (!post) {
      set.status = 404;
      return { message: 'Not found' };
    }

    const [resumeRow, apiKeyRow, modelRow] = await Promise.all([
      db.select().from(resume).limit(1),
      db.select().from(settings).where(eq(settings.key, 'openrouter_api_key')).limit(1),
      db.select().from(settings).where(eq(settings.key, 'openrouter_model')).limit(1),
    ]);

    const resumeText = resumeRow[0]?.extractedText || '';
    const apiKey = apiKeyRow[0]?.value || process.env.OPENROUTER_API_KEY || '';
    const model = modelRow[0]?.value || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-6';

    if (!resumeText || !apiKey) {
      set.status = 400;
      return { message: 'Resume and API key required' };
    }

    const coverLetter = await generateCoverLetter(
      {
        title: post.title,
        company: post.company,
        location: post.location,
        descriptionSummary: post.postContent,
        matchedSkills: post.matchedSkills,
        missingSkills: post.missingSkills,
      },
      resumeText,
      apiKey,
      model
    );

    const [updated] = await db
      .update(linkedinPosts)
      .set({ coverLetter, updatedAt: new Date() })
      .where(eq(linkedinPosts.id, params.id))
      .returning();

    return { coverLetter, post: updated };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  })

  .post('/linkedin-posts/:id/email', async ({ params, set }) => {
    const [post] = await db.select().from(linkedinPosts).where(eq(linkedinPosts.id, params.id)).limit(1);
    if (!post) {
      set.status = 404;
      return { message: 'Not found' };
    }

    const [resumeRow, apiKeyRow, modelRow] = await Promise.all([
      db.select().from(resume).limit(1),
      db.select().from(settings).where(eq(settings.key, 'openrouter_api_key')).limit(1),
      db.select().from(settings).where(eq(settings.key, 'openrouter_model')).limit(1),
    ]);

    const resumeText = resumeRow[0]?.extractedText || '';
    const apiKey = apiKeyRow[0]?.value || process.env.OPENROUTER_API_KEY || '';
    const model = modelRow[0]?.value || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-6';

    if (!resumeText || !apiKey) {
      set.status = 400;
      return { message: 'Resume and API key required' };
    }

    // Fallback: extract email from post content if not stored
    const contactEmail = post.contactEmail || '';
    if (!contactEmail) {
      set.status = 400;
      return { message: 'No contact email found for this post' };
    }

    const { subject, body } = await generateApplicationEmail(
      {
        title: post.title,
        company: post.company,
        location: post.location,
        descriptionSummary: post.postContent,
        matchedSkills: post.matchedSkills,
        missingSkills: post.missingSkills,
      },
      resumeText,
      contactEmail,
      apiKey,
      model
    );

    const [updated] = await db.update(linkedinPosts)
      .set({ emailSubject: subject, emailBody: body, updatedAt: new Date() })
      .where(eq(linkedinPosts.id, params.id))
      .returning();

    return { subject, body, post: updated };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  })

  .get('/linkedin-posts/:id/questions', async ({ params, set }) => {
    const [post] = await db.select().from(linkedinPosts).where(eq(linkedinPosts.id, params.id)).limit(1);
    if (!post) {
      set.status = 404;
      return { message: 'Not found' };
    }

    const questions = await db
      .select()
      .from(linkedinPostQuestions)
      .where(eq(linkedinPostQuestions.linkedinPostId, params.id))
      .orderBy(desc(linkedinPostQuestions.createdAt));

    return { questions };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  })

  .post('/linkedin-posts/:id/questions', async ({ params, body, set }) => {
    const [post] = await db.select().from(linkedinPosts).where(eq(linkedinPosts.id, params.id)).limit(1);
    if (!post) {
      set.status = 404;
      return { message: 'Not found' };
    }

    const [resumeRow, apiKeyRow, modelRow] = await Promise.all([
      db.select().from(resume).limit(1),
      db.select().from(settings).where(eq(settings.key, 'openrouter_api_key')).limit(1),
      db.select().from(settings).where(eq(settings.key, 'openrouter_model')).limit(1),
    ]);

    const resumeText = resumeRow[0]?.extractedText || '';
    const apiKey = apiKeyRow[0]?.value || process.env.OPENROUTER_API_KEY || '';
    const model = modelRow[0]?.value || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-6';

    if (!resumeText || !apiKey) {
      set.status = 400;
      return { message: 'Resume and API key required' };
    }

    const answer = await generateAnswer(
      body.question,
      {
        title: post.title,
        company: post.company,
        location: post.location,
        descriptionSummary: post.postContent,
        matchedSkills: post.matchedSkills,
        missingSkills: post.missingSkills,
      },
      resumeText,
      apiKey,
      model
    );

    const [question] = await db
      .insert(linkedinPostQuestions)
      .values({
        linkedinPostId: params.id,
        question: body.question,
        answer,
      })
      .returning();

    return { question };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: z.object({ question: z.string().min(1) }),
  })

  .patch('/linkedin-posts/:id/questions/:questionId', async ({ params, body, set }) => {
    const [existing] = await db
      .select()
      .from(linkedinPostQuestions)
      .where(eq(linkedinPostQuestions.id, params.questionId))
      .limit(1);

    if (!existing || existing.linkedinPostId !== params.id) {
      set.status = 404;
      return { message: 'Not found' };
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.question !== undefined) updateData.question = body.question;
    if (body.answer !== undefined) updateData.answer = body.answer;

    const [updated] = await db
      .update(linkedinPostQuestions)
      .set(updateData)
      .where(eq(linkedinPostQuestions.id, params.questionId))
      .returning();

    return { question: updated };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive(), questionId: z.coerce.number().int().positive() }),
    body: z.object({
      question: z.string().optional(),
      answer: z.string().optional(),
    }),
  })

  .delete('/linkedin-posts/:id/questions/:questionId', async ({ params, set }) => {
    const [existing] = await db
      .select()
      .from(linkedinPostQuestions)
      .where(eq(linkedinPostQuestions.id, params.questionId))
      .limit(1);

    if (!existing || existing.linkedinPostId !== params.id) {
      set.status = 404;
      return { message: 'Not found' };
    }

    await db.delete(linkedinPostQuestions).where(eq(linkedinPostQuestions.id, params.questionId));
    return { deleted: true };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive(), questionId: z.coerce.number().int().positive() }),
  })

  .get('/recruiter-contacts/:email', async ({ params, set }) => {
    const email = decodeURIComponent(params.email);
    const [contact] = await db
      .select()
      .from(recruiterContacts)
      .where(eq(recruiterContacts.contactEmail, email))
      .limit(1);

    if (!contact) {
      set.status = 404;
      return { message: 'Not found' };
    }

    return contact;
  }, {
    requireAuth: true,
    params: z.object({ email: z.string().min(1) }),
  })

  .delete('/linkedin-posts/:id', async ({ params, set }) => {
    const [existing] = await db.select().from(linkedinPosts).where(eq(linkedinPosts.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return { message: 'Not found' };
    }
    await db.delete(linkedinPosts).where(eq(linkedinPosts.id, params.id));
    return { deleted: true };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  });
