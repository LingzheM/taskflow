import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { boardsApi } from '../api/boards';
import { columnsApi } from '../api/cards';
import { useBoardStore } from '../store/board';
import { useAuthStore } from '../store/auth';
import { Navbar } from '../components/ui/Navbar';
import { Button, Spinner } from '../components/ui';
import { ColumnPanel } from '../components/board/ColumnPanel';

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { board, setBoard, clearBoard, addColumn } = useBoardStore();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState('');

  const { data: boardData, isLoading, isError } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardsApi.get(boardId!),
    enabled: !!boardId,
    staleTime: 0,
  });

  useEffect(() => {
    if (boardData) setBoard(boardData);
    return () => clearBoard();
  }, [boardData, setBoard, clearBoard]);

  const addColumnMutation = useMutation({
    mutationFn: () => columnsApi.create(boardId!, newColName.trim()),
    onSuccess: (column) => {
      addColumn(column);
      setNewColName('');
      setAddingColumn(false);
    },
    onError: () => toast.error('Failed to add column'),
  });

  function handleAddColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!newColName.trim()) return;
    addColumnMutation.mutate();
  }

  const isOwner = board?.ownerId === user?.id;

  if (isLoading || (!board && !isError)) {
    return (
      <div className="min-h-screen flex flex-col bg-bg">
        <Navbar backTo="/boards" />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" className="text-primary" />
        </div>
      </div>
    );
  }

  if (isError || !board) {
    return (
      <div className="min-h-screen flex flex-col bg-bg">
        <Navbar backTo="/boards" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-ink-secondary">Board not found or you don't have access.</p>
          <Button variant="secondary" onClick={() => navigate('/boards')}>Back to Boards</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Navbar
        backTo="/boards"
        title={board.name}
        actions={
          <div className="flex-1 flex items-center justify-end gap-2">
            <div className="flex items-center -space-x-1.5">
              {board.members.slice(0, 5).map((m) => (
                <div key={m.userId} title={m.user.name}
                  className="w-7 h-7 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center border-2 border-surface">
                  {m.user.name[0]?.toUpperCase()}
                </div>
              ))}
              {board.members.length > 5 && (
                <div className="w-7 h-7 rounded-full bg-surface-raised border-2 border-surface text-xs font-medium text-ink-secondary flex items-center justify-center">
                  +{board.members.length - 5}
                </div>
              )}
            </div>
            {isOwner && (
              <Button variant="secondary" size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlusIcon /> Invite
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex items-start gap-3 p-4 h-full min-w-max">
          {board.columns.map((column) => (
            <ColumnPanel key={column.id} column={column} boardId={board.id} />
          ))}

          {addingColumn ? (
            <form onSubmit={handleAddColumn}
              className="w-72 flex-shrink-0 bg-surface-raised rounded-xl border border-border p-3 space-y-2">
              <input value={newColName} onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && (setAddingColumn(false), setNewColName(''))}
                placeholder="Column name..." autoFocus
                className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={addColumnMutation.isPending} disabled={!newColName.trim()}>
                  Add column
                </Button>
                <Button type="button" variant="ghost" size="sm"
                  onClick={() => { setAddingColumn(false); setNewColName(''); }}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <button onClick={() => setAddingColumn(true)}
              className="w-72 flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border text-sm text-ink-muted hover:border-primary hover:text-primary hover:bg-primary-light/20 transition-all duration-200 self-start">
              <PlusIcon /> Add column
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}
function UserPlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3" /><path d="M1 12c0-2.485 2.015-4.5 4.5-4.5S10 9.515 10 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M12 5v4M10 7h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
}