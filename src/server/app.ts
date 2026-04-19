import Elysia from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { authRoutes } from './routes/auth';
import { jobsRoutes } from './routes/jobs';
import { queueRoutes } from './routes/queue';
import { resumeRoutes } from './routes/resume';
import { settingsRoutes } from './routes/settings';
import { statsRoutes } from './routes/stats';
import { cronRoutes } from './routes/cron';
import { openrouterRoutes } from './routes/openrouter';

function getCorsOrigin() {
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3000';
  const allowed = process.env.CORS_ORIGIN;
  if (allowed) return allowed.split(',').map((o) => o.trim());
  return []; // deny all cross-origin requests in production if not configured
}

export const app = new Elysia()
  .use(cors({
    origin: getCorsOrigin(),
    credentials: true,
  }))
  .onBeforeHandle(({ set }) => {
    set.headers['x-content-type-options'] = 'nosniff';
    set.headers['x-frame-options'] = 'DENY';
    set.headers['referrer-policy'] = 'strict-origin-when-cross-origin';
    set.headers['permissions-policy'] = 'camera=(), microphone=(), geolocation=()';
  })
  .onError(({ code, error, set }) => {
    set.status = code === 'VALIDATION' ? 422 : 500;
    return { message: (error as Error).message };
  })
  .use(authRoutes)
  .use(jobsRoutes)
  .use(queueRoutes)
  .use(resumeRoutes)
  .use(settingsRoutes)
  .use(statsRoutes)
  .use(cronRoutes)
  .use(openrouterRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(staticPlugin({
    prefix: '/',
    assets: './dist/client',
  }));

  // SPA fallback: serve index.html for non-API routes
  app.get('*', ({ request, set }) => {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api')) {
      set.status = 404;
      return { message: 'Not found' };
    }
    return Bun.file('./dist/client/index.html');
  });
}

export type App = typeof app;
