import { Server, type Socket } from 'socket.io';
import type { IncomingMessage, ServerResponse, Server as HttpServer } from 'http';
import { verifyToken } from './jwt.js';
import type { WSServerEvent } from '@taskflow/shared';

let _io: Server | null = null;

export function initSocketIO(httpServer: HttpServer) {
    _io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    _io.use((socket, next) => {
        // Auth handshake
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) return next(new Error('unauthorized'));

        const payload = verifyToken(token);
        if (!payload) return next(new Error('unauthorized'));

        (socket as AuthSocket).userId = payload.userId;
        next();
    });

    _io.on('connection', (socket: Socket) => {
        const userId = (socket as AuthSocket).userId;
        console.log(`[ws] connected userId=${userId} socketId=${socket.id}`);

        // join_board
        // Client calls this when it mounts BoardPage.
        socket.on('join_board', ({ boardId }: { boardId: string }) => {
            socket.join(roomId(boardId));
            console.log(`[ws] joined room=${roomId(boardId)} userId=${userId}`);
        });

        // leave_board
        socket.on('leave_board', ({ boardId }: { boardId: string }) =>{
            socket.leave(roomId(boardId));
            console.log(`[ws] left room=${roomId(boardId)} userId=${userId}`);
        });
        
        socket.on('disconnect', (reason) => {
            console.log(`[ws] disconnected userId=${userId} reason=${reason}`);
        });
    });

    console.log('[ws] Socket.IO initialised');
    return _io;
}

export function getIO(): Server{
    if (!_io) throw new Error('Socket.IO not initialised. Call initSocketIO() first.');
    return _io;
}

/**
 * Broadcast a WSServerEvent to all sockets in a board room
 */
export function broadcastToBoard(
    boardId: string,
    event: WSServerEvent,
    excludeSocketId?: string,
): void {
    const io = getIO();
    const room = io.to(roomId(boardId));

    if (excludeSocketId) {
        io.to(roomId(boardId)).except(excludeSocketId).emit(event.type, event.payload);
    } else {
        room.emit(event.type, event.payload);
    }
}

// Helpers
function roomId(boardId: string) {
    return `board:${boardId}`;
}

export interface AuthSocket extends Socket {
    userId: string;
}