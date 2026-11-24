import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, History, NotebookText, PlayCircle, Radio, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { lockerApi, sessionsApi } from '../../api/endpoints.js';
import { errorMessage } from '../../api/client.js';
import { useFetch } from '../../hooks/useFetch.js';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageSpinner, Select } from '../ui/index.jsx';
import { NextClassBanner } from './NextClassBanner.jsx';
import { formatDateTime, formatRelative, toLocalInputValue } from '../../utils/format.js';

function SessionModal({ open, onClose, spaceId, session, onSaved }) {
  const editing = Boolean(session);
  const notes = useFetch(() => (open ? lockerApi.list(spaceId) : Promise.resolve(null)), [open, spaceId]);
  const defaultTime = () => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    d.setMinutes(0, 0, 0);
    return toLocalInputValue(d);
  };
  const [form, setForm] = useState(() => ({
    title: session?.title ?? '',
    scheduledAt: session ? toLocalInputValue(session.scheduledAt) : defaultTime(),
    meetingUrl: session?.meetingUrl ?? '',
    recordingUrl: session?.recordingUrl ?? '',
    linkedNoteId: session?.linkedNoteId ?? '',
  }));
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const noteOptions = notes.data?.folders.flatMap((f) => f.items.map((i) => ({ ...i, folder: f.folderName }))) ?? [];

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      title: form.title,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      meetingUrl: form.meetingUrl.trim(),
      recordingUrl: form.recordingUrl.trim(),
      linkedNoteId: form.linkedNoteId || null,
    };
    try {
      if (editing) await sessionsApi.update(session._id, body);
      else await sessionsApi.create(spaceId, body);
      toast.success(editing ? 'Class updated' : 'Class scheduled');
      onSaved();
      onClose();
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
      title={editing ? 'Edit class' : 'Schedule a class'}
      description={editing ? 'Add the recording after class so students can catch up.' : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="session-form" loading={saving}>{editing ? 'Save' : 'Schedule'}</Button>
        </>
      }
    >
      <form id="session-form" onSubmit={submit} className="space-y-4">
        <Field label="Title">
          {(id) => <Input id={id} required minLength={2} value={form.title} onChange={set('title')} placeholder="Lecture 5: Work & Energy" />}
        </Field>
        <Field label="Date & time">
          {(id) => <Input id={id} type="datetime-local" required value={form.scheduledAt} onChange={set('scheduledAt')} />}
        </Field>
        <Field label="Meeting link" hint="Zoom, Google Meet, Teams...">
          {(id) => <Input id={id} type="url" value={form.meetingUrl} onChange={set('meetingUrl')} placeholder="https://meet.google.com/..." />}
        </Field>
        <Field label="Recording link" hint="Add after class">
          {(id) => <Input id={id} type="url" value={form.recordingUrl} onChange={set('recordingUrl')} placeholder="https://youtu.be/..." />}
        </Field>
        <Field label="Linked note">
          {(id) => (
            <Select id={id} value={form.linkedNoteId} onChange={set('linkedNoteId')}>
              <option value="">None</option>
              {noteOptions.map((n) => (
                <option key={n._id} value={n._id}>{n.folder} / {n.title}</option>
              ))}
            </Select>
          )}
        </Field>
      </form>
    </Modal>
  );
}

function SessionRow({ s, isOwner, onEdit, upcoming }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{s.title}</p>
          {s.status === 'LIVE' && <Badge tone="red"><Radio className="size-3" /> Live</Badge>}
        </div>
        <p className="text-sm text-zinc-500">
          {formatDateTime(s.scheduledAt)}
          {upcoming && <span className="text-zinc-400"> · {formatRelative(s.scheduledAt)}</span>}
        </p>
        {s.linkedNote && (
          <Link to={`/read/${s.linkedNote._id}`} className="mt-1 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
            <NotebookText className="size-3.5" /> {s.linkedNote.title}
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {upcoming && s.meetingUrl && (
          <Button as="a" href={s.meetingUrl} target="_blank" rel="noopener noreferrer" size="sm" variant={s.status === 'LIVE' ? 'primary' : 'secondary'}>
            <Video className="size-4" /> Join
          </Button>
        )}
        {!upcoming && (s.recordingUrl ? (
          <Button as="a" href={s.recordingUrl} target="_blank" rel="noopener noreferrer" size="sm" variant="secondary">
            <PlayCircle className="size-4" /> Recording
          </Button>
        ) : (
          <span className="self-center text-xs text-zinc-400">No recording yet</span>
        ))}
        {isOwner && (
          <Button size="sm" variant="ghost" onClick={() => onEdit(s)}>Edit</Button>
        )}
      </div>
    </div>
  );
}

/** Upcoming/live classes plus the chronological Catch-Up history for one space. */
export default function ClassesView({ spaceId, isOwner, canView }) {
  const history = useFetch(() => (canView ? sessionsApi.history(spaceId) : Promise.resolve(null)), [spaceId, canView]);
  const [modal, setModal] = useState(null); // null | 'new' | session

  if (!canView) {
    return (
      <EmptyState icon={History} title="Classes are for enrolled students">
        Ask the educator for the join code, then enter it on your dashboard to see class links and recordings.
      </EmptyState>
    );
  }
  if (history.loading && !history.data) return <PageSpinner />;
  if (history.error) return <ErrorState error={history.error} onRetry={history.reload} />;

  const { live, upcoming, past, nextUp } = history.data;
  const ahead = [...live, ...upcoming];

  return (
    <div className="space-y-6">
      {isOwner && (
        <div className="flex justify-end">
          <Button onClick={() => setModal('new')}><CalendarPlus className="size-4" /> Schedule class</Button>
        </div>
      )}

      {nextUp && !isOwner && <NextClassBanner session={nextUp} />}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-zinc-700">Coming up</h3>
        {ahead.length ? (
          <Card className="divide-y divide-zinc-100">
            {ahead.map((s) => <SessionRow key={s._id} s={s} upcoming isOwner={isOwner} onEdit={setModal} />)}
          </Card>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
            No classes scheduled.
          </p>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-700">
            <History className="size-4" /> Catch-up: past classes
          </h3>
          <span className="text-xs text-zinc-400">oldest first</span>
        </div>
        {past.length ? (
          <ol className="relative space-y-3 border-l border-zinc-200 pl-5">
            {past.map((s) => (
              <li key={s._id} className="relative">
                <span aria-hidden className="absolute top-5 -left-[26px] size-3 rounded-full border-2 border-white bg-indigo-500 ring-1 ring-indigo-200" />
                <Card>
                  <SessionRow s={s} isOwner={isOwner} onEdit={setModal} />
                </Card>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
            Past classes, recordings and their notes will collect here.
          </p>
        )}
      </section>

      {modal && (
        <SessionModal
          open
          key={modal === 'new' ? 'new' : modal._id}
          spaceId={spaceId}
          session={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={history.reload}
        />
      )}
    </div>
  );
}
