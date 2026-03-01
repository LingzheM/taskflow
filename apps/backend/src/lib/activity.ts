import { prisma } from "./prisma";
import type { ActivityAction } from "@taskflow/shared";

export async function logActivity(
    boardId: string,
    userId: string,
    action: ActivityAction,
    payload: Record<string, unknown> = {},
) {
    try {
        await prisma.activityLog.create({
            data: { boardId, userId, action, payload },
        });
    } catch (err) {
        console.error('[activity log]', err);
    }
}