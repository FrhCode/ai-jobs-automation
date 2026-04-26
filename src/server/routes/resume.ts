import Elysia, { t } from 'elysia';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { resume, jobs, queue, settings } from '../db/schema';
import { authPlugin } from '../plugins/auth';
import { parseResumeBuffer } from '../lib/resumeParser';
import { processQueue } from '../lib/jobQueue';
import { logger } from '../lib/logger';

const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';

export const resumeRoutes = new Elysia({ prefix: '/api/resume' })
  .use(authPlugin)

  .get('/', async () => {
    const [row] = await db.select().from(resume).limit(1);
    if (!row) return null;
    return {
      filename: row.filename,
      extractedText: row.extractedText,
      uploadedAt: row.uploadedAt.toISOString(),
    };
  }, {
    requireAuth: true,
  })

  .post('/', async ({ request, set }) => {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      set.status = 400;
      return { message: 'No file uploaded' };
    }

    const rawFilename = (file as File).name || 'resume.pdf';
    // Sanitize filename: basename only, remove path traversal characters
    const sanitized = path.basename(rawFilename).replace(/[^a-zA-Z0-9_.-]/g, '');
    const filename = sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
    if (!filename.toLowerCase().endsWith('.pdf')) {
      set.status = 400;
      return { message: 'Only PDF files are allowed' };
    }

    const maxFileSizeRow = await db.select().from(settings).where(eq(settings.key, 'max_resume_file_size_mb')).limit(1);
    const maxFileSizeMb = maxFileSizeRow[0] ? parseInt(maxFileSizeRow[0].value, 10) : 10;
    const MAX_FILE_SIZE = (Number.isNaN(maxFileSizeMb) || maxFileSizeMb <= 0 ? 10 : maxFileSizeMb) * 1024 * 1024;
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      set.status = 413;
      return { message: `File too large. Max ${maxFileSizeMb}MB.` };
    }

    let extractedText: string;
    try {
      extractedText = await parseResumeBuffer(buffer, filename);
    } catch (err) {
      set.status = 400;
      return { message: `Failed to parse PDF: ${(err as Error).message}` };
    }

    const filePath = path.resolve(UPLOADS_DIR, `${Date.now()}_${filename}`);
    // Ensure resolved path is still inside UPLOADS_DIR
    if (!filePath.startsWith(path.resolve(UPLOADS_DIR))) {
      set.status = 400;
      return { message: 'Invalid file path' };
    }
    await Bun.write(filePath, buffer);

    // Atomically replace resume and enqueue re-analysis jobs
    let oldFilePath: string | null = null;
    const row = await db.transaction(async (tx) => {
      const existing = await tx.select().from(resume).limit(1);
      if (existing[0]) {
        oldFilePath = existing[0].filePath;
        await tx.delete(resume).where(eq(resume.id, existing[0].id));
      }

      const [inserted] = await tx.insert(resume)
        .values({ filename, filePath, extractedText })
        .returning();

      const allJobs = await tx.select({ url: jobs.url }).from(jobs);
      if (allJobs.length > 0) {
        await tx.insert(queue).values(
          allJobs.map((j) => ({ url: j.url, source: 'reanalyze' as const }))
        );
      }

      return inserted;
    });

    if (row) {
      processQueue().catch((err) => logger.error('[Queue] Process error:', err));
    }

    // Delete old physical file after successful DB transaction
    if (oldFilePath) {
      try { await Bun.file(oldFilePath).delete?.() ?? require('node:fs/promises').unlink(oldFilePath) } catch { /* ignore */ }
    }

    return {
      filename: row.filename,
      extractedText: row.extractedText,
      uploadedAt: row.uploadedAt.toISOString(),
    };
  }, {
    requireAuth: true,
  })

  .patch('/', async ({ body, set }) => {
    const existing = await db.select().from(resume).limit(1);
    if (!existing[0]) {
      set.status = 404;
      return { message: 'No resume found' };
    }
    const [updated] = await db.update(resume)
      .set({ extractedText: body.extractedText })
      .where(eq(resume.id, existing[0].id))
      .returning();
    return {
      filename: updated.filename,
      extractedText: updated.extractedText,
      uploadedAt: updated.uploadedAt.toISOString(),
    };
  }, {
    requireAuth: true,
    body: t.Object({
      extractedText: t.String(),
    }),
  })

  .delete('/', async () => {
    const existing = await db.select().from(resume).limit(1);
    const oldFilePath = existing[0]?.filePath ?? null;
    await db.delete(resume);
    if (oldFilePath) {
      try { await Bun.file(oldFilePath).delete?.() ?? require('node:fs/promises').unlink(oldFilePath) } catch { /* ignore */ }
    }
    return { ok: true };
  }, {
    requireAuth: true,
  });
