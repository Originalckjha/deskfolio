import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import {
  User,
  EducatorProfile,
  Space,
  Enrollment,
  LockerItem,
  ClassSession,
  EducatorRating,
} from '../src/models/index.js';

const id = () => new mongoose.Types.ObjectId();
const errorsOf = async (doc) => {
  try {
    await doc.validate();
    return {};
  } catch (err) {
    return err.errors;
  }
};
const indexKeys = (Model) => Model.schema.indexes().map(([keys, opts]) => ({ keys, unique: !!opts.unique }));

describe('models', () => {
  it('User hides passwordHash in JSON and lowercases email', async () => {
    const u = new User({ fullName: 'Rahul Sharma', email: 'Rahul@Mail.com ', passwordHash: 'x' });
    expect(await errorsOf(u)).toEqual({});
    expect(u.email).toBe('rahul@mail.com');
    expect(u.role).toBe('STUDENT');
    expect(u.toJSON().passwordHash).toBeUndefined();
    expect(await errorsOf(new User({ fullName: 'A B', email: 'nope', passwordHash: 'x', role: 'GOD' })))
      .toHaveProperty('role');
  });

  it('User hashes and compares passwords', async () => {
    const hash = await User.hashPassword('s3cret-pass', 10);
    const u = new User({ fullName: 'A B', email: 'a@b.co', passwordHash: hash });
    expect(await u.comparePassword('s3cret-pass')).toBe(true);
    expect(await u.comparePassword('wrong')).toBe(false);
  });

  it('Space enforces 6-8 char uppercase join codes', async () => {
    const base = { educatorId: id(), title: 'Physics 12', subject: 'Physics' };
    expect(await errorsOf(new Space({ ...base, joinCode: 'ab12cd' }))).toEqual({}); // uppercased
    expect(await errorsOf(new Space({ ...base, joinCode: 'AB1' }))).toHaveProperty('joinCode');
    expect(await errorsOf(new Space({ ...base, joinCode: 'AB-12CD' }))).toHaveProperty('joinCode');
  });

  it('LockerItem requires content matching its type', async () => {
    const base = { spaceId: id(), educatorId: id(), title: 'Kinematics' };
    expect(await errorsOf(new LockerItem({ ...base, itemType: 'RICH_NOTE' }))).toHaveProperty('contentMarkdown');
    expect(await errorsOf(new LockerItem({ ...base, itemType: 'RICH_NOTE', contentMarkdown: '# hi' }))).toEqual({});
    expect(await errorsOf(new LockerItem({ ...base, itemType: 'FILE_UPLOAD' }))).toHaveProperty('fileUrl');
    expect(await errorsOf(new LockerItem({ ...base, itemType: 'EXTERNAL_LINK', fileUrl: 'javascript:alert(1)' })))
      .toHaveProperty('fileUrl');
    const ok = new LockerItem({ ...base, itemType: 'EXTERNAL_LINK', fileUrl: 'https://x.org' });
    expect(await errorsOf(ok)).toEqual({});
    expect(ok.folderName).toBe('General');
    expect(ok.visibility).toBe('ENROLLED_ONLY');
  });

  it('EducatorRating only accepts whole numbers 1-5', async () => {
    const base = { educatorId: id(), studentId: id() };
    expect(await errorsOf(new EducatorRating({ ...base, rating: 5 }))).toEqual({});
    for (const bad of [0, 6, 3.5]) {
      expect(await errorsOf(new EducatorRating({ ...base, rating: bad }))).toHaveProperty('rating');
    }
  });

  it('ClassSession rejects non-http URLs and defaults to UPCOMING', async () => {
    const s = new ClassSession({ spaceId: id(), title: 'Lecture 1', scheduledAt: new Date() });
    expect(await errorsOf(s)).toEqual({});
    expect(s.status).toBe('UPCOMING');
    expect(s.linkedNoteId).toBeNull();
    s.meetingUrl = 'ftp://x';
    expect(await errorsOf(s)).toHaveProperty('meetingUrl');
  });

  it('EducatorProfile slug format', async () => {
    const base = { userId: id(), displayName: 'Rahul' };
    expect(await errorsOf(new EducatorProfile({ ...base, slug: 'rahul-physics' }))).toEqual({});
    expect(await errorsOf(new EducatorProfile({ ...base, slug: 'rahul--physics' }))).toHaveProperty('slug');
  });

  it('declares the required unique compound indexes', () => {
    expect(indexKeys(Enrollment)).toContainEqual({ keys: { spaceId: 1, studentId: 1 }, unique: true });
    expect(indexKeys(EducatorRating)).toContainEqual({ keys: { educatorId: 1, studentId: 1 }, unique: true });
    expect(User.schema.path('email').options.unique).toBe(true);
    expect(Space.schema.path('joinCode').options.unique).toBe(true);
    expect(EducatorProfile.schema.path('slug').options.unique).toBe(true);
    expect(EducatorProfile.schema.path('userId').options.unique).toBe(true);
  });
});
