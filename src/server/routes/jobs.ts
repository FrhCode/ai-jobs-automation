import Elysia from 'elysia';
import { z } from 'zod';
import { eq, and, ilike, desc, asc, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import { jobs, queue, resume, settings } from '../db/schema';
import { authPlugin } from '../plugins/auth';
import {
  jobsQuerySchema,
  updateJobSchema,
  enqueueSchema,
  deleteJobsSchema,
} from '../../shared/schemas/jobs';
import { processQueue } from '../lib/jobQueue';
import { generateCoverLetter } from '../lib/aiAnalyzer';

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

    processQueue().catch((err) => console.error('[Queue] Process error:', err));

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

    processQueue().catch((err) => console.error('[Queue] Process error:', err));

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
    const model = modelRow[0]?.value || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-6';

    if (!apiKey) {
      set.status = 400;
      return { message: 'No OpenRouter API key configured.' };
    }

    const coverLetter = await generateCoverLetter(job, resumeRow.extractedText, apiKey, model);

    const [updated] = await db.update(jobs)
      .set({ coverLetter, updatedAt: new Date() })
      .where(eq(jobs.id, params.id))
      .returning();

    return updated;
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
  });
