import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { ok, forbidden, notFound, conflict, validationError, internalError } from '../lib/response.js';
import { getBoardForUser, isBoardOwner } from '../lib/access.js';
import { generateInitialPositions, positionAtEnd } from '../lib/position.js';
import { logActivity } from '../lib/activity.js';

export const boardRouter = new Hono();

// All board routes require auth
boardRouter.use('*', authMiddleware);

// ── Validation Schemas ────────────────────────────────────────

const createBoardSchema = z.object({
  name: z.string().min(1).max(100),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
});

// ── GET /api/boards ───────────────────────────────────────────
// Returns all boards the current user is a member of

boardRouter.get('/', async (c) => {
  const userId = c.get('userId');

  try {
    const boards = await prisma.board.findMany({
      where: { members: { some: { userId } } },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { columns: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ok(c, boards);
  } catch (err) {
    console.error('[boards:list]', err);
    return internalError(c);
  }
});

// ── POST /api/boards ──────────────────────────────────────────
// Create a board with 3 default columns

boardRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  if (!body) return validationError(c, { body: ['Invalid JSON'] });

  const result = createBoardSchema.safeParse(body);
  if (!result.success) {
    return validationError(c, Object.fromEntries(
      Object.entries(result.error.flatten().fieldErrors).map(([k, v]) => [k, v ?? []]),
    ));
  }

  const { name } = result.data;
  const [pos1, pos2, pos3] = generateInitialPositions(3);

  try {
    const board = await prisma.board.create({
      data: {
        name,
        ownerId: userId,
        members: {
          create: [{ userId, role: 'owner' }],
        },
        columns: {
          create: [
            { name: 'To Do', position: pos1 },
            { name: 'In Progress', position: pos2 },
            { name: 'Done', position: pos3 },
          ],
        },
      },
      include: {
        columns: { orderBy: { position: 'asc' } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    await logActivity(board.id, userId, 'BOARD_CREATED', { boardName: name });

    return ok(c, board, 201);
  } catch (err) {
    console.error('[boards:create]', err);
    return internalError(c);
  }
});

// ── GET /api/boards/:id ───────────────────────────────────────
// Returns board with all columns and cards (the main board view)

boardRouter.get('/:id', async (c) => {
  const userId = c.get('userId');
  const boardId = c.req.param('id');

  try {
    const board = await getBoardForUser(boardId, userId);
    if (!board) return notFound(c, 'Board not found');

    const boardWithDetails = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        columns: {
          orderBy: { position: 'asc' },
          include: {
            cards: { orderBy: { position: 'asc' } },
          },
        },
      },
    });

    return ok(c, boardWithDetails);
  } catch (err) {
    console.error('[boards:get]', err);
    return internalError(c);
  }
});

// ── DELETE /api/boards/:id ────────────────────────────────────
// Only owner can delete

boardRouter.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const boardId = c.req.param('id');

  try {
    const isOwner = await isBoardOwner(boardId, userId);
    if (!isOwner) return forbidden(c, 'Only the board owner can delete this board');

    await prisma.board.delete({ where: { id: boardId } });

    return ok(c, { deleted: true });
  } catch (err) {
    console.error('[boards:delete]', err);
    return internalError(c);
  }
});

// ── POST /api/boards/:id/members ──────────────────────────────
// Owner invites a user by email

boardRouter.post('/:id/members', async (c) => {
  const userId = c.get('userId');
  const boardId = c.req.param('id');

  const body = await c.req.json().catch(() => null);
  if (!body) return validationError(c, { body: ['Invalid JSON'] });

  const result = inviteMemberSchema.safeParse(body);
  if (!result.success) {
    return validationError(c, Object.fromEntries(
      Object.entries(result.error.flatten().fieldErrors).map(([k, v]) => [k, v ?? []]),
    ));
  }

  try {
    const isOwner = await isBoardOwner(boardId, userId);
    if (!isOwner) return forbidden(c, 'Only the board owner can invite members');

    const invitee = await prisma.user.findUnique({
      where: { email: result.data.email },
      select: { id: true, name: true, email: true },
    });
    if (!invitee) return notFound(c, 'No user found with that email');

    const existing = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId: invitee.id, boardId } },
    });
    if (existing) return conflict(c, 'User is already a member of this board');

    const member = await prisma.boardMember.create({
      data: { userId: invitee.id, boardId, role: 'member' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await logActivity(boardId, userId, 'MEMBER_INVITED', {
      inviteeId: invitee.id,
      inviteeEmail: invitee.email,
    });

    return ok(c, member, 201);
  } catch (err) {
    console.error('[boards:invite]', err);
    return internalError(c);
  }
});

// ── GET /api/boards/:id/activity ──────────────────────────────

boardRouter.get('/:id/activity', async (c) => {
  const userId = c.get('userId');
  const boardId = c.req.param('id');

  try {
    const board = await getBoardForUser(boardId, userId);
    if (!board) return notFound(c, 'Board not found');

    const logs = await prisma.activityLog.findMany({
      where: { boardId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return ok(c, logs);
  } catch (err) {
    console.error('[boards:activity]', err);
    return internalError(c);
  }
});