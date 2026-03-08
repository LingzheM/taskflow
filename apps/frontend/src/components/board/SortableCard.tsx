import { useSortable } from "@dnd-kit/sortable";
import {CSS} from '@dnd-kit/utilities';
import type { Card } from "@taskflow/shared";
import { CardItem } from "./CardItem";

interface SortableCardProps {
    card: Card;
}

export function SortableCard({card}: SortableCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: card.id,
        data: {
            type: 'Card',
            card,
        },
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <CardItem
                card={card}
                isDragging={isDragging}
                dragHandleProps={{ ...attributes, ...listeners }}
            />
        </div>
    );
}

/**
 * Drag overlay - rendered outside the column while dragging
 */
export function CardDragOverlay({card}: { card: Card }) {
    return (
        <div className="card-drag-overlay">
            <CardItem card={card} />
        </div>
    )
}