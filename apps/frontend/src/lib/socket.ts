import { io, type Socket } from 'socket.io-client';
import type { WSServerEvent } from '@taskflow/shared';

// ── Singleton socket ──────────────────────────────────────────
// One connection per browser tab. We connect lazily on first use
// and reuse it across all boards within the session.

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (_socket) return _socket;

  _socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000', {
    autoConnect: false,          // we connect manually after auth
    withCredentials: true,
  });

  return _socket;
}

/**
 * Connect the socket and authenticate.
 * Safe to call multiple times — no-ops if already connected.
 */
export function connectSocket(token: string) {
  const socket = getSocket();
  if (socket.connected) return;

  // Attach token to the handshake so the server middleware can verify it
  socket.auth = { token };
  socket.connect();
}

/** Disconnect and destroy the singleton (call on logout) */
export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

/** Join a board room to start receiving events for that board */
export function joinBoard(boardId: string) {
  getSocket().emit('join_board', { boardId });
}

/** Leave a board room (called when BoardPage unmounts) */
export function leaveBoard(boardId: string) {
  getSocket().emit('leave_board', { boardId });
}

/**
 * Subscribe to a specific WSServerEvent type.
 * Returns an unsubscribe function for use in useEffect cleanup.
 */
export function onBoardEvent<T extends WSServerEvent['type']>(
  eventType: T,
  handler: (payload: Extract<WSServerEvent, { type: T }>['payload']) => void,
): () => void {
  const socket = getSocket();
  socket.on(eventType, handler as (...args: unknown[]) => void);
  return () => socket.off(eventType, handler as (...args: unknown[]) => void);
}