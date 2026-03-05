import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRouter } from './routes/auth.js';
import { boardRouter } from './routes/boards.js';
import { cardRouter } from './routes/cards.js';
import { columnRouter } from './routes/columns.js';

const app = new Hono();

app.use('*', logger());

app.use(
    '*',
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTION'],
        credentials: true,
    }),
);

// Routes

app.get('/health', (c) => c.json({ success: true, status: 'ok' }));

app.route('/api/auth', authRouter);
app.route('/api', boardRouter);
app.route('/api', columnRouter);
app.route('/api', cardRouter);

// 404 fallback
app.notFound((c) => {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404);
});

// Global error handler
app.onError((err, c) => {
    console.error('[unhandled error]', err);
    return c.json(
        { successs: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }}, 
        500
    );
});

// Start Server

const PORT = Number(process.env.PORT) || 4000;

serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`🚀 TaskFlow backend running on http://localhost:${PORT}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});

export default app;