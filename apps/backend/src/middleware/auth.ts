import type { Context, Next } from 'hono';
import { verifyToken } from '../lib/jwt.js';
import { unauthorized } from '../lib/response.js';
import { prisma } from '../lib/prisma.js';

// Extend Hono's context variables type
declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    userEmail: string;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized(c);
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);

    // Verify user still exists in DB (handles deleted accounts)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return unauthorized(c, 'User no longer exists');
    }

    c.set('userId', user.id);
    c.set('userEmail', user.email);

    await next();
  } catch {
    return unauthorized(c, 'Invalid or expired token');
  }
}