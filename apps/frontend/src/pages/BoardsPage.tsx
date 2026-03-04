import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { boardsApi } from '../api/boards';
import { useAuthStore } from '../store/auth';
import { Navbar } from '../components/ui/Navbar';
import { Button, Input, Modal, Spinner } from '../components/ui';
import type { Board } from '@taskflow/shared';

type BoardWithMeta = Board & {
  ownerId: string;
  _count?: { columns: number };
  members?: unknown[];
};

export function BoardsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null);

  const { data: boards, isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: boardsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => boardsApi.create(name),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast.success(`"${board.name}" created`);
      setCreateOpen(false);
      setBoardName('');
      navigate(`/boards/${board.id}`);
    },
    onError: () => toast.error('Failed to create board'),
  });

  const deleteMutation = useMutation({
    mutationFn: (boardId: string) => boardsApi.delete(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast.success('Board deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete board'),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!boardName.trim()) return;
    createMutation.mutate(boardName.trim());
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-ink tracking-tight">My Boards</h1>
            <p className="text-sm text-ink-muted mt-0.5">
              {boards ? `${boards.length} board${boards.length !== 1 ? 's' : ''}` : ''}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon /> New Board
          </Button>
        </div>

        {isLoading ? (
          <BoardsSkeleton />
        ) : boards && boards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(boards as BoardWithMeta[]).map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                isOwner={board.ownerId === user?.id}
                onClick={() => navigate(`/boards/${board.id}`)}
                onDelete={() => setDeleteTarget(board)}
              />
            ))}
            <button
              onClick={() => setCreateOpen(true)}
              className="rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary-light/30 transition-all duration-200 flex flex-col items-center justify-center gap-2 p-8 text-ink-muted hover:text-primary min-h-[140px] group"
            >
              <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                <PlusIcon />
              </div>
              <span className="text-sm font-medium">New Board</span>
            </button>
          </div>
        ) : (
          <EmptyState onCreateClick={() => setCreateOpen(true)} />
        )}
      </main>

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setBoardName(''); }} title="Create Board">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Board name" placeholder="e.g. Product Roadmap" value={boardName}
            onChange={(e) => setBoardName(e.target.value)} autoFocus />
          <p className="text-xs text-ink-muted">
            A board will be created with 3 default columns: To Do, In Progress, Done.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending} disabled={!boardName.trim()}>Create Board</Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete Board">
        <p className="text-sm text-ink-secondary mb-6">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-ink">"{deleteTarget?.name}"</span>?
          All columns and cards will be permanently deleted.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
            Delete Board
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function BoardCard({ board, isOwner, onClick, onDelete }: {
  board: BoardWithMeta; isOwner: boolean; onClick: () => void; onDelete: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group relative rounded-xl bg-surface border border-border hover:border-border-strong hover:shadow-card-hover transition-all duration-200 cursor-pointer overflow-hidden"
    >
      <div className="h-1.5 bg-primary w-full" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-ink text-sm leading-snug line-clamp-2 flex-1">{board.name}</h3>
          {isOwner && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-ink-muted hover:text-danger hover:bg-danger-light transition-all flex-shrink-0"
            >
              <TrashIcon />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-muted">
          {board._count && <span>{board._count.columns} columns</span>}
          {board.members && <span>{board.members.length} member{board.members.length !== 1 ? 's' : ''}</span>}
        </div>
        <p className="text-xs text-ink-muted mt-3">
          {formatDistanceToNow(new Date(board.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-raised flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-ink-muted">
          <rect x="2" y="2" width="10" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <rect x="16" y="2" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-ink mb-1">No boards yet</h2>
      <p className="text-sm text-ink-muted mb-6 max-w-xs">Create your first board to start organizing tasks.</p>
      <Button onClick={onCreateClick}><PlusIcon /> Create your first board</Button>
    </div>
  );
}

function BoardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl bg-surface border border-border overflow-hidden">
          <div className="h-1.5 skeleton" />
          <div className="p-5 space-y-3">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.75 3.5h10.5M5.25 3.5V2.333a.583.583 0 01.583-.583h2.334a.583.583 0 01.583.583V3.5m1.75 0l-.583 7.583a.583.583 0 01-.584.584H4.667a.583.583 0 01-.584-.584L3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}