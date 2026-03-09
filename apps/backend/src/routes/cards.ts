import { Hono } from "hono";
import z from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, notFound, validationError, internalError } from "../lib/response.js";
import { getColumnForUser, getCardForUser } from "../lib/access.js";
import { positionAtEnd } from "../lib/position.js";
import { logActivity } from "../lib/activity.js";
import { io } from '../lib/socket.js';

export const cardRouter = new Hono();

cardRouter.use('*', authMiddleware);

// Validation Schemas
const createCardSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().max(10000).optional(),
});

const updateCardSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(10000).nullable().optional(),
});

const moveCardSchema = z.object({
    columnId: z.string(),
    position: z.string(),
});

// POST /api/columns/:columnId/cards

cardRouter.post('/columns/:columnId/cards', async (c) => {
    const userId = c.get('userId');
    const columnId = c.req.param('columnId');

    const body = await c.req.json().catch(() => null);
    if (!body) return validationError(c, { body: ['Invalid JSON'] });

    const result = createCardSchema.safeParse(body);
    if (!result.success) {
        return validationError(c, Object.fromEntries(
            Object.entries(result.error.flatten().fieldErrors).map(([k,v]) => [k, v ?? []]),
        ));
    }

    try {
        const column = await getColumnForUser(columnId, userId);
        if (!column) return notFound(c, 'Column not found');

        // Append at the end of the column
        const lastCard = await prisma.card.findFirst({
            where: { columnId },
            orderBy: { position: 'desc' },
            select: { position: true },
        });

        const position = positionAtEnd(lastCard?.position ?? null);

        const card = await prisma.card.create({
            data: {
                columnId,
                title: result.data.title,
                description: result.data.description,
                position,
            },
        });

        await logActivity(column.board.id, userId, 'CARD_CREATED', {
            cardId: card.id,
            cardTitle: card.title,
            columnId,
            columnName: column.name,
        });

        broadcast(c, `board:${column.board.id}`, 'card:created', card);
        return ok(c, card, 201);
    } catch (err) {
        console.error('[cards:create]', err);
        return internalError(c);
    }
});

// PATCH /api/cards/:id

cardRouter.patch('/cards/:id', async (c) => {
    const userId = c.get('userId');
    const cardId = c.req.param('id');

    const body = await c.req.json().catch(() => null);
    if (!body) return validationError(c, { body: ['Invalid JSON'] });

    const result = updateCardSchema.safeParse(body);
    if (!result.success) {
        return validationError(c, Object.fromEntries(
            Object.entries(result.error.flatten().fieldErrors).map(([k,v]) => [k, v ?? []]),
        ));
    }

    try {
        const card = await getCardForUser(cardId, userId);
        if (!card) return notFound(c, 'Card not found');

        const updated = await prisma.card.update({
            where: { id: cardId },
            data: {
                ...(result.data.title !== undefined && { title: result.data.title }),
                ...(result.data.description !== undefined && { description: result.data.description }),
            },
        });

        await logActivity(card.column.board.id, userId, 'CARD_UPDATED', {
            cardId,
            changes: result.data,
        });

        return ok(c, updated);
    } catch (err) {
        console.error('[cards:update]', err);
        return internalError(c);
    }
});

// DELETE /api/cards/:id
cardRouter.delete('/cards/:id', async (c) => {
    const userId = c.get('userId');
    const cardId = c.req.param('id');

    try {
        const card = await getCardForUser(cardId, userId);
        if (!card) return notFound(c, 'Card not found');

        await prisma.card.delete({ where: { id: cardId } });

        await logActivity(card.column.board.id, userId, 'CARD_DELETED', {
            cardId,
            cardTitle: card.title,
            columnId: card.columnId,
        });

        return ok(c, { deleted: true });
    } catch (err) {
        console.error('[cards:delete]', err);
        return internalError(c);
    }
});

// PATCH /api/cards/:id/move
cardRouter.patch('/cards/:id/move', async (c) => {
    const userId = c.get('userId');
    const cardId = c.req.param('id');

    const body = await c.req.json().catch(() => null);
    if (!body) return validationError(c, { body: ['Invalid JSON'] });

    const result = moveCardSchema.safeParse(body);
    if (!result.success) {
        return validationError(c, Object.fromEntries(
            Object.entries(result.error.flatten().fieldErrors).map(([k, v]) => [k, v ?? []]),
        ));
    }

    const { columnId: targetColumnId, position } = result.data;

    try {
        const card = await getCardForUser(cardId, userId);
        if (!card) return notFound(c, 'Card not found');

        const targetColumn = await getColumnForUser(targetColumnId, userId);
        if (!targetColumn) return notFound(c, 'Target column not found');

        const fromColumnId = card.columnId;
        const boardId = card.column.board.id;

        const updated = await prisma.card.update({
            where: { id: cardId },
            data: { columnId: targetColumnId, position },
        });

        await logActivity(boardId, userId, 'CARD_MOVED', {
            cardId,
            cardTitle: card.title,
            fromColumnId,
            toColumnId: targetColumnId,
            fromColumnName: card.column.name,
            toColumnName: targetColumn.name,
        });

        return ok(c, updated);
    } catch (err) {
        console.error('[cards:move]', err);
        return internalError(c);
    }
});

function broadcast(c: Context, room: string, event: string, payload: unknown) {
    const socketId = c.req.header('X-Socket-Id');
    const emitter = socketId ? io.to(room).except(socketId) : io.to(room);
    emitter.emit(event, payload);
}