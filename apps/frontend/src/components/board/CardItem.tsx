import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import type { Card } from '@taskflow/shared';
import { cardsApi } from '../../api/cards';
import { useBoardStore } from '../../store/board';
import { Button, Input, Textarea, Modal } from '../ui';

interface CardItemProps {
  card: Card;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}

export function CardItem({ card, dragHandleProps, isDragging }: CardItemProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? '');

  const { updateCard, removeCard } = useBoardStore();

  const updateMutation = useMutation({
    mutationFn: () =>
      cardsApi.update(card.id, {
        title: title.trim(),
        description: description.trim() || null,
      }),
    onSuccess: (updated) => {
      updateCard(updated);
      toast.success('Card updated');
      setEditOpen(false);
    },
    onError: () => toast.error('Failed to update card'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => cardsApi.delete(card.id),
    onSuccess: () => {
      removeCard(card.id);
      toast.success('Card deleted');
      setDeleteOpen(false);
    },
    onError: () => toast.error('Failed to delete card'),
  });

  function handleEditOpen(e: React.MouseEvent) {
    e.stopPropagation();
    setTitle(card.title);
    setDescription(card.description ?? '');
    setEditOpen(true);
  }

  return (
    <>
      <div
        className={clsx(
          'group relative bg-surface rounded-lg border border-border p-3',
          'shadow-card hover:shadow-card-hover hover:border-border-strong',
          'transition-all duration-150 cursor-pointer',
          isDragging && 'opacity-40',
        )}
        onClick={handleEditOpen}
        {...dragHandleProps}
      >
        {/* Card content */}
        <p className="text-sm text-ink leading-snug">{card.title}</p>
        {card.description && (
          <p className="text-xs text-ink-muted mt-1.5 line-clamp-2 leading-relaxed">
            {card.description}
          </p>
        )}

        {/* Hover actions */}
        <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteOpen(true);
            }}
            className="p-1 rounded text-ink-muted hover:text-danger hover:bg-danger-light transition-colors"
            title="Delete card"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) updateMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            rows={4}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={updateMutation.isPending}
              disabled={!title.trim()}
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Card">
        <p className="text-sm text-ink-secondary mb-6">
          Delete{' '}
          <span className="font-semibold text-ink">"{card.title}"</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path
        d="M1.75 3.5h10.5M5.25 3.5V2.333a.583.583 0 01.583-.583h2.334a.583.583 0 01.583.583V3.5m1.75 0l-.583 7.583a.583.583 0 01-.584.584H4.667a.583.583 0 01-.584-.584L3.5 3.5"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}