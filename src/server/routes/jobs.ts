import Elysia from 'elysia';
import { z } from 'zod';
import { eq, and, ilike, desc, asc, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import { jobs, queue, resume, settings, jobQuestions } from '../db/schema';
import { authPlugin } from '../plugins/auth';
import {
  jobsQuerySchema,
  updateJobSchema,
  enqueueSchema,
  deleteJobsSchema,
  createQuestionSchema,
  updateQuestionSchema,
} from '../../shared/schemas/jobs';
import { processQueue } from '../lib/jobQueue';
import { generateCoverLetter, generateAnswer, generateTailoredResume } from '../lib/aiAnalyzer';
import { renderResumePdf } from '../lib/resumePdfRenderer';
import { logger } from '../lib/logger';
import { mkdir, writeFile } from 'node:fs/promises';

export const jobsRoutes = new Elysia({ prefix: '/api/jobs' })
  .use(authPlugin)

  .get('/', async ({ query }) => {
    const { page, limit, sort, dir, recommendation, appStatus, q } = query;

    const whereConditions = [];
    if (recommendation) {
      whereConditions.push(eq(jobs.recommendation, recommendation));
    } else {
      whereConditions.push(sql`${jobs.recommendation} is distinct from 'Skip'`);
    }
    if (appStatus) whereConditions.push(eq(jobs.appStatus, appStatus));
    if (q) whereConditions.push(ilike(jobs.title, `%${q}%`));

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const total = Number(countResult[0]?.count ?? 0);

    const rows = await db.select().from(jobs)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(dir === 'desc' ? desc(jobs[sort]) : asc(jobs[sort]))
      .limit(limit)
      .offset((page - 1) * limit);

    return { jobs: rows, total, page };
  }, {
    requireAuth: true,
    query: jobsQuerySchema,
  })

  .get('/:id', async ({ params, set }) => {
    const [row] = await db.select().from(jobs).where(eq(jobs.id, params.id)).limit(1);
    if (!row) {
      set.status = 404;
      return { message: 'Not found' };
    }
    return row;
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  })

  .post('/enqueue', async ({ body }) => {
    const { enqueued, duplicates } = await db.transaction(async (tx) => {
      const existing = await tx.select({ url: jobs.url }).from(jobs);
      const existingSet = new Set(existing.map((r) => r.url));
      const newUrls = body.urls.filter((u) => !existingSet.has(u));

      if (newUrls.length > 0) {
        await tx.insert(queue).values(
          newUrls.map((url) => ({ url, source: 'manual' as const }))
        );
      }

      return { enqueued: newUrls.length, duplicates: body.urls.length - newUrls.length };
    });

    processQueue().catch((err) => logger.error('[Queue] Process error:', err));

    return { enqueued, duplicates };
  }, {
    requireAuth: true,
    body: enqueueSchema,
  })

  .patch('/:id', async ({ params, body, set }) => {
    const updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.appliedAt) {
      updateData.appliedAt = new Date(body.appliedAt);
    }
    const [updated] = await db.update(jobs)
      .set(updateData)
      .where(eq(jobs.id, params.id))
      .returning();
    if (!updated) {
      set.status = 404;
      return { message: 'Not found' };
    }
    return updated;
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: updateJobSchema,
  })

  .post('/:id/reanalyze', async ({ params, set }) => {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, params.id)).limit(1);
    if (!job) {
      set.status = 404;
      return { message: 'Not found' };
    }

    await db.transaction(async (tx) => {
      await tx.insert(queue).values({ url: job.url, source: 'reanalyze' });
    });

    processQueue().catch((err) => logger.error('[Queue] Process error:', err));

    return { queued: true };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  })

  .post('/:id/cover-letter', async ({ params, set }) => {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, params.id)).limit(1);
    if (!job) {
      set.status = 404;
      return { message: 'Not found' };
    }

    const [resumeRow] = await db.select().from(resume).limit(1);
    if (!resumeRow) {
      set.status = 400;
      return { message: 'No resume uploaded. Please upload a resume first.' };
    }

    const [apiKeyRow, modelRow] = await Promise.all([
      db.select().from(settings).where(eq(settings.key, 'openrouter_api_key')).limit(1),
      db.select().from(settings).where(eq(settings.key, 'openrouter_model')).limit(1),
    ]);
    const apiKey = apiKeyRow[0]?.value || process.env.OPENROUTER_API_KEY || '';
    const model = modelRow[0]?.value || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4';

    if (!apiKey) {
      set.status = 400;
      return { message: 'No OpenRouter API key configured.' };
    }

    if (job.coverLetterStatus === 'generating') {
      set.status = 409;
      return { status: 'generating', message: 'Cover letter generation already in progress.' };
    }

    await db.update(jobs)
      .set({ coverLetterStatus: 'generating', coverLetterError: null, updatedAt: new Date() })
      .where(eq(jobs.id, params.id));

    (async () => {
      try {
        const coverLetter = await generateCoverLetter(job, resumeRow.extractedText, apiKey, model);
        await db.update(jobs)
          .set({ coverLetter, coverLetterStatus: 'ready', coverLetterError: null, updatedAt: new Date() })
          .where(eq(jobs.id, params.id));
        logger.info(`[CoverLetter] Job ${params.id} completed successfully`);
      } catch (err) {
        const errorMsg = (err as Error).message;
        logger.error(`[CoverLetter] Job ${params.id} failed: ${errorMsg}`);
        await db.update(jobs)
          .set({ coverLetterStatus: 'failed', coverLetterError: errorMsg, updatedAt: new Date() })
          .where(eq(jobs.id, params.id));
      }
    })();

    set.status = 202;
    return { status: 'generating', message: 'Cover letter generation started.' };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  })

  .get('/:id/cover-letter/status', async ({ params, set }) => {
    const [job] = await db.select({
      id: jobs.id,
      coverLetterStatus: jobs.coverLetterStatus,
      coverLetterError: jobs.coverLetterError,
    }).from(jobs).where(eq(jobs.id, params.id)).limit(1);

    if (!job) {
      set.status = 404;
      return { message: 'Not found' };
    }

    return {
      jobId: job.id,
      status: job.coverLetterStatus || 'idle',
      error: job.coverLetterError,
    };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  })

  .post('/:id/tailored-resume', async ({ params, set }) => {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, params.id)).limit(1);
    if (!job) {
      set.status = 404;
      return { message: 'Not found' };
    }

    const [resumeRow] = await db.select().from(resume).limit(1);
    if (!resumeRow) {
      set.status = 400;
      return { message: 'No resume uploaded. Please upload a resume first.' };
    }

    const [apiKeyRow, modelRow] = await Promise.all([
      db.select().from(settings).where(eq(settings.key, 'openrouter_api_key')).limit(1),
      db.select().from(settings).where(eq(settings.key, 'openrouter_model')).limit(1),
    ]);
    const apiKey = apiKeyRow[0]?.value || process.env.OPENROUTER_API_KEY || '';
    const model = modelRow[0]?.value || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4';

    if (!apiKey) {
      set.status = 400;
      return { message: 'No OpenRouter API key configured.' };
    }

    // If already generating, don't start a new one
    if (job.tailoredResumeStatus === 'generating') {
      set.status = 409;
      return { status: 'generating', message: 'Tailored resume generation already in progress.' };
    }

    // Mark as generating immediately
    await db.update(jobs)
      .set({ tailoredResumeStatus: 'generating', tailoredResumeError: null, updatedAt: new Date() })
      .where(eq(jobs.id, params.id));

    // Fire-and-forget background processing
    (async () => {
      try {
        const tailoredResume = await generateTailoredResume(job, resumeRow.extractedText, apiKey, model);
        const pdfBuffer = await renderResumePdf(tailoredResume);

        const cvsDir = 'uploads/cvs';
        await mkdir(cvsDir, { recursive: true });
        const pdfPath = `${cvsDir}/job-${params.id}.pdf`;
        await writeFile(pdfPath, pdfBuffer);

        await db.update(jobs)
          .set({
            tailoredResume: JSON.stringify(tailoredResume),
            tailoredResumePdfPath: pdfPath,
            tailoredResumeStatus: 'ready',
            tailoredResumeError: null,
            updatedAt: new Date(),
          })
          .where(eq(jobs.id, params.id));

        logger.info(`[TailoredResume] Job ${params.id} completed successfully`);
      } catch (err) {
        const errorMsg = (err as Error).message;
        logger.error(`[TailoredResume] Job ${params.id} failed: ${errorMsg}`);
        await db.update(jobs)
          .set({
            tailoredResumeStatus: 'failed',
            tailoredResumeError: errorMsg,
            updatedAt: new Date(),
          })
          .where(eq(jobs.id, params.id));
      }
    })();

    set.status = 202;
    return { status: 'generating', message: 'Tailored resume generation started.' };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  })

  .get('/:id/tailored-resume/status', async ({ params, set }) => {
    const [job] = await db.select({
      id: jobs.id,
      tailoredResumeStatus: jobs.tailoredResumeStatus,
      tailoredResumeError: jobs.tailoredResumeError,
      tailoredResumePdfPath: jobs.tailoredResumePdfPath,
    }).from(jobs).where(eq(jobs.id, params.id)).limit(1);

    if (!job) {
      set.status = 404;
      return { message: 'Not found' };
    }

    return {
      jobId: job.id,
      status: job.tailoredResumeStatus || 'idle',
      error: job.tailoredResumeError,
      pdfPath: job.tailoredResumePdfPath,
    };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  })

  .get('/:id/tailored-resume.pdf', async ({ params, set }) => {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, params.id)).limit(1);
    if (!job || !job.tailoredResumePdfPath) {
      set.status = 404;
      return { message: 'No tailored resume found. Generate one first.' };
    }

    const file = Bun.file(job.tailoredResumePdfPath);
    const exists = await file.exists();
    if (!exists) {
      set.status = 404;
      return { message: 'PDF file not found.' };
    }

    set.headers['Content-Type'] = 'application/pdf';
    set.headers['Content-Disposition'] = `attachment; filename="${job.company || 'Company'}-Resume.pdf"`;
    return file;
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  })

  .delete('/', async ({ body }) => {
    const result = await db.delete(jobs).where(inArray(jobs.id, body.ids));
    return { deleted: body.ids.length };
  }, {
    requireAuth: true,
    body: deleteJobsSchema,
  })

  .get('/:id/questions', async ({ params, set }) => {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, params.id)).limit(1);
    if (!job) {
      set.status = 404;
      return { message: 'Not found' };
    }
    const rows = await db.select().from(jobQuestions).where(eq(jobQuestions.jobId, params.id)).orderBy(jobQuestions.createdAt);
    return rows;
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  })

  .post('/:id/questions', async ({ params, body, set }) => {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, params.id)).limit(1);
    if (!job) {
      set.status = 404;
      return { message: 'Not found' };
    }

    const [resumeRow] = await db.select().from(resume).limit(1);
    if (!resumeRow) {
      set.status = 400;
      return { message: 'No resume uploaded. Please upload a resume first.' };
    }

    const [apiKeyRow, modelRow] = await Promise.all([
      db.select().from(settings).where(eq(settings.key, 'openrouter_api_key')).limit(1),
      db.select().from(settings).where(eq(settings.key, 'openrouter_model')).limit(1),
    ]);
    const apiKey = apiKeyRow[0]?.value || process.env.OPENROUTER_API_KEY || '';
    const model = modelRow[0]?.value || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-6';

    if (!apiKey) {
      set.status = 400;
      return { message: 'No OpenRouter API key configured.' };
    }

    const [inserted] = await db.insert(jobQuestions)
      .values({ jobId: params.id, question: body.question, answerStatus: 'generating' })
      .returning();

    (async () => {
      try {
        const answer = await generateAnswer(body.question, job, resumeRow.extractedText, apiKey, model);
        await db.update(jobQuestions)
          .set({ answer, answerStatus: 'ready', answerError: null, updatedAt: new Date() })
          .where(eq(jobQuestions.id, inserted.id));
        logger.info(`[Question] Question ${inserted.id} answered successfully`);
      } catch (err) {
        const errorMsg = (err as Error).message;
        logger.error(`[Question] Question ${inserted.id} failed: ${errorMsg}`);
        await db.update(jobQuestions)
          .set({ answerStatus: 'failed', answerError: errorMsg, updatedAt: new Date() })
          .where(eq(jobQuestions.id, inserted.id));
      }
    })();

    set.status = 202;
    return inserted;
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: createQuestionSchema,
  })

  .patch('/:id/questions/:questionId', async ({ params, body, set }) => {
    const updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };
    const [updated] = await db.update(jobQuestions)
      .set(updateData)
      .where(eq(jobQuestions.id, params.questionId))
      .returning();
    if (!updated) {
      set.status = 404;
      return { message: 'Not found' };
    }
    return updated;
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive(), questionId: z.coerce.number().int().positive() }),
    body: updateQuestionSchema,
  })

  .delete('/:id/questions/:questionId', async ({ params, set }) => {
    const [existing] = await db.select().from(jobQuestions).where(eq(jobQuestions.id, params.questionId)).limit(1);
    if (!existing) {
      set.status = 404;
      return { message: 'Not found' };
    }
    await db.delete(jobQuestions).where(eq(jobQuestions.id, params.questionId));
    return { deleted: true };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive(), questionId: z.coerce.number().int().positive() }),
  });
