import { prisma } from "./prisma.js";

/**
 * Returns the board if the user is a member, otherwise null.
 * @param boardId 
 * @param userId 
 * @returns 
 */
export async function getBoardForUser(boardId: string, userId: string) {
    const board = await prisma.board.findFirst({
        where: {
            id: boardId,
            members: { some: { userId } },
        },
    });
    return board;
}

/**
 * Returns true if the user is the owner of the board
 * @param boardId 
 * @param userId 
 * @returns 
 */
export async function isBoardOwner(boardId: string, userId: string): Promise<boolean> {
    const board = await prisma.board.findFirst({
        where: { id: boardId, ownerId: userId },
    });
    return board !== null;
}

/**
 * Return a column only if it belongs to a board the user can access
 * @param columnId 
 * @param userId 
 * @returns 
 */
export async function getColumnForUser(columnId: string, userId: string) {
    const column = await prisma.column.findFirst({
        where: {
            id: columnId,
            board: { members: { some: { userId } } },
        },
        include: { board: { select: { id: true, ownerId: true } } },
    });
    return column;
}


/**
 * Returns a card only if it belongs to a board the user can access
 * @param cardId 
 * @param userId 
 * @returns 
 */
export async function getCardForUser(cardId: string, userId: string) {
    const card = await prisma.card.findFirst({
        where: {
            id: cardId,
            column: { board: { members: { some: { userId } } } },
        },
        include: {
            column: {
                include: { board: { select: { id: true, ownerId: true} } },
            },
        },
    });
    return card;
}