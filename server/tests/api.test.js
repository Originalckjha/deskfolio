import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Cloudinary is replaced with a fake so tests never touch the network.
vi.mock('../src/services/storage.js', () => ({
  uploadBuffer: vi.fn(async (_buf, { folder, ext }) => ({
    url: `https://res.cloudinary.com/demo/raw/upload/deskfolio/${folder}/file.${ext}`,
    publicId: `deskfolio/${folder}/file.${ext}`,
    bytes: 10,
  })),
  deleteAsset: vi.fn(async () => {}),
}));

const { default: app } = await import('../src/app.js');
const models = await import('../src/models/index.js');
const { bayesianScore } = await import('../src/services/ranking.js');
const { deleteAsset } = await import('../src/services/storage.js');

let mongod;
const api = () => request(app);
const bearer = (t) => ({ Authorization: `Bearer ${t}` });

async function register(body) {
  const res = await api().post('/api/v1/auth/register').send({ password: 'password123', ...body });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all(Object.values(models).filter((m) => m?.init).map((m) => m.init()));
}, 300_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

// Shared state across the ordered scenario below.
const s = {};

describe('health', () => {
  it('reports db up', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe('up');
  });
});

describe('auth', () => {
  it('registers an educator with a profile and slug', async () => {
    const r = await register({
      fullName: 'Rahul Sharma', email: 'rahul@x.com', role: 'EDUCATOR', subjects: ['Physics'],
    });
    expect(r.user.passwordHash).toBeUndefined();
    expect(r.educatorProfile.slug).toBe('rahul-sharma-physics');
    s.edu = r;
  });

  it('gives a second educator with the same name a distinct slug', async () => {
    const r = await register({
      fullName: 'Rahul Sharma', email: 'rahul2@x.com', role: 'EDUCATOR', subjects: ['physics', 'maths'],
    });
    expect(r.educatorProfile.slug).toBe('rahul-sharma-physics-2');
    s.edu2 = r;
  });

  it('registers students', async () => {
    s.stu = await register({ fullName: 'Priya Verma', email: 'priya@x.com' });
    s.outsider = await register({ fullName: 'Out Sider', email: 'out@x.com' });
    expect(s.stu.user.role).toBe('STUDENT');
  });

  it('refuses self-registered admins and duplicate emails', async () => {
    const admin = await api().post('/api/v1/auth/register')
      .send({ fullName: 'Evil', email: 'e@x.com', password: 'password123', role: 'ADMIN' });
    expect(admin.status).toBe(400);
    const dup = await api().post('/api/v1/auth/register')
      .send({ fullName: 'Dup', email: 'PRIYA@x.com', password: 'password123' });
    expect(dup.status).toBe(409);
  });

  it('logs in, rejects bad passwords with the same message as unknown emails', async () => {
    const ok = await api().post('/api/v1/auth/login').send({ email: 'Rahul@X.com', password: 'password123' });
    expect(ok.status).toBe(200);
    expect(ok.body.educatorProfile.slug).toBe('rahul-sharma-physics');
    const bad = await api().post('/api/v1/auth/login').send({ email: 'rahul@x.com', password: 'nope-nope' });
    const unknown = await api().post('/api/v1/auth/login').send({ email: 'who@x.com', password: 'nope-nope' });
    expect(bad.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(bad.body.message).toBe(unknown.body.message);
  });

  it('GET /auth/me', async () => {
    const res = await api().get('/api/v1/auth/me').set(bearer(s.stu.token));
    expect(res.body.user.email).toBe('priya@x.com');
  });
});

describe('spaces', () => {
  it('only educators create spaces', async () => {
    const no = await api().post('/api/v1/spaces').set(bearer(s.stu.token)).send({ title: 'X', subject: 'y' });
    expect(no.status).toBe(403);
    const res = await api().post('/api/v1/spaces').set(bearer(s.edu.token))
      .send({ title: 'Physics Class 12', subject: 'Physics' });
    expect(res.status).toBe(201);
    expect(res.body.space.joinCode).toMatch(/^[A-Z0-9]{7}$/);
    s.space = res.body.space;
    const priv = await api().post('/api/v1/spaces').set(bearer(s.edu.token))
      .send({ title: 'Private batch', subject: 'physics', isPublic: false });
    s.privateSpace = priv.body.space;
  });

  it('students join by code (case-insensitive), idempotently', async () => {
    const res = await api().post('/api/v1/spaces/join').set(bearer(s.stu.token))
      .send({ joinCode: s.space.joinCode.toLowerCase() });
    expect(res.status).toBe(201);
    expect(res.body.space.joinCode).toBeUndefined();
    const again = await api().post('/api/v1/spaces/join').set(bearer(s.stu.token)).send({ joinCode: s.space.joinCode });
    expect(again.status).toBe(200);
    expect(again.body.alreadyEnrolled).toBe(true);
    const missing = await api().post('/api/v1/spaces/join').set(bearer(s.stu.token)).send({ joinCode: 'ZZZZZZZ' });
    expect(missing.status).toBe(404);
  });

  it('GET /spaces/my is role-aware', async () => {
    const edu = await api().get('/api/v1/spaces/my').set(bearer(s.edu.token));
    expect(edu.body.spaces).toHaveLength(2);
    expect(edu.body.spaces.find((x) => x._id === s.space._id).studentCount).toBe(1);
    const stu = await api().get('/api/v1/spaces/my').set(bearer(s.stu.token));
    expect(stu.body.spaces).toHaveLength(1);
    expect(stu.body.spaces[0].educator.slug).toBe('rahul-sharma-physics');
  });

  it('private spaces are invisible to outsiders', async () => {
    expect((await api().get(`/api/v1/spaces/${s.privateSpace._id}`)).status).toBe(404);
    expect((await api().get(`/api/v1/spaces/${s.space._id}`)).status).toBe(200);
  });
});

describe('notes locker', () => {
  const add = (body, token = s.edu.token) =>
    api().post(`/api/v1/spaces/${s.space._id}/locker`).set(bearer(token)).send(body);

  it('educator adds notes, links and files; others cannot', async () => {
    const pub = await add({ title: 'Formula sheet', contentMarkdown: '# F = ma', visibility: 'PUBLIC', folderName: 'Mechanics' });
    expect(pub.status).toBe(201);
    expect(pub.body.item.itemType).toBe('RICH_NOTE');
    s.pubNote = pub.body.item;
    s.enrolledNote = (await add({ title: 'Chapter 3 notes', contentMarkdown: 'Momentum...', folderName: 'Mechanics' })).body.item;
    s.privateNote = (await add({ title: 'Answer key', contentMarkdown: 'secret', visibility: 'PRIVATE' })).body.item;
    const link = await add({ title: 'PhET sim', fileUrl: 'https://phet.colorado.edu', visibility: 'PUBLIC' });
    expect(link.body.item.itemType).toBe('EXTERNAL_LINK');

    const pdf = await api().post(`/api/v1/spaces/${s.space._id}/locker`).set(bearer(s.edu.token))
      .field('title', 'Past paper').field('folderName', 'Exams')
      .attach('file', Buffer.from('%PDF-1.7 fake body'), { filename: 'paper.pdf', contentType: 'application/pdf' });
    expect(pdf.status, JSON.stringify(pdf.body)).toBe(201);
    expect(pdf.body.item).toMatchObject({ itemType: 'FILE_UPLOAD', mimeType: 'application/pdf', visibility: 'ENROLLED_ONLY' });
    expect(pdf.body.item.filePublicId).toBeUndefined();
    s.pdf = pdf.body.item;

    expect((await add({ title: 'x', contentMarkdown: 'y' }, s.edu2.token)).status).toBe(403);
    expect((await add({ title: 'x', contentMarkdown: 'y' }, s.stu.token)).status).toBe(403);
    expect((await add({ title: 'empty' })).status).toBe(400);
  });

  it('rejects a file whose content does not match its declared type', async () => {
    const res = await api().post(`/api/v1/spaces/${s.space._id}/locker`).set(bearer(s.edu.token))
      .field('title', 'Not a pdf')
      .attach('file', Buffer.from('MZ\x90\x00 windows exe'), { filename: 'x.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    const svg = await api().post(`/api/v1/spaces/${s.space._id}/locker`).set(bearer(s.edu.token))
      .field('title', 'svg').attach('file', Buffer.from('<svg/>'), { filename: 'a.svg', contentType: 'image/svg+xml' });
    expect(svg.status).toBe(400);
  });

  const titles = (body) => body.folders.flatMap((f) => f.items.map((i) => i.title)).sort();

  it('filters by visibility per viewer', async () => {
    const anon = await api().get(`/api/v1/spaces/${s.space._id}/locker`);
    expect(titles(anon.body)).toEqual(['Formula sheet', 'PhET sim']);

    const outsider = await api().get(`/api/v1/spaces/${s.space._id}/locker`).set(bearer(s.outsider.token));
    expect(titles(outsider.body)).toEqual(['Formula sheet', 'PhET sim']);

    const enrolled = await api().get(`/api/v1/spaces/${s.space._id}/locker`).set(bearer(s.stu.token));
    expect(titles(enrolled.body)).toEqual(['Chapter 3 notes', 'Formula sheet', 'Past paper', 'PhET sim']);
    expect(enrolled.body.folders.map((f) => f.folderName)).toEqual(['Exams', 'General', 'Mechanics']);
    expect(enrolled.body.folders[2].items[0].contentMarkdown).toBeUndefined();

    const owner = await api().get(`/api/v1/spaces/${s.space._id}/locker`).set(bearer(s.edu.token));
    expect(owner.body.totalItems).toBe(5);
  });

  it('single items: readable notes return Markdown, hidden ones 404', async () => {
    const ok = await api().get(`/api/v1/locker/${s.enrolledNote._id}`).set(bearer(s.stu.token));
    expect(ok.body.item.contentMarkdown).toBe('Momentum...');
    expect((await api().get(`/api/v1/locker/${s.enrolledNote._id}`)).status).toBe(404);
    expect((await api().get(`/api/v1/locker/${s.privateNote._id}`).set(bearer(s.stu.token))).status).toBe(404);
  });

  it('download counter increments only for permitted viewers', async () => {
    const one = await api().patch(`/api/v1/locker/${s.pdf._id}/download`).set(bearer(s.stu.token));
    const two = await api().patch(`/api/v1/locker/${s.pdf._id}/download`).set(bearer(s.stu.token));
    expect(one.body.downloadCount).toBe(1);
    expect(two.body.downloadCount).toBe(2);
    expect(two.body.fileUrl).toMatch(/^https:\/\/res\.cloudinary\.com/);
    expect((await api().patch(`/api/v1/locker/${s.pdf._id}/download`)).status).toBe(404);
  });
});

describe('class history', () => {
  const hoursFromNow = (h) => new Date(Date.now() + h * 3_600_000).toISOString();

  it('educator schedules classes; links must point at notes in the same space', async () => {
    const mk = (body) => api().post(`/api/v1/spaces/${s.space._id}/sessions`).set(bearer(s.edu.token)).send(body);
    const r1 = await mk({ title: 'Lecture 2', scheduledAt: hoursFromNow(-48), recordingUrl: 'https://youtu.be/2', linkedNoteId: s.enrolledNote._id });
    const r2 = await mk({ title: 'Lecture 1', scheduledAt: hoursFromNow(-96), linkedNoteId: s.privateNote._id });
    await mk({ title: 'Lecture 3 (live)', scheduledAt: hoursFromNow(-0.5), meetingUrl: 'https://meet.google.com/abc' });
    await mk({ title: 'Lecture 4', scheduledAt: hoursFromNow(24), meetingUrl: 'https://meet.google.com/def' });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    s.lecture1 = r2.body.session;

    const foreignNote = await api().post(`/api/v1/spaces/${s.privateSpace._id}/locker`).set(bearer(s.edu.token))
      .send({ title: 'other', contentMarkdown: 'x' });
    const bad = await mk({ title: 'Bad link', scheduledAt: hoursFromNow(1), linkedNoteId: foreignNote.body.item._id });
    expect(bad.status).toBe(400);
    const student = await api().post(`/api/v1/spaces/${s.space._id}/sessions`).set(bearer(s.stu.token))
      .send({ title: 'nope', scheduledAt: hoursFromNow(1) });
    expect(student.status).toBe(403);
  });

  it('catch-up view: past in chronological order with recordings and visible notes', async () => {
    const res = await api().get(`/api/v1/spaces/${s.space._id}/history`).set(bearer(s.stu.token));
    expect(res.status).toBe(200);
    expect(res.body.past.map((x) => x.title)).toEqual(['Lecture 1', 'Lecture 2']);
    expect(res.body.past[1].recordingUrl).toBe('https://youtu.be/2');
    expect(res.body.past[1].linkedNote.title).toBe('Chapter 3 notes');
    expect(res.body.past[0].linkedNote).toBeNull(); // PRIVATE note hidden from students
    expect(res.body.live.map((x) => x.title)).toEqual(['Lecture 3 (live)']);
    expect(res.body.upcoming.map((x) => x.title)).toEqual(['Lecture 4']);
    expect(res.body.nextUp.title).toBe('Lecture 3 (live)');

    const owner = await api().get(`/api/v1/spaces/${s.space._id}/history`).set(bearer(s.edu.token));
    expect(owner.body.past[0].linkedNote.title).toBe('Answer key');
    expect((await api().get(`/api/v1/spaces/${s.space._id}/history`).set(bearer(s.outsider.token))).status).toBe(403);
  });

  it('educator adds a recording after class', async () => {
    const res = await api().patch(`/api/v1/sessions/${s.lecture1._id}`).set(bearer(s.edu.token))
      .send({ recordingUrl: 'https://youtu.be/1', status: 'COMPLETED' });
    expect(res.status).toBe(200);
    expect(res.body.session.recordingUrl).toBe('https://youtu.be/1');
    const other = await api().patch(`/api/v1/sessions/${s.lecture1._id}`).set(bearer(s.edu2.token)).send({ title: 'hijack' });
    expect(other.status).toBe(403);
  });

  it('deleting a note unlinks it from sessions and removes the stored file', async () => {
    const res = await api().delete(`/api/v1/locker/${s.pdf._id}`).set(bearer(s.edu.token));
    expect(res.status).toBe(200);
    expect(deleteAsset).toHaveBeenCalledWith(expect.stringContaining('file.pdf'), 'raw');
  });
});

describe('ratings & leaderboard', () => {
  const eduId = () => s.edu.user._id;

  it('only enrolled students can rate', async () => {
    const out = await api().post(`/api/v1/educators/${eduId()}/rate`).set(bearer(s.outsider.token)).send({ rating: 1 });
    expect(out.status).toBe(403);
    const edu = await api().post(`/api/v1/educators/${eduId()}/rate`).set(bearer(s.edu2.token)).send({ rating: 1 });
    expect(edu.status).toBe(403);
    const bad = await api().post(`/api/v1/educators/${eduId()}/rate`).set(bearer(s.stu.token)).send({ rating: 6 });
    expect(bad.status).toBe(400);
  });

  it('rating recalculates the Bayesian score; re-rating updates instead of duplicating', async () => {
    const first = await api().post(`/api/v1/educators/${eduId()}/rate`).set(bearer(s.stu.token))
      .send({ rating: 5, reviewText: 'Great explanations' });
    expect(first.status).toBe(201);
    // v=1, R=5, m=10, C=4 → (1/11)*5 + (10/11)*4 = 4.0909
    expect(first.body.stats).toEqual({ avgRating: 5, totalReviews: 1, rankingScore: 4.0909 });

    const again = await api().post(`/api/v1/educators/${eduId()}/rate`).set(bearer(s.stu.token)).send({ rating: 3 });
    expect(again.status).toBe(200);
    expect(again.body.stats.totalReviews).toBe(1);
    expect(again.body.stats.rankingScore).toBeCloseTo(bayesianScore(3, 1, 10, 4), 4);
    expect(await models.EducatorRating.countDocuments()).toBe(1);
  });

  it('bayesianScore matches the spec formula', () => {
    expect(bayesianScore(5, 0)).toBe(0);
    expect(bayesianScore(4.5, 10, 10, 4)).toBeCloseTo(4.25);
    expect(bayesianScore(5, 1000, 10, 4)).toBeCloseTo(4.9901, 3);
  });

  it('public profile shows public spaces/notes, reviews and viewer state', async () => {
    const anon = await api().get('/api/v1/educators/RAHUL-SHARMA-PHYSICS');
    expect(anon.status).toBe(200);
    expect(anon.body.educator).toMatchObject({ fullName: 'Rahul Sharma', totalReviews: 1, rank: 1 });
    expect(anon.body.spaces.map((x) => x.title)).toEqual(['Physics Class 12']);
    expect(anon.body.publicNotes.map((n) => n.title).sort()).toEqual(['Formula sheet', 'PhET sim']);
    expect(anon.body.reviews[0].student.name).toBe('Priya V.');
    expect(anon.body.viewer).toBeNull();

    const stu = await api().get('/api/v1/educators/rahul-sharma-physics').set(bearer(s.stu.token));
    expect(stu.body.viewer).toMatchObject({ canRate: true, myRating: { rating: 3 } });
    expect((await api().get('/api/v1/educators/nobody')).status).toBe(404);
  });

  it('leaderboard sorts by rankingScore and filters/searches', async () => {
    const all = await api().get('/api/v1/leaderboard');
    expect(all.body.total).toBe(2);
    expect(all.body.educators[0]).toMatchObject({ slug: 'rahul-sharma-physics', rank: 1 });
    expect(all.body.educators[1].rankingScore).toBe(0);

    const maths = await api().get('/api/v1/leaderboard?subject=Maths');
    expect(maths.body.educators.map((e) => e.slug)).toEqual(['rahul-sharma-physics-2']);

    const search = await api().get('/api/v1/leaderboard?q=rahul.*');
    expect(search.body.total).toBe(0); // regex characters are treated literally

    const subjects = await api().get('/api/v1/leaderboard/subjects');
    expect(subjects.body.subjects).toEqual(['maths', 'physics']);
    expect((await api().get('/api/v1/leaderboard?limit=500')).status).toBe(400);
  });
});

describe('errors', () => {
  it('unknown routes and bad ids', async () => {
    expect((await api().get('/api/v1/nope')).status).toBe(404);
    expect((await api().get('/api/v1/spaces/not-an-id/locker')).status).toBe(400);
  });
});
