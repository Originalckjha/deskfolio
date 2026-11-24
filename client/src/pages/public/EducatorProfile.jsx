import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, BookOpen, CalendarDays, MessageSquareText, Trophy, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { educatorsApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, PageSpinner, Textarea } from '../../components/ui/index.jsx';
import { StarInput, Stars } from '../../components/ui/StarRating.jsx';
import { LockerItemRow } from '../../components/locker/LockerItemRow.jsx';
import { formatDate } from '../../utils/format.js';
import NotFound from './NotFound.jsx';

function RateBox({ educator, viewer, onRated }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(viewer?.myRating?.rating ?? 0);
  const [reviewText, setReviewText] = useState(viewer?.myRating?.reviewText ?? '');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <Card className="p-5 text-sm text-zinc-600">
        <Link to="/login" className="font-medium text-indigo-600 hover:underline">Log in as a student</Link> to rate{' '}
        {educator.fullName.split(' ')[0]}.
      </Card>
    );
  }
  if (user.role !== 'STUDENT') return null;
  if (!viewer?.canRate) {
    return (
      <Card className="p-5 text-sm text-zinc-600">
        Join one of {educator.fullName.split(' ')[0]}'s spaces to leave a verified rating.
      </Card>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return toast.error('Pick a star rating first');
    setSaving(true);
    try {
      const res = await educatorsApi.rate(educator.educatorId, { rating, reviewText });
      toast.success(res.created ? 'Thanks for your rating!' : 'Rating updated');
      onRated();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <h2 className="font-semibold">{viewer.myRating ? 'Your rating' : `Rate ${educator.fullName.split(' ')[0]}`}</h2>
          <p className="text-xs text-zinc-500">You're enrolled, so your review will show as verified.</p>
        </div>
        <StarInput value={rating} onChange={setRating} />
        <Textarea
          rows={3}
          maxLength={1000}
          placeholder="What makes their classes helpful? (optional)"
          aria-label="Review"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
        />
        <Button type="submit" loading={saving}>
          {viewer.myRating ? 'Update rating' : 'Submit rating'}
        </Button>
      </form>
    </Card>
  );
}

export default function EducatorProfile() {
  const { slug } = useParams();
  const { user } = useAuth();
  const profile = useFetch(() => educatorsApi.profile(slug), [slug, user?.id]);

  if (profile.loading && !profile.data) return <PageSpinner />;
  if (profile.error?.response?.status === 404) return <NotFound what="educator" />;
  if (profile.error) return <ErrorState error={profile.error} onRetry={profile.reload} />;

  const { educator, spaces, publicNotes, reviews, viewer } = profile.data;
  const rated = educator.totalReviews > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar name={educator.fullName} src={educator.avatarUrl} size="xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{educator.fullName}</h1>
                {educator.rank && (
                  <Badge tone="amber">
                    <Trophy className="size-3" /> #{educator.rank}
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {educator.subjects.map((s) => (
                  <Badge key={s} tone="indigo" className="capitalize">{s}</Badge>
                ))}
              </div>
              {educator.bio && <p className="mt-4 text-sm leading-relaxed text-pretty text-zinc-600">{educator.bio}</p>}
              <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400">
                <CalendarDays className="size-3.5" /> On DeskFolio since {formatDate(educator.memberSince)}
              </p>
            </div>
          </div>
        </Card>

        <section>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <BookOpen className="size-4 text-zinc-500" /> Public notes
          </h2>
          {publicNotes.length ? (
            <Card className="divide-y divide-zinc-100">
              {publicNotes.map((item) => (
                <LockerItemRow key={item._id} item={item} />
              ))}
            </Card>
          ) : (
            <EmptyState icon={BookOpen} title="No public notes yet" />
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <MessageSquareText className="size-4 text-zinc-500" /> Student reviews
          </h2>
          {reviews.length ? (
            <div className="space-y-3">
              {reviews.map((r) => (
                <Card key={r._id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={r.student.name} size="sm" />
                      <div>
                        <p className="text-sm font-medium">{r.student.name}</p>
                        <p className="flex items-center gap-1 text-xs text-emerald-700">
                          <BadgeCheck className="size-3.5" /> Verified student
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Stars value={r.rating} size={14} />
                      <p className="text-xs text-zinc-400">{formatDate(r.updatedAt)}</p>
                    </div>
                  </div>
                  {r.reviewText && <p className="mt-3 text-sm leading-relaxed text-zinc-700">{r.reviewText}</p>}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={MessageSquareText} title="No reviews yet">
              Reviews come only from students enrolled in this educator's spaces.
            </EmptyState>
          )}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card className="p-5">
          {rated ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold tabular-nums">{educator.avgRating.toFixed(1)}</span>
                <span className="text-sm text-zinc-500">/ 5</span>
              </div>
              <Stars value={educator.avgRating} size={18} className="mt-1" />
              <p className="mt-1 text-sm text-zinc-500">
                {educator.totalReviews} verified review{educator.totalReviews === 1 ? '' : 's'}
              </p>
              <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
                Ranking score <span className="font-semibold text-zinc-900">{educator.rankingScore.toFixed(2)}</span>{' '}
                (Bayesian average that balances rating and number of reviews)
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-500">No ratings yet.</p>
          )}
        </Card>

        <RateBox educator={educator} viewer={viewer} onRated={profile.reload} />

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4 text-zinc-500" /> Public spaces
          </h2>
          {spaces.length ? (
            <ul className="space-y-1">
              {spaces.map((s) => (
                <li key={s._id}>
                  <Link to={`/spaces/${s._id}`} className="-mx-2 flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50">
                    <span className="truncate font-medium">{s.title}</span>
                    <span className="text-xs text-zinc-400 capitalize">{s.subject}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No public spaces.</p>
          )}
        </Card>
      </aside>
    </div>
  );
}
