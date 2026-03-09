import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { ok, forbidden, notFound, validationError, internalError } from '../lib/response.js';
import { getBoardForUser, getColumnForUser } from '../lib/access.js';
import { positionAtEnd } from '../lib/position.js';
import { logActivity } from '../lib/activity.js';
import { broadcastToBoard } from '../lib/socket.js';

export const columnRouter = new Hono();

columnRouter.use('*', authMiddleware);

// ── Validation Schemas ────────────────────────────────────────

const createColumnSchema = z.object({
  name: z.string().min(1).max(100),
});

const updateColumnSchema = z.object({
  name: z.string().min(1).max(100),
});

const reorderColumnsSchema = z.object({
  columns: z.array(
    z.object({
      id: z.string(),
      position: z.string(),
    }),
  ).min(1),
});

// ── POST /api/boards/:boardId/columns ─────────────────────────

columnRouter.post('/boards/:boardId/columns', async (c) => {
  const userId = c.get('userId');
  const boardId = c.req.param('boardId');

  const body = await c.req.json().catch(() => null);
  if (!body) return validationError(c, { body: ['Invalid JSON'] });

  const result = createColumnSchema.safeParse(body);
  if (!result.success) {
    return validationError(c, Object.fromEntries(
      Object.entries(result.error.flatten().fieldErrors).map(([k, v]) => [k, v ?? []]),
    ));
  }

  try {
    const board = await getBoardForUser(boardId, userId);
    if (!board) return notFound(c, 'Board not found');

    // Find the last column's position to append at the end
    const lastColumn = await prisma.column.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = positionAtEnd(lastColumn?.position ?? null);

    const column = await prisma.column.create({
      data: { boardId, name: result.data.name, position },
    });

    await logActivity(boardId, userId, 'COLUMN_CREATED', { columnName: result.data.name });

    broadcastToBoard(boardId, { type: 'column:created', payload: column }, c.req.header('X-Socket-Id'));
    return ok(c, column, 201);
  } catch (err) {
    console.error('[columns:create]', err);
    return internalError(c);
  }
});

// ── PATCH /api/columns/:id ────────────────────────────────────

columnRouter.patch('/columns/:id', async (c) => {
  const userId = c.get('userId');
  const columnId = c.req.param('id');

  const body = await c.req.json().catch(() => null);
  if (!body) return validationError(c, { body: ['Invalid JSON'] });

  const result = updateColumnSchema.safeParse(body);
  if (!result.success) {
    return validationError(c, Object.fromEntries(
      Object.entries(result.error.flatten().fieldErrors).map(([k, v]) => [k, v ?? []]),
    ));
  }

  try {
    const column = await getColumnForUser(columnId, userId);
    if (!column) return notFound(c, 'Column not found');

    const updated = await prisma.column.update({
      where: { id: columnId },
      data: { name: result.data.name },
    });

    await logActivity(column.board.id, userId, 'COLUMN_UPDATED', {
      columnId,
      newName: result.data.name,
    });

    broadcastToBoard(column.board.id, { type: 'column:updated', payload: updated }, c.req.header('X-Socket-Id'));
    return ok(c, updated);
  } catch (err) {
    console.error('[columns:update]', err);
    return internalError(c);
  }
});

// ── DELETE /api/columns/:id ───────────────────────────────────
// Cascades to all cards in the column (handled by DB cascade)

columnRouter.delete('/columns/:id', async (c) => {
  const userId = c.get('userId');
  const columnId = c.req.param('id');

  try {
    const column = await getColumnForUser(columnId, userId);
    if (!column) return notFound(c, 'Column not found');

    await prisma.column.delete({ where: { id: columnId } });

    await logActivity(column.board.id, userId, 'COLUMN_DELETED', {
      columnId,
      columnName: column.name,
    });

    broadcastToBoard(column.board.id, { type: 'column:deleted', payload: { columnId, boardId: column.board.id } }, c.req.header('X-Socket-Id'));
    return ok(c, { deleted: true });
  } catch (err) {
    console.error('[columns:delete]', err);
    return internalError(c);
  }
});

// ── PATCH /api/boards/:boardId/columns/reorder ────────────────
// Bulk update column positions (fractional index values from client)

columnRouter.patch('/boards/:boardId/columns/reorder', async (c) => {
  const userId = c.get('userId');
  const boardId = c.req.param('boardId');

  const body = await c.req.json().catch(() => null);
  if (!body) return validationError(c, { body: ['Invalid JSON'] });

  const result = reorderColumnsSchema.safeParse(body);
  if (!result.success) {
    return validationError(c, Object.fromEntries(
      Object.entries(result.error.flatten().fieldErrors).map(([k, v]) => [k, v ?? []]),
    ));
  }

  try {
    const board = await getBoardForUser(boardId, userId);
    if (!board) return notFound(c, 'Board not found');

    // Bulk update in a transaction — all succeed or all fail
    const updates = result.data.columns.map(({ id, position }) =>
      prisma.column.update({ where: { id }, data: { position } }),
    );

    const columns = await prisma.$transaction(updates);

    await logActivity(boardId, userId, 'COLUMN_REORDERED', {
      columnIds: result.data.columns.map((c) => c.id),
    });

    broadcastToBoard(boardId, { type: 'column:reordered', payload: { columns } }, c.req.header('X-Socket-Id'));
    return ok(c, columns);
  } catch (err) {
    console.error('[columns:reorder]', err);
    return internalError(c);
  }
});