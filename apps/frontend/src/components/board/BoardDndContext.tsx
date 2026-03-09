import { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { generateNKeysBetween } from 'fractional-indexing';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { Card, ColumnWithCards } from '@taskflow/shared';
import { cardsApi, columnsApi } from '../../api/cards';
import { useBoardStore } from '../../store/board';
import { computeMovePosition } from '../../lib/position';
import { SortableColumn, ColumnDragOverlay } from './SortableColumn';
import { SortableCard, CardDragOverlay } from './SortableCard';

interface BoardDndContextProps {
  boardId: string;
  columns: ColumnWithCards[];
}

type ActiveItem =
  | { type: 'Card'; card: Card }
  | { type: 'Column'; column: ColumnWithCards };

export function BoardDndContext({ boardId, columns }: BoardDndContextProps) {
  const { moveCard, setColumns } = useBoardStore();
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);

  // Snapshot for rollback on error
  const [snapshot, setSnapshot] = useState<ColumnWithCards[] | null>(null);

  // Tracks the cross-column move applied optimistically in onDragOver,
  // so handleDragEnd can persist it without re-deriving from (possibly stale) columns.
  const pendingMoveRef = useRef<{
    cardId: string;
    columnId: string;
    position: string;
  } | null>(null);

  // ── Sensors ───────────────────────────────────────────────
  // PointerSensor with a small activation distance avoids
  // accidental drags when clicking buttons inside cards.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ── Mutations ─────────────────────────────────────────────

  const moveCardMutation = useMutation({
    mutationFn: ({
      cardId,
      columnId,
      position,
    }: {
      cardId: string;
      columnId: string;
      position: string;
    }) => cardsApi.move(cardId, { columnId, position }),

    onError: () => {
      // Roll back to the state before drag started
      if (snapshot) setColumns(snapshot);
      toast.error('Failed to save card position');
    },
  });

  const reorderColumnsMutation = useMutation({
    mutationFn: (cols: { id: string; position: string }[]) =>
      columnsApi.reorder(boardId, cols),

    onError: () => {
      if (snapshot) setColumns(snapshot);
      toast.error('Failed to save column order');
    },
  });

  // ── Drag handlers ─────────────────────────────────────────

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setSnapshot(columns.map((c) => ({ ...c, cards: [...c.cards] })));
      pendingMoveRef.current = null;

      const { data } = event.active;
      if (data.current?.type === 'Card') {
        setActiveItem({ type: 'Card', card: data.current.card });
      } else if (data.current?.type === 'Column') {
        setActiveItem({ type: 'Column', column: data.current.column });
      }
    },
    [columns],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeType = active.data.current?.type;
      const overType = over.data.current?.type;

      // Only handle card-over-column or card-over-card cross-column here.
      // Same-column reorder is handled in onDragEnd for cleaner UX.
      if (activeType !== 'Card') return;

      const activeCard: Card = active.data.current?.card;
      const activeColumnId = activeCard.columnId;

      // Determine target column
      let targetColumnId: string;
      if (overType === 'Column') {
        targetColumnId = over.id as string;
      } else if (overType === 'Card') {
        targetColumnId = over.data.current?.card.columnId;
      } else {
        return;
      }

      // Only act on cross-column moves (same-column handled in onDragEnd)
      if (activeColumnId === targetColumnId) return;

      const targetColumn = columns.find((c) => c.id === targetColumnId);
      if (!targetColumn) return;

      // Compute the new position: drop at end of target column
      const newPosition = computeMovePosition(
        targetColumn.cards,
        activeCard.id,
        targetColumn.cards.length,
      );

      // Record for handleDragEnd (columns closure may be stale by then)
      pendingMoveRef.current = { cardId: activeCard.id, columnId: targetColumnId, position: newPosition };

      // Optimistic update
      moveCard(activeCard.id, targetColumnId, newPosition);
    },
    [columns, moveCard],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveItem(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeType = active.data.current?.type;

      // ── Column reorder ─────────────────────────────────
      if (activeType === 'Column') {
        const oldIndex = columns.findIndex((c) => c.id === active.id);
        const newIndex = columns.findIndex((c) => c.id === over.id);
        if (oldIndex === newIndex) return;

        const reordered = arrayMove(columns, oldIndex, newIndex);

        // Assign new fractional positions based on the new order
        const newPositions: string[] = generateNKeysBetween(null, null, reordered.length);

        const updated = reordered.map((col, i) => ({
          ...col,
          position: newPositions[i],
        }));

        setColumns(updated); // optimistic

        reorderColumnsMutation.mutate(
          updated.map((c) => ({ id: c.id, position: c.position })),
        );
        return;
      }

      // ── Card drag ──────────────────────────────────────
      if (activeType === 'Card') {
        const activeCard: Card = active.data.current?.card;

        // ── Cross-column move (applied optimistically in onDragOver) ──────
        // pendingMoveRef holds the move so we don't rely on the columns
        // closure, which may be stale or already updated by React re-render.
        if (pendingMoveRef.current?.cardId === activeCard.id) {
          const { columnId: toColumnId, position: approxPosition } = pendingMoveRef.current;
          pendingMoveRef.current = null;

          // If the user dropped on a specific card in the target column,
          // refine the position so the card lands exactly where they dropped it.
          const overCard: Card | undefined = over.data.current?.card;
          const overType = over.data.current?.type;
          if (overType === 'Card' && overCard?.columnId === toColumnId) {
            const targetCol = columns.find((c) => c.id === toColumnId);
            if (targetCol) {
              const newIndex = targetCol.cards.findIndex((k) => k.id === overCard.id);
              if (newIndex !== -1) {
                const refinedPos = computeMovePosition(targetCol.cards, activeCard.id, newIndex);
                moveCard(activeCard.id, toColumnId, refinedPos);
                moveCardMutation.mutate({ cardId: activeCard.id, columnId: toColumnId, position: refinedPos });
                return;
              }
            }
          }

          // Dropped on column background or imprecise target — use position
          // computed in onDragOver (end of target column).
          moveCardMutation.mutate({ cardId: activeCard.id, columnId: toColumnId, position: approxPosition });
          return;
        }

        // ── Same-column reorder ───────────────────────────────────────────
        const currentColumn = columns.find((c) =>
          c.cards.some((k) => k.id === activeCard.id),
        );
        if (!currentColumn) return;

        const oldIndex = currentColumn.cards.findIndex((k) => k.id === active.id);
        const newIndex = currentColumn.cards.findIndex((k) => k.id === over.id);
        // newIndex === -1 means over is the column element, not a card — ignore
        if (oldIndex === newIndex || newIndex === -1) return;

        const newPosition = computeMovePosition(currentColumn.cards, activeCard.id, newIndex);
        moveCard(activeCard.id, currentColumn.id, newPosition);
        moveCardMutation.mutate({ cardId: activeCard.id, columnId: currentColumn.id, position: newPosition });
      }
    },
    [columns, moveCard, setColumns, moveCardMutation, reorderColumnsMutation],
  );

  // ── Render ────────────────────────────────────────────────

  const columnIds = columns.map((c) => c.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Horizontal column list */}
      <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        {columns.map((column) => (
          <SortableColumn key={column.id} column={column} boardId={boardId} />
        ))}
      </SortableContext>

      {/* Drag overlay — rendered in a portal above everything */}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeItem?.type === 'Card' && (
          <CardDragOverlay card={activeItem.card} />
        )}
        {activeItem?.type === 'Column' && (
          <ColumnDragOverlay column={activeItem.column} boardId={boardId} />
        )}
      </DragOverlay>
    </DndContext>
  );
}