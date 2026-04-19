import Elysia from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { sessions, settings } from '../db/schema';
import { loginSchema } from '../../shared/schemas/auth';
import { authPlugin } from '../plugins/auth';

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }
  record.count++;
  return true;
}

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .use(authPlugin)

  .post('/login', async ({ body, cookie, set, request }) => {
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      set.status = 429;
      return { message: 'Too many login attempts. Try again later.' };
    }
    const hashRow = await db.select().from(settings).where(eq(settings.key, 'app_password_hash')).limit(1);
    const hash = hashRow[0]?.value;
    if (!hash) {
      set.status = 500;
      return { message: 'Password not configured' };
    }

    const valid = await Bun.password.verify(body.password, hash);
    if (!valid) {
      set.status = 401;
      return { message: 'Invalid password' };
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({ token, expiresAt });

    cookie.session.set({
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return { ok: true };
  }, {
    body: loginSchema,
  })

  .post('/logout', async ({ cookie }) => {
    const token = cookie.session?.value;
    if (token) {
      await db.delete(sessions).where(eq(sessions.token, token as string));
    }
    cookie.session.set({
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return { ok: true };
  })

  .get('/me', async ({ cookie }) => {
    const token = cookie.session?.value;
    if (!token) return { authenticated: false };
    const [session] = await db.select().from(sessions).where(eq(sessions.token, token as string)).limit(1);
    if (!session || session.expiresAt < new Date()) return { authenticated: false };
    return { authenticated: true };
  });
