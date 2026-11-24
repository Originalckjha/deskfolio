import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, CalendarClock, FolderLock, Trophy } from 'lucide-react';
import { educatorsApi } from '../../api/endpoints.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useAuth, dashboardPathFor } from '../../context/AuthContext.jsx';
import { Button, Card, Spinner } from '../../components/ui/index.jsx';
import LeaderboardList from '../../components/leaderboard/LeaderboardList.jsx';

const features = [
  {
    icon: FolderLock,
    title: 'Notes Locker',
    body: 'Markdown notes, PDFs, slides and links in folders. Choose who sees each one: everyone, enrolled students, or only you.',
  },
  {
    icon: CalendarClock,
    title: 'Class links & history',
    body: 'Schedule classes with a meeting link. Past classes stay in order with recordings and notes, so late joiners catch up fast.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified ratings',
    body: 'Only enrolled students can rate. A Bayesian score keeps the leaderboard fair for new and established educators.',
  },
];

export default function Landing() {
  const { user } = useAuth();
  const top = useFetch(() => educatorsApi.leaderboard({ limit: 5 }), []);

  return (
    <div className="space-y-20">
      <section className="pt-6 text-center sm:pt-12">
        <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
          <span className="size-1.5 rounded-full bg-emerald-500" /> For educators and their students
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-6xl">
          Your teaching desk, <span className="text-indigo-600">organized</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-zinc-600 sm:text-lg">
          Share notes, run classes and keep every recording in one place. Students join with a code and always know
          what's next.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {user ? (
            <Button as={Link} to={dashboardPathFor(user)} size="lg">
              Go to dashboard <ArrowRight className="size-4" />
            </Button>
          ) : (
            <>
              <Button as={Link} to="/register?role=EDUCATOR" size="lg">
                I'm an educator <ArrowRight className="size-4" />
              </Button>
              <Button as={Link} to="/register?role=STUDENT" size="lg" variant="secondary">
                I have a join code
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-6">
            <div className="mb-4 inline-flex rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Icon className="size-5" />
            </div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
          </Card>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <Trophy className="size-5 text-amber-500" /> Top educators
            </h2>
            <p className="mt-1 text-sm text-zinc-500">Ranked by verified student ratings.</p>
          </div>
          <Button as={Link} to="/leaderboard" variant="ghost" size="sm">
            Full leaderboard <ArrowRight className="size-4" />
          </Button>
        </div>
        {top.loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : top.data?.educators?.length ? (
          <LeaderboardList educators={top.data.educators} />
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-500">
            {top.error ? "The leaderboard couldn't be loaded right now." : 'No educators yet. Be the first!'}
          </p>
        )}
      </section>
    </div>
  );
}
