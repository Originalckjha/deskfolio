import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, FolderLock, Globe, Lock, Users } from 'lucide-react';
import { spacesApi } from '../../api/endpoints.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useAuth, dashboardPathFor } from '../../context/AuthContext.jsx';
import { Avatar, Badge, Card, CopyButton, ErrorState, PageSpinner, Tabs } from '../../components/ui/index.jsx';
import { Stars } from '../../components/ui/StarRating.jsx';
import LockerView from '../../components/locker/LockerView.jsx';
import ClassesView from '../../components/sessions/ClassesView.jsx';
import NotFound from '../public/NotFound.jsx';

export default function SpacePage() {
  const { spaceId } = useParams();
  const { user, status } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'classes' ? 'classes' : 'locker';
  const res = useFetch(() => spacesApi.get(spaceId), [spaceId, user?.id]);

  if (status === 'loading' || (res.loading && !res.data)) return <PageSpinner />;
  if (res.error?.response?.status === 404 || res.error?.response?.status === 400) return <NotFound what="space" />;
  if (res.error) return <ErrorState error={res.error} onRetry={res.reload} />;

  const { space, educator, access, studentCount } = res.data;
  const isOwner = access.isOwner;
  const isMember = isOwner || access.isEnrolled || access.isAdmin;

  return (
    <div>
      {user && (
        <Link to={dashboardPathFor(user)} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
      )}

      <Card className="mb-6 p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="indigo" className="capitalize">{space.subject}</Badge>
              {space.isPublic ? (
                <Badge tone="green"><Globe className="size-3" /> Public</Badge>
              ) : (
                <Badge><Lock className="size-3" /> Private</Badge>
              )}
              {access.isEnrolled && <Badge tone="sky">Enrolled</Badge>}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{space.title}</h1>
            {educator && (
              <Link to={`/e/${educator.slug}`} className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-indigo-700">
                <Avatar name={educator.displayName} size="sm" />
                <span>
                  <span className="block font-medium text-zinc-900">{educator.displayName}</span>
                  {educator.totalReviews > 0 && (
                    <span className="flex items-center gap-1 text-xs">
                      <Stars value={educator.avgRating} size={11} /> {educator.avgRating.toFixed(1)} ({educator.totalReviews})
                    </span>
                  )}
                </span>
              </Link>
            )}
          </div>

          {isOwner && (
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col md:items-end">
              <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-2 pl-3">
                <div>
                  <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">Join code</p>
                  <p className="font-mono text-lg font-semibold tracking-widest">{space.joinCode}</p>
                </div>
                <CopyButton text={space.joinCode} />
              </div>
              <p className="flex items-center gap-1.5 text-sm text-zinc-500">
                <Users className="size-4" /> {studentCount} student{studentCount === 1 ? '' : 's'} enrolled
              </p>
            </div>
          )}
        </div>
      </Card>

      {!user && (
        <p className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
          You're seeing this space's public notes.{' '}
          <Link to={`/login?next=/spaces/${spaceId}`} className="font-medium underline">Log in</Link> and join with the code to see everything.
        </p>
      )}

      <Tabs
        className="mb-5"
        value={tab}
        onChange={(t) => setParams(t === 'locker' ? {} : { tab: t }, { replace: true })}
        tabs={[
          { value: 'locker', label: 'Notes Locker', icon: FolderLock },
          { value: 'classes', label: 'Classes', icon: CalendarClock },
        ]}
      />

      {tab === 'locker' ? (
        <LockerView spaceId={spaceId} isOwner={isOwner} />
      ) : (
        <ClassesView spaceId={spaceId} isOwner={isOwner} canView={isMember} />
      )}
    </div>
  );
}
