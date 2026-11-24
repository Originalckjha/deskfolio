import { Link } from 'react-router-dom';
import { Download, ExternalLink, FileText, Globe, Image, Link2, Lock, NotebookText, Presentation, Trash2, Users } from 'lucide-react';
import { lockerApi } from '../../api/endpoints.js';
import { Badge, Button, cx } from '../ui/index.jsx';
import { formatDate, formatFileSize } from '../../utils/format.js';

export const visibilityMeta = {
  PUBLIC: { label: 'Public', icon: Globe, tone: 'green' },
  ENROLLED_ONLY: { label: 'Enrolled', icon: Users, tone: 'sky' },
  PRIVATE: { label: 'Private', icon: Lock, tone: 'zinc' },
};

function iconFor(item) {
  if (item.itemType === 'RICH_NOTE') return { Icon: NotebookText, color: 'bg-indigo-50 text-indigo-600' };
  if (item.itemType === 'EXTERNAL_LINK') return { Icon: Link2, color: 'bg-sky-50 text-sky-600' };
  if (item.mimeType?.startsWith('image/')) return { Icon: Image, color: 'bg-rose-50 text-rose-600' };
  if (item.mimeType?.includes('powerpoint') || item.mimeType?.includes('presentation')) {
    return { Icon: Presentation, color: 'bg-orange-50 text-orange-600' };
  }
  return { Icon: FileText, color: 'bg-red-50 text-red-600' };
}

function typeLabel(item) {
  if (item.itemType === 'RICH_NOTE') return 'Note';
  if (item.itemType === 'EXTERNAL_LINK') {
    try {
      return new URL(item.fileUrl).hostname.replace(/^www\./, '');
    } catch {
      return 'Link';
    }
  }
  const ext = item.fileUrl?.split('.').pop()?.split('?')[0];
  return [ext && ext.length <= 4 ? ext.toUpperCase() : 'File', formatFileSize(item.fileSizeKb)].filter(Boolean).join(' · ');
}

/**
 * One locker item. Notes open in the Quick Revision reader; files and links open in a
 * new tab while the download counter is bumped in the background.
 */
export function LockerItemRow({ item, showVisibility = false, onDelete }) {
  const { Icon, color } = iconFor(item);
  const isNote = item.itemType === 'RICH_NOTE';
  const vis = visibilityMeta[item.visibility];

  const countOpen = () => {
    lockerApi.download(item._id).catch(() => {});
  };

  const body = (
    <>
      <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-lg', color)}>
        <Icon className="size-4.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-zinc-900 group-hover:text-indigo-700">{item.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
          <span>{typeLabel(item)}</span>
          <span aria-hidden>·</span>
          <span>{formatDate(item.createdAt)}</span>
          {item.downloadCount > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>{item.downloadCount} {isNote ? 'reads' : 'opens'}</span>
            </>
          )}
        </span>
      </span>
    </>
  );

  return (
    <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50/70">
      {isNote ? (
        <Link to={`/read/${item._id}`} onClick={countOpen} className="flex min-w-0 flex-1 items-center gap-3">
          {body}
        </Link>
      ) : (
        <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" onClick={countOpen} className="flex min-w-0 flex-1 items-center gap-3">
          {body}
        </a>
      )}

      <div className="flex shrink-0 items-center gap-1.5">
        {showVisibility && vis && (
          <Badge tone={vis.tone} className="hidden sm:inline-flex">
            <vis.icon className="size-3" /> {vis.label}
          </Badge>
        )}
        {!isNote && (
          <span className="hidden text-zinc-400 sm:inline" aria-hidden>
            {item.itemType === 'EXTERNAL_LINK' ? <ExternalLink className="size-4" /> : <Download className="size-4" />}
          </span>
        )}
        {onDelete && (
          <Button variant="ghost" size="xs" aria-label={`Delete ${item.title}`} onClick={() => onDelete(item)}>
            <Trash2 className="size-4 text-zinc-400 hover:text-red-600" />
          </Button>
        )}
      </div>
    </div>
  );
}
