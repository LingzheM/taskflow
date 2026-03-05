import { create } from "zustand";
import type { BoardWithDetails, Card, Column, ColumnWithCards } from "@taskflow/shared";

interface BoardState {
    board: BoardWithDetails | null;

    // Actions
    setBoard: (board: BoardWithDetails) => void;
    clearBoard: () => void;

    // Column mutations
    addColumn: (column: Column) => void;
    updateColumn: (column: Column) => void;
    removeColumn: (ColumnId: string) => void;
    setColumns: (columns: Column[]) => void;

    
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
                    columns: s.board.columns.filter((c) => c.id !== columnId)
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

    
    

}))