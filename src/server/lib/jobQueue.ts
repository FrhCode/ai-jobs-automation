import { eq, and, lt, asc } from 'drizzle-orm';
import { db } from '../db';
import { jobs, queue, resume, settings } from '../db/schema';
import { scrapeJob } from './scraper';
import { analyzeJob } from './aiAnalyzer';
import type { AnalyzeResult } from './aiAnalyzer';
import { logger } from './logger';

let isProcessing = false;

export function getIsProcessing(): boolean {
  return isProcessing;
}

async function getRequestDelayMs(): Promise<number> {
  const row = await db.select().from(settings).where(eq(settings.key, 'request_delay_ms')).limit(1);
  return row[0] ? parseInt(row[0].value, 10) || 3000 : 3000;
}

async function getOpenRouterConfig(): Promise<{ apiKey: string; model: string }> {
  const [apiKeyRow, modelRow] = await Promise.all([
    db.select().from(settings).where(eq(settings.key, 'openrouter_api_key')).limit(1),
    db.select().from(settings).where(eq(settings.key, 'openrouter_model')).limit(1),
  ]);
  return {
    apiKey: apiKeyRow[0]?.value || process.env.OPENROUTER_API_KEY || '',
    model: modelRow[0]?.value || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-6',
  };
}

async function getResumeText(): Promise<string> {
  const row = await db.select().from(resume).limit(1);
  if (!row[0]) throw new Error('No resume uploaded');
  return row[0].extractedText;
}

async function upsertJob(result: AnalyzeResult) {
  const now = new Date();
  await db.insert(jobs)
    .values({
      url: result.url,
      title: result.title,
      company: result.company,
      location: result.location,
      salary: result.salary,
      descriptionSummary: result.descriptionSummary,
      score: result.score,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      summary: result.summary,
      recommendation: result.recommendation,
      scrapeStatus: result.scrapeStatus,
      processedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: jobs.url,
      set: {
        title: result.title,
        company: result.company,
        location: result.location,
        salary: result.salary,
        descriptionSummary: result.descriptionSummary,
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        summary: result.summary,
        recommendation: result.recommendation,
        scrapeStatus: result.scrapeStatus,
        processedAt: now,
        updatedAt: now,
      },
    });
}

export async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const delayMs = await getRequestDelayMs();
    const resumeText = await getResumeText().catch(() => null);
    const { apiKey, model } = await getOpenRouterConfig();

    if (!resumeText) {
      logger.warn('[Queue] No resume available, skipping processing');
      return;
    }

    if (!apiKey) {
      logger.warn('[Queue] No OpenRouter API key configured, skipping processing');
      return;
    }

    while (true) {
      const pending = await db.select().from(queue)
        .where(and(
          eq(queue.status, 'pending'),
          lt(queue.attempts, queue.maxAttempts)
        ))
        .orderBy(asc(queue.addedAt))
        .limit(1);

      if (pending.length === 0) break;

      const item = pending[0];

      await db.update(queue)
        .set({ status: 'running', attempts: item.attempts + 1, startedAt: new Date() })
        .where(eq(queue.id, item.id));

      try {
        const scrapeResult = await scrapeJob(item.url);
        const analyzeResult = await analyzeJob(scrapeResult, resumeText, apiKey, model);
        await upsertJob(analyzeResult);

        await db.update(queue)
          .set({ status: 'done', finishedAt: new Date() })
          .where(eq(queue.id, item.id));
      } catch (err) {
        const willRetry = (item.attempts + 1) < item.maxAttempts;
        await db.update(queue)
          .set({
            status: willRetry ? 'pending' : 'failed',
            errorMsg: (err as Error).message,
            finishedAt: new Date(),
          })
          .where(eq(queue.id, item.id));
      }

      await new Promise((r) => setTimeout(r, delayMs));
    }
  } finally {
    isProcessing = false;
  }
}
