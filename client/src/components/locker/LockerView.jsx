import { useState } from 'react';
import { ChevronDown, Folder, FolderLock, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { lockerApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useFetch } from '../../hooks/useFetch.js';
import { Button, Card, EmptyState, ErrorState, PageSpinner, cx } from '../ui/index.jsx';
import { LockerItemRow } from './LockerItemRow.jsx';
import AddItemModal from './AddItemModal.jsx';

/** Folder-grouped Notes Locker for one space. Owners can add and delete items. */
export default function LockerView({ spaceId, isOwner, onChange }) {
  const locker = useFetch(() => lockerApi.list(spaceId), [spaceId]);
  const [adding, setAdding] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set());

  const toggle = (name) =>
    setCollapsed((s) => {
      const n = new Set(s);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.title}"? This can't be undone.`)) return;
    try {
      await lockerApi.remove(item._id);
      toast.success('Deleted');
      locker.reload();
      onChange?.();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (locker.loading && !locker.data) return <PageSpinner />;
  if (locker.error) return <ErrorState error={locker.error} onRetry={locker.reload} />;

  const { folders, totalItems } = locker.data;

  return (
    <div>
      {isOwner && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-zinc-500">{totalItems} item{totalItems === 1 ? '' : 's'}</p>
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add to locker
          </Button>
        </div>
      )}

      {folders.length === 0 ? (
        <EmptyState
          icon={FolderLock}
          title={isOwner ? 'Your locker is empty' : 'Nothing here yet'}
          action={isOwner && <Button onClick={() => setAdding(true)}><Plus className="size-4" /> Add your first note</Button>}
        >
          {isOwner
            ? 'Write a Markdown note, upload a PDF or slides, or save a useful link.'
            : 'Notes your educator shares with you will appear here.'}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {folders.map((f) => {
            const isOpen = !collapsed.has(f.folderName);
            return (
              <Card key={f.folderName} className="overflow-hidden">
                <button
                  onClick={() => toggle(f.folderName)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-2 bg-zinc-50/60 px-4 py-2.5 text-left text-sm font-medium"
                >
                  <ChevronDown className={cx('size-4 text-zinc-400 transition-transform', !isOpen && '-rotate-90')} />
                  <Folder className="size-4 text-amber-500" />
                  <span className="flex-1">{f.folderName}</span>
                  <span className="text-xs font-normal text-zinc-400">{f.count}</span>
                </button>
                {isOpen && (
                  <div className="divide-y divide-zinc-100 border-t border-zinc-100">
                    {f.items.map((item) => (
                      <LockerItemRow key={item._id} item={item} showVisibility={isOwner} onDelete={isOwner ? remove : undefined} />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {isOwner && (
        <AddItemModal
          open={adding}
          onClose={() => setAdding(false)}
          spaceId={spaceId}
          folders={folders.map((f) => f.folderName)}
          onCreated={() => {
            locker.reload();
            onChange?.();
          }}
        />
      )}
    </div>
  );
}
