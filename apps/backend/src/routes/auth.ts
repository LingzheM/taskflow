import { Hono } from "hono";
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from "../lib/prisma";
import { signToken } from '../lib/jwt';
import { ok, conflict, unauthorized, validationError, internalError } from '../lib/response';
import type { AuthResponse } from '@taskflow/shared';

export const authRouter = new Hono();

// Validation Schemas

const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
});

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});


// POST /api/auth/register
authRouter.post('/register', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body) return validationError(c, { body: ['Invalid JSON'] });

    const result = registerSchema.safeParse(body);
    if (!result.success) {
        const details = Object.fromEntries(
            Object.entries(result.error.flatten().fieldErrors).map(([k, v]) => [k, v ?? []]),
        );
        return validationError(c, details);
    }

    const { email, password, name } = result.data;

    try {
        // Check for existing user
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return conflict(c, 'An account with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: { email, name, password: hashedPassword },
            select: { id: true, email: true, name: true, createdAt: true },
        });

        const token = signToken({ userId: user.id, email: user.email });

        const data: AuthResponse = { token, user };
        return ok(c, data, 201);
    } catch (err) {
        console.error('[register]', err);
        return internalError(c);
    }
});


// POST /api/auth/login
authRouter.post('/login', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body) return validationError(c, { body: ['Invalid JSON'] });

    const result = loginSchema.safeParse(body);
    if (!result.success) {
        const details = Object.fromEntries(
            Object.entries(result.error.flatten().fieldErrors).map(([k, v]) => [k, v ?? []]),
        );
        return validationError(c, details);
    }

    const { email, password } = result.data;

    try {
        const user = await prisma.user.findUnique({ where: {email} });
        const dummyHash = '$2b$12$invalidhashfortimingprotection000000000000000000000000';
        const isValid = await bcrypt.compare(password, user?.password ?? dummyHash);

        if (!user || !isValid) {
            return unauthorized(c, 'Invalid email or password');
        }

        const token = signToken({ userId: user.id, email: user.email });

        const data: AuthResponse = {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: user.createdAt,
            },
        };

        return ok(c, data);
    } catch (err) {
        console.error('[login]', err);
        return internalError(c);
    }
});

// GET /api/auth/me

authRouter.get('/me', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return unauthorized(c);
    }

    try {
        const { verifyToken } = await import('../lib/jwt.js');
        const payload = verifyToken(authHeader.slice(7));

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, name: true, createdAt: true },
        });

        if (!user) return unauthorized(c, 'User not found');

        return ok(c, user);
    } catch {
        return unauthorized(c, 'Invalid token');
    }
});
