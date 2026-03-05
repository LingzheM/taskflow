import { create } from 'zustand';
import type { BoardWithDetails, Card, Column, ColumnWithCards } from '@taskflow/shared';

interface BoardState {
  board: BoardWithDetails | null;

  // Actions
  setBoard: (board: BoardWithDetails) => void;
  clearBoard: () => void;

  // Column mutations (optimistic)
  addColumn: (column: Column) => void;
  updateColumn: (column: Column) => void;
  removeColumn: (columnId: string) => void;
  setColumns: (columns: Column[]) => void;

  // Card mutations (optimistic)
  addCard: (card: Card) => void;
  updateCard: (card: Card) => void;
  removeCard: (cardId: string) => void;
  moveCard: (cardId: string, toColumnId: string, newPosition: string) => void;
}

export const useBoardStore = create<BoardState>()((set) => ({
  board: null,

  setBoard: (board) => set({ board }),
  clearBoard: () => set({ board: null }),

  addColumn: (column) =>
    set((s) => {
      if (!s.board) return s;
      const newCol: ColumnWithCards = { ...column, cards: [] };
      return {
        board: {
          ...s.board,
          columns: [...s.board.columns, newCol].sort((a, b) =>
            a.position < b.position ? -1 : 1,
          ),
        },
      };
    }),

  updateColumn: (column) =>
    set((s) => {
      if (!s.board) return s;
      return {
        board: {
          ...s.board,
          columns: s.board.columns.map((c) =>
            c.id === column.id ? { ...c, ...column } : c,
          ),
        },
      };
    }),

  removeColumn: (columnId) =>
    set((s) => {
      if (!s.board) return s;
      return {
        board: {
          ...s.board,
          columns: s.board.columns.filter((c) => c.id !== columnId),
        },
      };
    }),

  setColumns: (columns) =>
    set((s) => {
      if (!s.board) return s;
      const cardMap = new Map(s.board.columns.map((c) => [c.id, c.cards]));
      return {
        board: {
          ...s.board,
          columns: columns
            .map((c) => ({ ...c, cards: cardMap.get(c.id) ?? [] }))
            .sort((a, b) => (a.position < b.position ? -1 : 1)),
        },
      };
    }),

  addCard: (card) =>
    set((s) => {
      if (!s.board) return s;
      return {
        board: {
          ...s.board,
          columns: s.board.columns.map((c) =>
            c.id === card.columnId
              ? {
                  ...c,
                  cards: [...c.cards, card].sort((a, b) =>
                    a.position < b.position ? -1 : 1,
                  ),
                }
              : c,
          ),
        },
      };
    }),

  updateCard: (card) =>
    set((s) => {
      if (!s.board) return s;
      return {
        board: {
          ...s.board,
          columns: s.board.columns.map((c) => ({
            ...c,
            cards: c.cards.map((k) => (k.id === card.id ? { ...k, ...card } : k)),
          })),
        },
      };
    }),

  removeCard: (cardId) =>
    set((s) => {
      if (!s.board) return s;
      return {
        board: {
          ...s.board,
          columns: s.board.columns.map((c) => ({
            ...c,
            cards: c.cards.filter((k) => k.id !== cardId),
          })),
        },
      };
    }),

  moveCard: (cardId, toColumnId, newPosition) =>
    set((s) => {
      if (!s.board) return s;

      // Find the card across all columns
      let movingCard: Card | undefined;
      for (const col of s.board.columns) {
        movingCard = col.cards.find((k) => k.id === cardId);
        if (movingCard) break;
      }
      if (!movingCard) return s;

      const updatedCard: Card = { ...movingCard, columnId: toColumnId, position: newPosition };

      return {
        board: {
          ...s.board,
          columns: s.board.columns.map((c) => {
            // Remove from source column
            const withoutCard = c.cards.filter((k) => k.id !== cardId);
            // Add to target column
            if (c.id === toColumnId) {
              return {
                ...c,
                cards: [...withoutCard, updatedCard].sort((a, b) =>
                  a.position < b.position ? -1 : 1,
                ),
              };
            }
            return { ...c, cards: withoutCard };
          }),
        },
      };
    }),
}));