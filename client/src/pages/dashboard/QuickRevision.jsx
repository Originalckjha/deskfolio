import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AArrowDown, AArrowUp, ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Moon, Sun } from 'lucide-react';
import { lockerApi } from '../../api/endpoints.js';
import { useFetch } from '../../hooks/useFetch.js';
import { Button, PageSpinner, cx } from '../../components/ui/index.jsx';
import Markdown from '../../components/locker/Markdown.jsx';
import NotFound from '../public/NotFound.jsx';
import { formatDate } from '../../utils/format.js';

const SIZES = ['prose-base', 'prose-lg', 'prose-xl'];
const PREFS_KEY = 'deskfolio_reader';

function loadPrefs() {
  try {
    return { size: 1, dark: false, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
  } catch {
    return { size: 1, dark: false };
  }
}

/** Mobile-first, distraction-free reader for revising notes. */
export default function QuickRevision() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(loadPrefs);
  const [progress, setProgress] = useState(0);

  const item = useFetch(() => lockerApi.get(itemId), [itemId]);
  const spaceId = item.data?.item.spaceId;
  const siblings = useFetch(() => (spaceId ? lockerApi.list(spaceId) : Promise.resolve(null)), [spaceId]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* preferences just won't persist */
    }
  }, [prefs]);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 100);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [item.data]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [itemId]);

  // Prev/next through the space's notes, in locker order.
  const { prev, next, position, total } = useMemo(() => {
    const notes = siblings.data?.folders.flatMap((f) => f.items).filter((i) => i.itemType === 'RICH_NOTE') ?? [];
    const idx = notes.findIndex((n) => n._id === itemId);
    return { prev: notes[idx - 1], next: notes[idx + 1], position: idx + 1, total: notes.length };
  }, [siblings.data, itemId]);

  if (item.loading && !item.data) return <PageSpinner />;
  if (item.error) return <div className="px-4 py-10"><NotFound what="note" /></div>;

  const note = item.data.item;
  const dark = prefs.dark;

  return (
    <div className={cx('min-h-dvh transition-colors', dark ? 'bg-zinc-950 text-zinc-100' : 'bg-[#fcfbf8] text-zinc-900')}>
      <header
        className={cx(
          'sticky top-0 z-10 border-b backdrop-blur',
          dark ? 'border-zinc-800 bg-zinc-950/85' : 'border-zinc-200/70 bg-[#fcfbf8]/85',
        )}
      >
        <div className="mx-auto flex h-12 max-w-3xl items-center gap-2 px-3">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(`/spaces/${note.spaceId}`))}
            className={cx('rounded-lg p-2', dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100')}
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{note.title}</p>
          <div className="flex items-center">
            {[
              { icon: AArrowDown, label: 'Smaller text', on: () => setPrefs((p) => ({ ...p, size: Math.max(0, p.size - 1) })) },
              { icon: AArrowUp, label: 'Larger text', on: () => setPrefs((p) => ({ ...p, size: Math.min(2, p.size + 1) })) },
              { icon: dark ? Sun : Moon, label: dark ? 'Light mode' : 'Dark mode', on: () => setPrefs((p) => ({ ...p, dark: !p.dark })) },
            ].map(({ icon: Icon, label, on }) => (
              <button key={label} onClick={on} aria-label={label} title={label}
                className={cx('rounded-lg p-2', dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100')}>
                <Icon className="size-5" />
              </button>
            ))}
          </div>
        </div>
        <div className="h-0.5 bg-indigo-500 transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </header>

      <main className="mx-auto max-w-3xl px-5 pt-8 pb-28 sm:pt-12">
        <p className={cx('text-xs font-medium tracking-wide uppercase', dark ? 'text-zinc-500' : 'text-zinc-400')}>
          {note.folderName} · {formatDate(note.updatedAt)}
          {total > 1 && position > 0 && ` · ${position} of ${total}`}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{note.title}</h1>

        <div className="mt-8">
          {note.itemType === 'RICH_NOTE' ? (
            <Markdown className={cx('font-serif', SIZES[prefs.size], dark && 'prose-invert')}>{note.contentMarkdown}</Markdown>
          ) : (
            <Button as="a" href={note.fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" /> Open {note.itemType === 'EXTERNAL_LINK' ? 'link' : 'file'}
            </Button>
          )}
        </div>
      </main>

      {(prev || next) && (
        <nav
          className={cx(
            'fixed inset-x-0 bottom-0 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur',
            dark ? 'border-zinc-800 bg-zinc-950/90' : 'border-zinc-200/70 bg-[#fcfbf8]/90',
          )}
          aria-label="Notes"
        >
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 px-3 py-2">
            {prev ? (
              <Link to={`/read/${prev._id}`} replace className={cx('flex min-w-0 items-center gap-1 rounded-lg p-2 text-sm', dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100')}>
                <ChevronLeft className="size-4 shrink-0" /> <span className="truncate">{prev.title}</span>
              </Link>
            ) : <span />}
            {next && (
              <Link to={`/read/${next._id}`} replace className={cx('flex min-w-0 items-center justify-end gap-1 rounded-lg p-2 text-sm font-medium', dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100')}>
                <span className="truncate">{next.title}</span> <ChevronRight className="size-4 shrink-0" />
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
