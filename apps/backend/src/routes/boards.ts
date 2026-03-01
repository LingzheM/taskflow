import { Hono } from "hono";
import z from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { ok, forbidden, notFound, conflict, validationError, internalError } from "../lib/response.js";
import { getBoardForUser, isBoardOwner } from "../lib/access.js";
import { generateInitialPositions, positionAtEnd } from "../lib/position.js";
import { logActivity } from "../lib/activity.js";

export const boardRouter = new Hono();

// All board routes require auth
boardRouter.use('*', authMiddleware);

// Validation Schemas

const createBoardSchema = z.object({
    name: z.string().min(1).max(100),
});

const inviteMemberSchema = z.object({
    email: z.string().email(),
});


// GET /api/boards

boardRouter.get('/', async (c) => {
    const userId = c.get('userId');

    try {
        const boards = await prisma.board.findMany({
            where: { members: { some: { userId } } },
            include: {
                owner: { select: { id: true, name: true, email: true} },
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
})