import Elysia from 'elysia';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { jobs, linkedinPosts, cvShares } from '../db/schema';
import { authPlugin } from '../plugins/auth';

function generateToken(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeFilename(str: string): string {
  return str
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function randomSuffix(length = 6): string {
  return Math.random().toString(36).slice(2, 2 + length);
}

// Authenticated routes for creating share links
const shareCreateRoutes = new Elysia({ prefix: '/api' })
  .use(authPlugin)

  .post('/jobs/:id/share-cv', async ({ params, set }) => {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, params.id)).limit(1);
    if (!job) {
      set.status = 404;
      return { message: 'Not found' };
    }
    if (!job.tailoredResumePdfPath) {
      set.status = 400;
      return { message: 'No tailored CV generated yet.' };
    }

    // Return existing share if one exists for this job
    const [existing] = await db.select().from(cvShares).where(eq(cvShares.jobId, params.id)).limit(1);
    if (existing) {
      return { token: existing.token };
    }

    const token = generateToken();
    await db.insert(cvShares).values({ token, jobId: params.id });
    return { token };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  })

  .post('/linkedin-posts/:id/share-cv', async ({ params, set }) => {
    const [post] = await db.select().from(linkedinPosts).where(eq(linkedinPosts.id, params.id)).limit(1);
    if (!post) {
      set.status = 404;
      return { message: 'Not found' };
    }
    if (!post.tailoredResumePdfPath) {
      set.status = 400;
      return { message: 'No tailored CV generated yet.' };
    }

    const [existing] = await db.select().from(cvShares).where(eq(cvShares.linkedinPostId, params.id)).limit(1);
    if (existing) {
      return { token: existing.token };
    }

    const token = generateToken();
    await db.insert(cvShares).values({ token, linkedinPostId: params.id });
    return { token };
  }, {
    requireAuth: true,
    params: z.object({ id: z.coerce.number().int().positive() }),
  });

// Public routes for accessing shared CVs (no auth)
const sharePublicRoutes = new Elysia({ prefix: '/public' })
  .get('/cv/:token', async ({ params, set }) => {
    const [share] = await db.select().from(cvShares).where(eq(cvShares.token, params.token)).limit(1);
    if (!share) {
      set.status = 404;
      return { message: 'Share link not found or expired.' };
    }

    let pdfPath: string | null = null;
    let company = 'Company';
    let title = 'Job';

    if (share.jobId) {
      const [job] = await db.select().from(jobs).where(eq(jobs.id, share.jobId)).limit(1);
      if (job) {
        pdfPath = job.tailoredResumePdfPath;
        company = job.company || company;
        title = job.title || title;
      }
    } else if (share.linkedinPostId) {
      const [post] = await db.select().from(linkedinPosts).where(eq(linkedinPosts.id, share.linkedinPostId)).limit(1);
      if (post) {
        pdfPath = post.tailoredResumePdfPath;
        company = post.company || company;
        title = post.title || title;
      }
    }

    if (!pdfPath) {
      set.status = 404;
      return { message: 'CV not found.' };
    }

    const file = Bun.file(pdfPath);
    const exists = await file.exists();
    if (!exists) {
      set.status = 404;
      return { message: 'PDF file not found.' };
    }

    set.headers['Content-Type'] = 'application/pdf';
    set.headers['Content-Disposition'] = `inline; filename="${sanitizeFilename(company)}-${sanitizeFilename(title)}-Resume.pdf"`;
    return file;
  }, {
    params: z.object({ token: z.string().min(1) }),
  })

  .get('/cv/:token/download', async ({ params, set }) => {
    const [share] = await db.select().from(cvShares).where(eq(cvShares.token, params.token)).limit(1);
    if (!share) {
      set.status = 404;
      return { message: 'Share link not found or expired.' };
    }

    let pdfPath: string | null = null;
    let company = 'Company';
    let title = 'Job';

    if (share.jobId) {
      const [job] = await db.select().from(jobs).where(eq(jobs.id, share.jobId)).limit(1);
      if (job) {
        pdfPath = job.tailoredResumePdfPath;
        company = job.company || company;
        title = job.title || title;
      }
    } else if (share.linkedinPostId) {
      const [post] = await db.select().from(linkedinPosts).where(eq(linkedinPosts.id, share.linkedinPostId)).limit(1);
      if (post) {
        pdfPath = post.tailoredResumePdfPath;
        company = post.company || company;
        title = post.title || title;
      }
    }

    if (!pdfPath) {
      set.status = 404;
      return { message: 'CV not found.' };
    }

    const file = Bun.file(pdfPath);
    const exists = await file.exists();
    if (!exists) {
      set.status = 404;
      return { message: 'PDF file not found.' };
    }

    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace(/\s/g, '');
    const suffix = randomSuffix();
    set.headers['Content-Type'] = 'application/pdf';
    set.headers['Content-Disposition'] = `attachment; filename="${sanitizeFilename(company)}-${sanitizeFilename(title)}-Resume-${dateStr}-${suffix}.pdf"`;
    return file;
  }, {
    params: z.object({ token: z.string().min(1) }),
  });

export const shareRoutes = new Elysia()
  .use(shareCreateRoutes)
  .use(sharePublicRoutes);
