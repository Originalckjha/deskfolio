import { Router } from 'express';
import { verifyJWT, optionalAuth, requireRole } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { uploadSingleFile } from '../middleware/upload.js';
import * as v from '../validators/schemas.js';
import * as auth from '../controllers/auth.controller.js';
import * as spaces from '../controllers/space.controller.js';
import * as locker from '../controllers/locker.controller.js';
import * as sessions from '../controllers/session.controller.js';
import * as educators from '../controllers/educator.controller.js';

const EDUCATOR = 'EDUCATOR';
const STUDENT = 'STUDENT';
const router = Router();

// ---- Auth ----
router.post('/auth/register', authLimiter, validate({ body: v.registerBody }), auth.register);
router.post('/auth/login', authLimiter, validate({ body: v.loginBody }), auth.login);
router.get('/auth/me', verifyJWT, auth.me);

// ---- Spaces ----
router.post('/spaces', verifyJWT, requireRole(EDUCATOR), validate({ body: v.createSpaceBody }), spaces.createSpace);
router.get('/spaces/my', verifyJWT, spaces.mySpaces);
router.post('/spaces/join', verifyJWT, requireRole(STUDENT), validate({ body: v.joinSpaceBody }), spaces.joinSpace);
router.get('/spaces/:spaceId', optionalAuth, validate({ params: v.spaceParams }), spaces.getSpace);

// ---- Notes Locker ----
router.post(
  '/spaces/:spaceId/locker',
  verifyJWT,
  requireRole(EDUCATOR),
  uploadSingleFile, // parses multipart; JSON bodies pass straight through
  validate({ params: v.spaceParams, body: v.createLockerBody }),
  locker.createItem,
);
router.get('/spaces/:spaceId/locker', optionalAuth, validate({ params: v.spaceParams }), locker.listItems);
router.get('/locker/:id', optionalAuth, validate({ params: v.idParams }), locker.getItem);
router.patch('/locker/:id/download', optionalAuth, validate({ params: v.idParams }), locker.registerDownload);
router.delete('/locker/:id', verifyJWT, requireRole(EDUCATOR), validate({ params: v.idParams }), locker.deleteItem);

// ---- Class links & history ----
router.post(
  '/spaces/:spaceId/sessions',
  verifyJWT,
  requireRole(EDUCATOR),
  validate({ params: v.spaceParams, body: v.createSessionBody }),
  sessions.createSession,
);
router.patch(
  '/sessions/:id',
  verifyJWT,
  requireRole(EDUCATOR),
  validate({ params: v.idParams, body: v.updateSessionBody }),
  sessions.updateSession,
);
router.get('/spaces/:spaceId/history', verifyJWT, validate({ params: v.spaceParams }), sessions.getHistory);

// ---- Ratings, profiles & leaderboard ----
router.post(
  '/educators/:educatorId/rate',
  verifyJWT,
  requireRole(STUDENT),
  validate({ params: v.educatorParams, body: v.rateBody }),
  educators.rateEducator,
);
router.get('/educators/:slug', optionalAuth, validate({ params: v.slugParams }), educators.getEducatorProfile);
router.get('/leaderboard/subjects', educators.getSubjects);
router.get('/leaderboard', validate({ query: v.leaderboardQuery }), educators.getLeaderboard);

export default router;
