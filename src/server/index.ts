import 'dotenv/config';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { settings, queue } from './db/schema';
import { app } from './app';
import { reloadCronSchedule } from './lib/cronScheduler';
import { startChunkCleanupCron } from './lib/chunkCleanup';
import { logger } from './lib/logger';

async function seedPasswordHash() {
  await db.transaction(async (tx) => {
    const row = await tx.select().from(settings).where(eq(settings.key, 'app_password_hash')).limit(1);
    if (!row[0] && process.env.APP_PASSWORD) {
      const hash = await Bun.password.hash(process.env.APP_PASSWORD);
      await tx.insert(settings).values({ key: 'app_password_hash', value: hash });
      logger.info('[Bootstrap] Seeded app_password_hash from APP_PASSWORD env');
    }
  });
}

async function crashRecovery() {
  await db.transaction(async (tx) => {
    const running = await tx.select().from(queue).where(eq(queue.status, 'running'));
    if (running.length > 0) {
      for (const item of running) {
        await tx.update(queue)
          .set({ status: 'pending', startedAt: null })
          .where(eq(queue.id, item.id));
      }
      logger.info(`[Bootstrap] Reset ${running.length} running queue items to pending`);
    }
  });
}

async function bootstrap() {
  logger.info('[Bootstrap] Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
  logger.info('[Bootstrap] Migrations done');

  await seedPasswordHash();
  await crashRecovery();

  logger.info('[Bootstrap] Arming cron scheduler...');
  await reloadCronSchedule();

  logger.info('[Bootstrap] Starting chunk cleanup cron...');
  startChunkCleanupCron();

  const PORT = parseInt(process.env.PORT || '3001', 10);
  app.listen(PORT, () => {
    logger.info(`[Server] Listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error('[FATAL]', err);
  process.exit(1);
});
