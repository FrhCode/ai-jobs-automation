import Elysia from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { settings } from '../db/schema';
import { authPlugin } from '../plugins/auth';

export const openrouterRoutes = new Elysia({ prefix: '/api/openrouter' })
  .use(authPlugin)

  .get('/credits', async () => {
    const apiKeyRow = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'open_router_management_key'));

    const apiKey = apiKeyRow[0]?.value || process.env.OPENROUTER_API_KEY || '';

    if (!apiKey) {
      return {
        totalCredits: 0,
        totalUsage: 0,
        remaining: 0,
        error: 'No API key configured',
      };
    }

    try {
      const res = await fetch('https://openrouter.ai/api/v1/credits', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to fetch credits' }));
        return {
          totalCredits: 0,
          totalUsage: 0,
          remaining: 0,
          error: err.message || 'Failed to fetch credits',
        };
      }

      const data = await res.json() as {
        data?: {
          total_credits?: number;
          total_usage?: number;
        };
      };

      const totalCredits = data.data?.total_credits ?? 0;
      const totalUsage = data.data?.total_usage ?? 0;
      const remaining = totalCredits - totalUsage;

      return {
        totalCredits,
        totalUsage,
        remaining,
      };
    } catch (err) {
      return {
        totalCredits: 0,
        totalUsage: 0,
        remaining: 0,
        error: (err as Error).message || 'Failed to fetch credits',
      };
    }
  }, {
    requireAuth: true,
  });
