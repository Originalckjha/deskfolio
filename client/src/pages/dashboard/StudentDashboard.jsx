import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, KeyRound, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { sessionsApi, spacesApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Avatar, Button, Card, EmptyState, ErrorState, Input, PageHeader, PageSpinner } from '../../components/ui/index.jsx';
import { NextClassBanner } from '../../components/sessions/NextClassBanner.jsx';
import { formatDate } from '../../utils/format.js';

function JoinForm({ onJoined }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await spacesApi.join(code.trim());
      toast.success(res.alreadyEnrolled ? `You're already in ${res.space.title}` : `Joined ${res.space.title}`);
      setCode('');
      onJoined(res.space);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5">
      <form onSubmit={submit}>
        <label htmlFor="join-code" className="flex items-center gap-2 font-semibold">
          <KeyRound className="size-4 text-indigo-600" /> Join a space
        </label>
        <p className="mt-0.5 text-sm text-zinc-500">Enter the code your educator shared.</p>
        <div className="mt-3 flex gap-2">
          <Input
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            placeholder="e.g. PHYS12A"
            autoComplete="off"
            autoCapitalize="characters"
            className="font-mono tracking-widest uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case"
          />
          <Button type="submit" loading={loading} disabled={code.length < 6}>
            Join
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Finds the soonest live/upcoming class across all enrolled spaces. */
async function loadNextClass(spaces) {
  const results = await Promise.allSettled(spaces.slice(0, 12).map((s) => sessionsApi.history(s._id)));
  const candidates = results
    .map((r, i) => (r.status === 'fulfilled' && r.value.nextUp ? { ...r.value.nextUp, space: spaces[i] } : null))
    .filter(Boolean);
  // A live class wins; otherwise the soonest upcoming one.
  candidates.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  return candidates.find((c) => c.status === 'LIVE') ?? candidates[0] ?? null;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const spaces = useFetch(() => spacesApi.mine(), []);
  const next = useFetch(
    () => (spaces.data?.spaces.length ? loadNextClass(spaces.data.spaces) : Promise.resolve(null)),
    [spaces.data],
  );

  return (
    <div>
      <PageHeader title={`Hi, ${user.fullName.split(' ')[0]}`} subtitle="Your classes, notes and catch-up in one place." />

      {next.data && <NextClassBanner session={next.data} space={next.data.space} className="mb-6" />}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="order-2 lg:order-1">
          <h2 className="mb-3 font-semibold">My spaces</h2>
          {spaces.loading ? (
            <PageSpinner />
          ) : spaces.error ? (
            <ErrorState error={spaces.error} onRetry={spaces.reload} />
          ) : spaces.data.spaces.length === 0 ? (
            <EmptyState icon={BookOpen} title="No spaces yet">
              Ask your educator for a join code and enter it here.
            </EmptyState>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {spaces.data.spaces.map((s) => (
                <Card key={s._id} className="flex flex-col p-5">
                  <Link to={`/spaces/${s._id}`} className="font-semibold hover:text-indigo-700">{s.title}</Link>
                  <p className="text-sm text-zinc-500 capitalize">{s.subject}</p>
                  {s.educator && (
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <Link to={s.educator.slug ? `/e/${s.educator.slug}` : '#'} className="flex min-w-0 items-center gap-2 text-sm hover:text-indigo-700">
                        <Avatar name={s.educator.fullName} size="sm" />
                        <span className="truncate">{s.educator.fullName}</span>
                      </Link>
                      {s.educator.slug && (
                        <Button as={Link} to={`/e/${s.educator.slug}`} variant="ghost" size="xs">
                          <Star className="size-3.5" /> Rate
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
                    <span className="text-xs text-zinc-400">Joined {formatDate(s.joinedAt)}</span>
                    <Button as={Link} to={`/spaces/${s._id}`} variant="secondary" size="sm">
                      Open <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <aside className="order-1 lg:order-2">
          <JoinForm
            onJoined={(space) => {
              spaces.reload();
              navigate(`/spaces/${space._id}`);
            }}
          />
        </aside>
      </div>
    </div>
  );
}
