import { useSortable } from "@dnd-kit/sortable";
import {CSS} from '@dnd-kit/utilities';
import type { ColumnWithCards } from "@taskflow/shared";
import { ColumnPanel } from "./ColumnPanel";

interface SortableColumnProps {
    column: ColumnWithCards;
    boardId: string;
}

export function SortableColumn({ column, boardId }: SortableColumnProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: column.id,
        data: {
            type: 'Column',
            column,
        },
    });


    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <ColumnPanel
                column={column}
                boardId={boardId}
                isDragging={isDragging}
                dragHandleProps={{ ...attributes, ...listeners }}
            />
        </div>
    );
}

/**
 * Drag overlay for column -rendered while dragging
 */
export function ColumnDragOverlay({
    column,
    boardId
}: {
    column: ColumnWithCards;
    boardId: string;
}) {
    return (
        <div className="opacity-90 rotate-1 scale-[1.01] shadow-modal">
            <ColumnPanel column={column} boardId={boardId} />
        </div>
    )
}