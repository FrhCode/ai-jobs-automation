import Elysia from 'elysia';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db';
import { queue } from '../db/schema';
import { authPlugin } from '../plugins/auth';
import { clearQueueSchema } from '../../shared/schemas/queue';
import { processQueue, getIsProcessing } from '../lib/jobQueue';

export const queueRoutes = new Elysia({ prefix: '/api/queue' })
  .use(authPlugin)

  .get('/', async () => {
    const items = await db.select().from(queue).orderBy(queue.addedAt);
    return { items, isProcessing: getIsProcessing() };
  }, {
    requireAuth: true,
  })

  .post('/retry/:id', async ({ params, set }) => {
    const [updated] = await db.update(queue)
      .set({ status: 'pending', attempts: 0, errorMsg: null, startedAt: null, finishedAt: null })
      .where(eq(queue.id, params.id))
      .returning();

    if (!updated) {
      set.status = 404;
      return { message: 'Not found' };
    }

    processQueue().catch((err) => console.error('[Queue] Process error:', err));

    return { ok: true };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  })

  .delete('/clear', async ({ body }) => {
    const result = await db.delete(queue).where(inArray(queue.status, body.statuses));
    return { deleted: (result as unknown as { rowCount: number }).rowCount ?? 0 };
  }, {
    requireAuth: true,
    body: clearQueueSchema,
  })

  .post('/process', async () => {
    processQueue().catch((err) => console.error('[Queue] Process error:', err));
    return { started: true };
  }, {
    requireAuth: true,
  });
