import { ClassSession, SESSION_STATUS } from '../models/ClassSession.js';
import { LockerItem } from '../models/LockerItem.js';
import { ApiError } from '../utils/ApiError.js';
import { requireSpaceOwner, requireSpaceMember, allowedVisibilities } from '../services/access.js';

// A class counts as LIVE from its start time for this long, unless the educator
// marks it COMPLETED (or LIVE) explicitly.
export const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000;

export function effectiveStatus(session, now = Date.now()) {
  if (session.status === SESSION_STATUS.COMPLETED) return SESSION_STATUS.COMPLETED;
  const start = new Date(session.scheduledAt).getTime();
  if (session.status === SESSION_STATUS.LIVE) {
    return now < start + LIVE_WINDOW_MS ? SESSION_STATUS.LIVE : SESSION_STATUS.COMPLETED;
  }
  if (now < start) return SESSION_STATUS.UPCOMING;
  return now < start + LIVE_WINDOW_MS ? SESSION_STATUS.LIVE : SESSION_STATUS.COMPLETED;
}

async function assertNoteInSpace(linkedNoteId, spaceId) {
  if (linkedNoteId && !(await LockerItem.exists({ _id: linkedNoteId, spaceId }))) {
    throw ApiError.badRequest('linkedNoteId must be a locker item in this space');
  }
}

// POST /spaces/:spaceId/sessions  (EDUCATOR owner)
export async function createSession(req, res) {
  const space = await requireSpaceOwner(req.valid.params.spaceId, req.user);
  const body = req.valid.body;
  await assertNoteInSpace(body.linkedNoteId, space._id);

  const session = await ClassSession.create({ ...body, spaceId: space._id });
  res.status(201).json({ success: true, session });
}

// PATCH /sessions/:id  (EDUCATOR owner): e.g. add the recording link after class
export async function updateSession(req, res) {
  const session = await ClassSession.findById(req.valid.params.id);
  if (!session) throw ApiError.notFound('Class session not found');
  await requireSpaceOwner(session.spaceId, req.user);

  const body = { ...req.valid.body };
  await assertNoteInSpace(body.linkedNoteId, session.spaceId);
  for (const key of ['meetingUrl', 'recordingUrl']) {
    if (body[key] === '') body[key] = undefined; // '' clears the link
  }
  session.set(body);
  await session.save();
  res.json({ success: true, session });
}

// GET /spaces/:spaceId/history  (owner or enrolled)
// → { live, upcoming, past } with past in chronological order for catch-up.
export async function getHistory(req, res) {
  const access = await requireSpaceMember(req.valid.params.spaceId, req.user);
  const visible = new Set(allowedVisibilities(access));

  const sessions = await ClassSession.find({ spaceId: access.space._id })
    .sort({ scheduledAt: 1 })
    .limit(1000)
    .populate('linkedNoteId', 'title itemType folderName visibility fileUrl')
    .lean();

  const now = Date.now();
  const buckets = { live: [], upcoming: [], past: [] };

  for (const s of sessions) {
    const status = effectiveStatus(s, now);
    // A PRIVATE note linked to a class stays hidden from students.
    const note = s.linkedNoteId && visible.has(s.linkedNoteId.visibility) ? s.linkedNoteId : null;
    const entry = { ...s, status, linkedNote: note, linkedNoteId: note?._id ?? null };
    const bucket =
      status === SESSION_STATUS.LIVE ? 'live' : status === SESSION_STATUS.UPCOMING ? 'upcoming' : 'past';
    buckets[bucket].push(entry);
  }

  res.json({ success: true, ...buckets, nextUp: buckets.live[0] ?? buckets.upcoming[0] ?? null });
}
