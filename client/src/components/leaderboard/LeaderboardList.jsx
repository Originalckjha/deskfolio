import { Link } from 'react-router-dom';
import { BadgeCheck, Medal } from 'lucide-react';
import { Avatar, Badge, cx } from '../ui/index.jsx';
import { Stars } from '../ui/StarRating.jsx';

const medal = ['text-amber-500', 'text-zinc-400', 'text-orange-700'];

function RankCell({ rank, rated }) {
  if (!rated) return <span className="text-sm text-zinc-400">–</span>;
  if (rank <= 3) return <Medal className={cx('size-5', medal[rank - 1])} aria-label={`Rank ${rank}`} />;
  return <span className="text-sm font-medium tabular-nums text-zinc-500">{rank}</span>;
}

/** Responsive leaderboard: a table on desktop, cards on phones. */
export default function LeaderboardList({ educators }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/60 text-xs font-medium tracking-wide text-zinc-500 uppercase">
            <tr>
              <th className="w-16 px-4 py-3">Rank</th>
              <th className="px-4 py-3">Educator</th>
              <th className="px-4 py-3">Subjects</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3 text-right" title="Bayesian weighted score">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {educators.map((e) => {
              const rated = e.totalReviews > 0;
              return (
                <tr key={e.slug} className="group transition-colors hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <RankCell rank={e.rank} rated={rated} />
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/e/${e.slug}`} className="flex items-center gap-3">
                      <Avatar name={e.displayName} src={e.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 group-hover:text-indigo-700">{e.displayName}</p>
                        {e.bio && <p className="max-w-xs truncate text-xs text-zinc-500">{e.bio}</p>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {e.subjects.slice(0, 3).map((s) => (
                        <Badge key={s} className="capitalize">{s}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {rated ? (
                      <div className="flex items-center gap-2">
                        <Stars value={e.avgRating} size={14} showValue />
                        <span className="text-xs text-zinc-500">({e.totalReviews})</span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">No reviews yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-900">
                    {rated ? e.rankingScore.toFixed(2) : '–'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 md:hidden">
        {educators.map((e) => {
          const rated = e.totalReviews > 0;
          return (
            <li key={e.slug}>
              <Link
                to={`/e/${e.slug}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm active:bg-zinc-50"
              >
                <div className="flex w-6 justify-center">
                  <RankCell rank={e.rank} rated={rated} />
                </div>
                <Avatar name={e.displayName} src={e.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.displayName}</p>
                  <p className="truncate text-xs text-zinc-500 capitalize">{e.subjects.join(' · ')}</p>
                  {rated && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <Stars value={e.avgRating} size={12} />
                      <span className="text-xs text-zinc-500">{e.avgRating.toFixed(1)} ({e.totalReviews})</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold tabular-nums">{rated ? e.rankingScore.toFixed(2) : '–'}</p>
                  <p className="text-[10px] tracking-wide text-zinc-400 uppercase">score</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function VerifiedNote() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-zinc-500">
      <BadgeCheck className="size-4 text-emerald-600" />
      Only students enrolled in an educator's space can rate them. Scores use a Bayesian average, so a few
      reviews can't game the ranking.
    </p>
  );
}
