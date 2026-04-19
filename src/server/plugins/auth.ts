import Elysia from 'elysia';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db';
import { sessions } from '../db/schema';

export const authPlugin = new Elysia({ name: 'auth' })
  .macro(({ onBeforeHandle }) => ({
    requireAuth(enabled: boolean) {
      if (!enabled) return;
      onBeforeHandle(async ({ cookie, set }: { cookie: Record<string, { value?: string }>; set: { status: number } }) => {
        const token = cookie.session?.value;
        if (!token) {
          set.status = 401;
          return { message: 'Unauthorized' };
        }
        const [session] = await db.select().from(sessions)
          .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
          .limit(1);
        if (!session) {
          set.status = 401;
          return { message: 'Session expired' };
        }
      });
    },
  }));
