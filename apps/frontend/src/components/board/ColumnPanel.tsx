import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import type { ColumnWithCards } from '@taskflow/shared';
import { columnsApi, cardsApi } from '../../api/cards';
import { useBoardStore } from '../../store/board';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button, Modal } from '../ui';
import { SortableCard } from './SortableCard';

interface ColumnPanelProps {
  column: ColumnWithCards;
  boardId: string;
  // Drag props — injected by dnd-kit in Step 7
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
}

export function ColumnPanel({ column, boardId, dragHandleProps, isDragging }: ColumnPanelProps) {
  const [addingCard, setAddingCard] = useState(false);
  const [cardTitle, setCardTitle] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [colName, setColName] = useState(column.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  const { addCard, updateColumn, removeColumn } = useBoardStore();

  // Focus inputs when toggled
  useEffect(() => {
    if (addingCard) addInputRef.current?.focus();
  }, [addingCard]);
  useEffect(() => {
    if (renaming) renameRef.current?.select();
  }, [renaming]);

  // ── Mutations ───────────────────────────────────────────────

  const addCardMutation = useMutation({
    mutationFn: () => cardsApi.create(column.id, { title: cardTitle.trim() }),
    onSuccess: (card) => {
      addCard(card);
      setCardTitle('');
      setAddingCard(false);
    },
    onError: () => toast.error('Failed to add card'),
  });

  const renameMutation = useMutation({
    mutationFn: () => columnsApi.update(column.id, colName.trim()),
    onSuccess: (updated) => {
      updateColumn(updated);
      setRenaming(false);
    },
    onError: () => toast.error('Failed to rename column'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => columnsApi.delete(column.id),
    onSuccess: () => {
      removeColumn(column.id);
      toast.success(`"${column.name}" deleted`);
      setDeleteOpen(false);
    },
    onError: () => toast.error('Failed to delete column'),
  });

  function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    if (!cardTitle.trim()) return;
    addCardMutation.mutate();
  }

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!colName.trim() || colName === column.name) {
      setColName(column.name);
      setRenaming(false);
      return;
    }
    renameMutation.mutate();
  }

  function cancelAddCard() {
    setAddingCard(false);
    setCardTitle('');
  }

  return (
    <>
      <div
        className={clsx(
          'flex flex-col w-72 flex-shrink-0 rounded-xl bg-surface-raised',
          'border border-border',
          isDragging && 'opacity-50',
        )}
        style={{ maxHeight: 'calc(100vh - 7rem)' }}
      >
        {/* Column header */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2 flex-shrink-0">
          {/* Drag handle — wired up in Step 7 */}
          <button
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface cursor-grab active:cursor-grabbing transition-colors touch-none"
            title="Drag to reorder"
            {...dragHandleProps}
          >
            <GripIcon />
          </button>

          {/* Column name */}
          {renaming ? (
            <form onSubmit={handleRename} className="flex-1">
              <input
                ref={renameRef}
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => e.key === 'Escape' && (setColName(column.name), setRenaming(false))}
                className="w-full text-sm font-semibold text-ink bg-surface border border-primary rounded px-2 py-0.5 focus:outline-none"
              />
            </form>
          ) : (
            <button
              onClick={() => setRenaming(true)}
              className="flex-1 text-left text-sm font-semibold text-ink hover:text-ink-secondary transition-colors truncate"
              title="Click to rename"
            >
              {column.name}
            </button>
          )}

          {/* Card count badge */}
          <span className="text-xs text-ink-muted bg-surface rounded-full px-2 py-0.5 flex-shrink-0">
            {column.cards.length}
          </span>

          {/* Column menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface transition-colors"
            >
              <DotsIcon />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-border rounded-lg shadow-dropdown py-1 w-40">
                  <button
                    onClick={() => { setRenaming(true); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-surface-raised transition-colors"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => { setDeleteOpen(true); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-danger-light transition-colors"
                  >
                    Delete column
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cards list */}
        <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-2 scrollbar-thin">
          <SortableContext
            items={column.cards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {column.cards.map((card) => (
              <SortableCard key={card.id} card={card} />
            ))}
          </SortableContext>

          {column.cards.length === 0 && !addingCard && (
            <div className="py-6 text-center text-xs text-ink-muted">
              No cards yet
            </div>
          )}
        </div>

        {/* Add card section */}
        <div className="px-3 pb-3 flex-shrink-0">
          {addingCard ? (
            <form onSubmit={handleAddCard} className="space-y-2">
              <input
                ref={addInputRef}
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && cancelAddCard()}
                placeholder="Card title..."
                className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={addCardMutation.isPending} disabled={!cardTitle.trim()}>
                  Add card
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={cancelAddCard}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAddingCard(true)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-surface transition-colors"
            >
              <PlusIcon />
              Add card
            </button>
          )}
        </div>
      </div>

      {/* Delete column confirm */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Column">
        <p className="text-sm text-ink-secondary mb-2">
          Delete <span className="font-semibold text-ink">"{column.name}"</span>?
        </p>
        <p className="text-sm text-ink-muted mb-6">
          All <span className="font-semibold">{column.cards.length} card{column.cards.length !== 1 ? 's' : ''}</span> inside will be permanently deleted.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
            Delete Column
          </Button>
        </div>
      </Modal>
    </>
  );
}

// ── Icons ─────────────────────────────────────────────────────

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="4.5" cy="3.5" r="1" fill="currentColor" />
      <circle cx="9.5" cy="3.5" r="1" fill="currentColor" />
      <circle cx="4.5" cy="7" r="1" fill="currentColor" />
      <circle cx="9.5" cy="7" r="1" fill="currentColor" />
      <circle cx="4.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="9.5" cy="10.5" r="1" fill="currentColor" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="3" r="1.2" fill="currentColor" />
      <circle cx="7" cy="7" r="1.2" fill="currentColor" />
      <circle cx="7" cy="11" r="1.2" fill="currentColor" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}