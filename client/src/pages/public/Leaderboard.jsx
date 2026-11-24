import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, Trophy } from 'lucide-react';
import { educatorsApi } from '../../api/endpoints.js';
import { useDebounced, useFetch } from '../../hooks/useFetch.js';
import { Button, EmptyState, ErrorState, Input, PageHeader, PageSpinner, cx } from '../../components/ui/index.jsx';
import LeaderboardList, { VerifiedNote } from '../../components/leaderboard/LeaderboardList.jsx';
import { useState } from 'react';

export default function Leaderboard() {
  const [params, setParams] = useSearchParams();
  const subject = params.get('subject') || '';
  const page = Number(params.get('page')) || 1;
  const [query, setQuery] = useState(params.get('q') || '');
  const q = useDebounced(query.trim(), 300);

  const update = (next) => {
    const merged = { subject, q, page: String(page), ...next };
    // Keep the URL tidy: drop empty values and the default page.
    const entries = Object.entries(merged).filter(([k, v]) => v && !(k === 'page' && v === '1'));
    setParams(Object.fromEntries(entries), { replace: true });
  };

  const subjects = useFetch(() => educatorsApi.subjects(), []);
  const board = useFetch(
    () => educatorsApi.leaderboard({ subject: subject || undefined, q: q || undefined, page, limit: 20 }),
    [subject, q, page],
  );

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Trophy className="size-6 text-amber-500" /> Leaderboard
          </span>
        }
        subtitle="Educators ranked by verified student ratings."
      />

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="search"
            placeholder="Search educators or subjects"
            aria-label="Search educators"
            className="pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (page !== 1) update({ page: '1' });
            }}
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {['', ...(subjects.data?.subjects ?? [])].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => update({ subject: s, page: '1' })}
              className={cx(
                'shrink-0 rounded-full border px-3 py-1 text-sm capitalize transition-colors',
                subject === s
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
              )}
            >
              {s || 'All subjects'}
            </button>
          ))}
        </div>
      </div>

      {board.loading && !board.data ? (
        <PageSpinner />
      ) : board.error ? (
        <ErrorState error={board.error} onRetry={board.reload} />
      ) : board.data.educators.length === 0 ? (
        <EmptyState icon={Search} title="No educators found">
          Try a different search or subject.
        </EmptyState>
      ) : (
        <div className={cx('transition-opacity', board.loading && 'opacity-60')}>
          <LeaderboardList educators={board.data.educators} />
          {board.data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                <ChevronLeft className="size-4" /> Previous
              </Button>
              <span className="text-sm text-zinc-500">
                Page {page} of {board.data.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= board.data.totalPages}
                onClick={() => update({ page: String(page + 1) })}
              >
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <VerifiedNote />
      </div>
    </div>
  );
}
