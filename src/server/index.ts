import 'dotenv/config';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { settings, queue } from './db/schema';
import { app } from './app';
import { reloadCronSchedule } from './lib/cronScheduler';
import { startChunkCleanupCron } from './lib/chunkCleanup';

async function seedPasswordHash() {
  await db.transaction(async (tx) => {
    const row = await tx.select().from(settings).where(eq(settings.key, 'app_password_hash')).limit(1);
    if (!row[0] && process.env.APP_PASSWORD) {
      const hash = await Bun.password.hash(process.env.APP_PASSWORD);
      await tx.insert(settings).values({ key: 'app_password_hash', value: hash });
      console.log('[Bootstrap] Seeded app_password_hash from APP_PASSWORD env');
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
      console.log(`[Bootstrap] Reset ${running.length} running queue items to pending`);
    }
  });
}

async function bootstrap() {
  console.log('[Bootstrap] Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
  console.log('[Bootstrap] Migrations done');

  await seedPasswordHash();
  await crashRecovery();

  console.log('[Bootstrap] Arming cron scheduler...');
  await reloadCronSchedule();

  console.log('[Bootstrap] Starting chunk cleanup cron...');
  startChunkCleanupCron();

  const PORT = parseInt(process.env.PORT || '3001', 10);
  app.listen(PORT, () => {
    console.log(`[Server] Listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
