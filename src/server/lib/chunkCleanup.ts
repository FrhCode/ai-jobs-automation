import { schedule, type ScheduledTask } from 'node-cron';
import { readdir, stat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { logger } from './logger';

let activeTask: ScheduledTask | null = null;

const CHUNKS_DIR = process.env.UPLOADS_DIR
  ? join(process.env.UPLOADS_DIR, 'chunks')
  : join(process.cwd(), 'uploads', 'chunks');

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function cleanupOldChunks(): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;

  try {
    const entries = await readdir(CHUNKS_DIR);
    const now = Date.now();

    for (const entry of entries) {
      const entryPath = join(CHUNKS_DIR, entry);
      try {
        const entryStat = await stat(entryPath);
        if (!entryStat.isDirectory()) continue;

        const age = now - entryStat.mtime.getTime();
        if (age > MAX_AGE_MS) {
          await rm(entryPath, { recursive: true, force: true });
          deleted++;
          logger.info(`[ChunkCleanup] Deleted old chunk dir: ${entry} (${Math.round(age / 3600000)}h old)`);
        }
      } catch (err) {
        errors++;
        logger.error(`[ChunkCleanup] Failed to process ${entry}:`, (err as Error).message);
      }
    }
  } catch (err) {
    // Directory may not exist yet — not an error
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      errors++;
      logger.error('[ChunkCleanup] Failed to read chunks dir:', (err as Error).message);
    }
  }

  if (deleted > 0 || errors > 0) {
    logger.info(`[ChunkCleanup] Done. Deleted: ${deleted}, Errors: ${errors}`);
  }

  return { deleted, errors };
}

export function startChunkCleanupCron(): void {
  if (activeTask) {
    activeTask.stop();
    activeTask = null;
  }

  // Run immediately on startup, then every hour
  cleanupOldChunks().catch((err) => {
    logger.error('[ChunkCleanup] Initial cleanup failed:', err);
  });

  activeTask = schedule('0 * * * *', async () => {
    await cleanupOldChunks();
  });

  logger.info('[ChunkCleanup] Scheduled to run every hour');
}
