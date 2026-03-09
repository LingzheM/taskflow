import { useEffect } from "react";
import { joinBoard, leaveBoard, onBoardEvent } from "../lib/socket";
import { useBoardStore } from "../store/board";

/**
 * Subscribes to all WSServerEvents for the given board
 */
export function useBoardSocket(boardId: string) {
    const {
        addCard,
        updateCard,
        removeCard,
        moveCard,
        addColumn,
        updateColumn,
        removeColumn,
        setColumns,
        board,
    } = useBoardStore();

    useEffect(() => {
        if (!boardId) return;

        // Tell the server we want events for this board
        joinBoard(boardId);

        // Card events
        const offCardCreated = onBoardEvent('card:created', (card) => {
            // Only add if we don't already have it (prevents double-add)
            const exists = board?.columns.some((c) => c.cards.some((k) => k.id === card.id));
            if (!exists) addCard(card);
        });

        const offCardUpdated = onBoardEvent('card:updated', (card) => {
            updateCard(card);
        });

        const offCardDeleted = onBoardEvent('card:deleted', ({ cardId }) => {
            removeCard(cardId);
        });

        const offCardMoved = onBoardEvent('card:moved', ({ card, fromColumnId, toColumnId }) => {
            moveCard(card.id, toColumnId, card.position);
        });

        // Column events
        const offColumnCreated = onBoardEvent('column:created', (column) => {
            const exists = board?.columns.some((c) => c.id === column.id);
            if (!exists) addColumn(column);
        });

        const offColumnUpdated = onBoardEvent('column:updated', (column) => {
            updateColumn(column);
        });

        const offColumnDeleted = onBoardEvent('column:deleted', ({ columnId }) => {
            removeColumn(columnId);
        });

        const offColumnReordered = onBoardEvent('column:reordered', ({ columns }) => {
            setColumns(columns);
        });

        return () => {
            // Clean up listeners and tell server we're leaving
            leaveBoard(boardId);
            offCardCreated();
            offCardUpdated();
            offCardDeleted();
            offCardMoved();
            offColumnCreated();
            offColumnUpdated();
            offColumnDeleted();
            offColumnReordered();
        };
    }, [boardId]);
}