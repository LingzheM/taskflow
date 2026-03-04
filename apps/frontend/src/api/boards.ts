import { apiFetch } from './client';
import type { Board, BoardWithDetails, BoardMember } from '@taskflow/shared';

export const boardsApi = {
  list: () =>
    apiFetch<Board[]>('get', '/api/boards'),

  get: (boardId: string) =>
    apiFetch<BoardWithDetails>('get', `/api/boards/${boardId}`),

  create: (name: string) =>
    apiFetch<BoardWithDetails>('post', '/api/boards', { name }),

  delete: (boardId: string) =>
    apiFetch<{ deleted: boolean }>('delete', `/api/boards/${boardId}`),

  inviteMember: (boardId: string, email: string) =>
    apiFetch<BoardMember>('post', `/api/boards/${boardId}/members`, { email }),

  getActivity: (boardId: string) =>
    apiFetch<ActivityLog[]>('get', `/api/boards/${boardId}/activity`),
};

// local type until shared is updated
interface ActivityLog {
  id: string;
  boardId: string;
  userId: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
  user: { id: string; name: string; email: string };
}