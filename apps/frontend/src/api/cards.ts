import { apiFetch } from './client';
import type { Card, Column } from '@taskflow/shared';

export const columnsApi = {
  create: (boardId: string, name: string) =>
    apiFetch<Column>('post', `/api/boards/${boardId}/columns`, { name }),

  update: (columnId: string, name: string) =>
    apiFetch<Column>('patch', `/api/columns/${columnId}`, { name }),

  delete: (columnId: string) =>
    apiFetch<{ deleted: boolean }>('delete', `/api/columns/${columnId}`),

  reorder: (boardId: string, columns: { id: string; position: string }[]) =>
    apiFetch<Column[]>('patch', `/api/boards/${boardId}/columns/reorder`, { columns }),
};

export const cardsApi = {
  create: (columnId: string, data: { title: string; description?: string }) =>
    apiFetch<Card>('post', `/api/columns/${columnId}/cards`, data),

  update: (cardId: string, data: { title?: string; description?: string | null }) =>
    apiFetch<Card>('patch', `/api/cards/${cardId}`, data),

  delete: (cardId: string) =>
    apiFetch<{ deleted: boolean }>('delete', `/api/cards/${cardId}`),

  move: (cardId: string, data: { columnId: string; position: string }) =>
    apiFetch<Card>('patch', `/api/cards/${cardId}/move`, data),
};