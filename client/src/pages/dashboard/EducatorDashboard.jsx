import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Globe, Lock, MessageSquareText, Plus, Star, TrendingUp, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { spacesApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Badge, Button, Card, CopyButton, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageSpinner,
} from '../../components/ui/index.jsx';

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
        <Icon className="size-4" /> {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>}
    </Card>
  );
}

function CreateSpaceModal({ open, onClose, onCreated, defaultSubject }) {
  const [form, setForm] = useState({ title: '', subject: defaultSubject ?? '', isPublic: true });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { space } = await spacesApi.create(form);
      toast.success(`Space created. Join code: ${space.joinCode}`);
      onCreated(space);
      setForm({ title: '', subject: defaultSubject ?? '', isPublic: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New space"
      description="A space holds one class or batch: its notes, links and schedule."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="create-space" loading={saving}>Create space</Button>
        </>
      }
    >
      <form id="create-space" onSubmit={submit} className="space-y-4">
        <Field label="Title">
          {(id) => (
            <Input id={id} required autoFocus placeholder="Physics – Class 12 (2026 batch)" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          )}
        </Field>
        <Field label="Subject">
          {(id) => (
            <Input id={id} required placeholder="Physics" value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          )}
        </Field>
        <label className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3">
          <input type="checkbox" className="mt-0.5 size-4 accent-indigo-600" checked={form.isPublic}
            onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
          <span>
            <span className="block text-sm font-medium">Show on my public profile</span>
            <span className="text-xs text-zinc-500">
              Visitors can browse its Public notes. Students still need the join code to enroll.
            </span>
          </span>
        </label>
      </form>
    </Modal>
  );
}

export default function EducatorDashboard() {
  const { user, educatorProfile, refresh } = useAuth();
  const navigate = useNavigate();
  const spaces = useFetch(() => spacesApi.mine(), []);
  const [creating, setCreating] = useState(false);

  // Pick up rating changes since login.
  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const p = educatorProfile;
  const totalStudents = spaces.data?.spaces.reduce((n, s) => n + s.studentCount, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title={`Hi, ${user.fullName.split(' ')[0]}`}
        subtitle="Manage your spaces, notes and classes."
        actions={
          <>
            {p?.slug && (
              <Button as={Link} to={`/e/${p.slug}`} variant="secondary">
                Public profile <ArrowUpRight className="size-4" />
              </Button>
            )}
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> New space
            </Button>
          </>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Star} label="Average rating" value={p?.totalReviews ? p.avgRating.toFixed(1) : '–'} hint="out of 5" />
        <StatCard icon={MessageSquareText} label="Verified reviews" value={p?.totalReviews ?? 0} />
        <StatCard icon={TrendingUp} label="Ranking score" value={p?.totalReviews ? p.rankingScore.toFixed(2) : '–'} hint="Bayesian weighted" />
        <StatCard icon={Users} label="Students" value={totalStudents} hint={`across ${spaces.data?.spaces.length ?? 0} spaces`} />
      </div>

      <h2 className="mb-3 font-semibold">Your spaces</h2>
      {spaces.loading ? (
        <PageSpinner />
      ) : spaces.error ? (
        <ErrorState error={spaces.error} onRetry={spaces.reload} />
      ) : spaces.data.spaces.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Create your first space"
          action={<Button onClick={() => setCreating(true)}><Plus className="size-4" /> New space</Button>}
        >
          Each space gets a join code to share with students. Then add notes and schedule classes.
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.data.spaces.map((s) => (
            <Card key={s._id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/spaces/${s._id}`} className="block truncate font-semibold hover:text-indigo-700">{s.title}</Link>
                  <p className="text-sm text-zinc-500 capitalize">{s.subject}</p>
                </div>
                {s.isPublic ? (
                  <Badge tone="green"><Globe className="size-3" /> Public</Badge>
                ) : (
                  <Badge><Lock className="size-3" /> Private</Badge>
                )}
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-sm text-zinc-600">
                <Users className="size-4 text-zinc-400" /> {s.studentCount} student{s.studentCount === 1 ? '' : 's'}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-zinc-50 p-2 pl-3">
                <div>
                  <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">Join code</p>
                  <p className="font-mono text-base font-semibold tracking-widest">{s.joinCode}</p>
                </div>
                <CopyButton text={s.joinCode} />
              </div>
              <Button as={Link} to={`/spaces/${s._id}`} variant="secondary" className="mt-3">
                Open space
              </Button>
            </Card>
          ))}
        </div>
      )}

      <CreateSpaceModal
        open={creating}
        onClose={() => setCreating(false)}
        defaultSubject={p?.subjects?.[0]}
        onCreated={(space) => {
          setCreating(false);
          navigate(`/spaces/${space._id}`);
        }}
      />
    </div>
  );
}
