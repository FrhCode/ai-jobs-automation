import Elysia from 'elysia';
import { authPlugin } from '../plugins/auth';
import { runCronTask } from '../lib/cronScheduler';

export const cronRoutes = new Elysia({ prefix: '/api/cron' })
  .use(authPlugin)

  .post('/trigger', async () => {
    const result = await runCronTask();
    return { started: true, ...result };
  }, {
    requireAuth: true,
  });
