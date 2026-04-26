import { schedule, validate, type ScheduledTask } from 'node-cron';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { queue, settings, jobs } from '../db/schema';
import { scrapeSearchPage } from './scraper';
import { processQueue } from './jobQueue';
import { logger } from './logger';

let activeTask: ScheduledTask | null = null;

export async function runCronTask(): Promise<{ searchUrls: number; found: number; newUrls: number }> {
  logger.info(`[Cron] Manual trigger at ${new Date().toISOString()}`);

  const [urlsRow] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'cron_search_urls'))
    .limit(1);

  const urlsJson = urlsRow?.value || '[]';

  let searchUrls: string[];
  try {
    searchUrls = JSON.parse(urlsJson);
  } catch {
    logger.warn('[Cron] Invalid search URLs JSON');
    return { searchUrls: 0, found: 0, newUrls: 0 };
  }

  if (!Array.isArray(searchUrls) || searchUrls.length === 0) {
    logger.warn('[Cron] No search URLs configured');
    return { searchUrls: 0, found: 0, newUrls: 0 };
  }

  const allUrls: string[] = [];
  for (const searchUrl of searchUrls) {
    try {
      const jobUrls = await scrapeSearchPage(searchUrl);
      allUrls.push(...jobUrls);
    } catch (err) {
      logger.error(`[Cron] Failed to scrape search page ${searchUrl}: ${(err as Error).message}`);
    }
  }

  if (allUrls.length === 0) {
    logger.info('[Cron] No job URLs found');
    return { searchUrls: searchUrls.length, found: 0, newUrls: 0 };
  }

  // Deduplicate against existing jobs and enqueue atomically
  const newUrls = await db.transaction(async (tx) => {
    const existing = await tx.select({ url: jobs.url }).from(jobs);
    const existingSet = new Set(existing.map((r) => r.url));
    const urls = allUrls.filter((u) => !existingSet.has(u));

    if (urls.length > 0) {
      await tx.insert(queue).values(
        urls.map((url) => ({ url, source: 'cron' as const }))
      );
    }

    return urls;
  });

  if (newUrls.length === 0) {
    logger.info('[Cron] All URLs already exist in jobs table');
    return { searchUrls: searchUrls.length, found: allUrls.length, newUrls: 0 };
  }

  logger.info(`[Cron] Enqueued ${newUrls.length} new URLs`);

  processQueue().catch((err) => {
    logger.error('[Cron] Queue processing error:', err);
  });

  return { searchUrls: searchUrls.length, found: allUrls.length, newUrls: newUrls.length };
}

export async function reloadCronSchedule(): Promise<void> {
  if (activeTask) {
    activeTask.stop();
    activeTask = null;
  }

  const [enabledRow, scheduleRow, urlsRow] = await Promise.all([
    db.select().from(settings).where(eq(settings.key, 'cron_enabled')).limit(1),
    db.select().from(settings).where(eq(settings.key, 'cron_schedule')).limit(1),
    db.select().from(settings).where(eq(settings.key, 'cron_search_urls')).limit(1),
  ]);

  const enabled = enabledRow[0]?.value === 'true';
  const scheduleExpr = scheduleRow[0]?.value || '';
  const urlsJson = urlsRow[0]?.value || '[]';

  if (!enabled) {
    logger.info('[Cron] Scheduler disabled');
    return;
  }

  if (!scheduleExpr || !validate(scheduleExpr)) {
    logger.warn(`[Cron] Invalid or missing schedule expression: ${scheduleExpr}`);
    return;
  }

  let searchUrls: string[];
  try {
    searchUrls = JSON.parse(urlsJson);
  } catch {
    logger.warn('[Cron] Invalid search URLs JSON');
    return;
  }

  if (!Array.isArray(searchUrls) || searchUrls.length === 0) {
    logger.warn('[Cron] No search URLs configured');
    return;
  }

  activeTask = schedule(scheduleExpr, async () => {
    logger.info(`[Cron] Firing at ${new Date().toISOString()}`);
    await runCronTask();
  });

    logger.info(`[Cron] Scheduler armed with expression: ${scheduleExpr}`);
}
