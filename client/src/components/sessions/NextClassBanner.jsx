import { Link } from 'react-router-dom';
import { CalendarClock, Radio, Video } from 'lucide-react';
import { Button, cx } from '../ui/index.jsx';
import { formatDateTime, formatRelative } from '../../utils/format.js';

/** Prominent "next class" banner; turns red-dot LIVE when the class is on. */
export function NextClassBanner({ session, space, className }) {
  const live = session.status === 'LIVE';
  return (
    <div
      className={cx(
        'flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between',
        live ? 'bg-zinc-900 text-white' : 'border border-indigo-100 bg-indigo-50/70',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cx('mt-0.5 rounded-lg p-2', live ? 'bg-red-500/20 text-red-400' : 'bg-white text-indigo-600 shadow-sm')}>
          {live ? <Radio className="size-5 animate-pulse" /> : <CalendarClock className="size-5" />}
        </span>
        <div>
          <p className={cx('text-xs font-semibold tracking-wide uppercase', live ? 'text-red-400' : 'text-indigo-600')}>
            {live ? 'Live now' : `Next class · ${formatRelative(session.scheduledAt)}`}
          </p>
          <p className="mt-0.5 font-semibold">{session.title}</p>
          <p className={cx('text-sm', live ? 'text-zinc-300' : 'text-zinc-600')}>
            {space && (
              <>
                <Link to={`/spaces/${space._id}?tab=classes`} className="hover:underline">{space.title}</Link>
                {' · '}
              </>
            )}
            {formatDateTime(session.scheduledAt)}
          </p>
        </div>
      </div>
      {session.meetingUrl && (
        <Button
          as="a"
          href={session.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant={live ? 'primary' : 'dark'}
          className={live ? '!bg-red-500 hover:!bg-red-400' : ''}
        >
          <Video className="size-4" /> {live ? 'Join now' : 'Meeting link'}
        </Button>
      )}
    </div>
  );
}
