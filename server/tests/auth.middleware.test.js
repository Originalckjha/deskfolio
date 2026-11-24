import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../src/models/User.js';
import { verifyJWT, optionalAuth, requireRole } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { signToken } from '../src/utils/jwt.js';

const users = new Map();
const mkUser = (role) => {
  const u = { _id: new mongoose.Types.ObjectId(), fullName: 'T U', email: 't@u.co', role, avatarUrl: '' };
  users.set(String(u._id), u);
  return u;
};

// Stub the DB lookup: User.findById(id).select(...).lean()
vi.spyOn(User, 'findById').mockImplementation((uid) => ({
  select: () => ({ lean: async () => users.get(String(uid)) ?? null }),
}));

afterEach(() => users.clear());

const app = express();
app.get('/me', verifyJWT, (req, res) => res.json({ id: req.user.id, role: req.user.role }));
app.post('/spaces', verifyJWT, requireRole('EDUCATOR'), (_req, res) => res.status(201).json({ ok: true }));
app.get('/public', optionalAuth, (req, res) => res.json({ user: req.user?.role ?? null }));
app.use(errorHandler);

const auth = (u) => ({ Authorization: `Bearer ${signToken(u)}` });

describe('verifyJWT', () => {
  it('401 without a token', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('401 for a tampered or wrongly signed token', async () => {
    const forged = jwt.sign({ role: 'ADMIN' }, 'some-other-secret-key-of-enough-length!!', { subject: 'x' });
    expect((await request(app).get('/me').set('Authorization', `Bearer ${forged}`)).status).toBe(401);
  });

  it('401 with a clear message when expired', async () => {
    const u = mkUser('STUDENT');
    const expired = jwt.sign({ role: 'STUDENT', exp: Math.floor(Date.now() / 1000) - 10 },
      'test-secret-that-is-definitely-longer-than-32-chars', { subject: String(u._id) });
    const res = await request(app).get('/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('401 when the account was deleted', async () => {
    const u = mkUser('STUDENT');
    const headers = auth(u);
    users.clear();
    expect((await request(app).get('/me').set(headers)).status).toBe(401);
  });

  it('sets req.user from the database, not the token', async () => {
    const u = mkUser('STUDENT');
    const headers = auth(u);
    u.role = 'EDUCATOR'; // role changed after token was issued
    const res = await request(app).get('/me').set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: String(u._id), role: 'EDUCATOR' });
  });
});

describe('requireRole', () => {
  it('403 for a student creating a space', async () => {
    const res = await request(app).post('/spaces').set(auth(mkUser('STUDENT')));
    expect(res.status).toBe(403);
  });

  it('allows an educator', async () => {
    expect((await request(app).post('/spaces').set(auth(mkUser('EDUCATOR')))).status).toBe(201);
  });
});

describe('optionalAuth', () => {
  it('anonymous is fine', async () => {
    expect((await request(app).get('/public')).body).toEqual({ user: null });
  });
  it('picks up a valid user', async () => {
    expect((await request(app).get('/public').set(auth(mkUser('STUDENT')))).body).toEqual({ user: 'STUDENT' });
  });
});
