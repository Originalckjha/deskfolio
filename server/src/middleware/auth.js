import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwt.js';

function readBearer(req) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/**
 * Resolves the token to a live user. The role is read from the database, not the
 * token, so a role change or deleted account takes effect immediately.
 */
async function resolveUser(token) {
  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    throw ApiError.unauthorized(
      err.name === 'TokenExpiredError' ? 'Session expired, please log in again' : 'Invalid token',
    );
  }

  const user = await User.findById(payload.sub).select('fullName email role avatarUrl').lean();
  if (!user) throw ApiError.unauthorized('Account no longer exists');

  return {
    id: String(user._id),
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}

/** Requires a valid `Authorization: Bearer <jwt>` header; sets req.user. */
export async function verifyJWT(req, _res, next) {
  const token = readBearer(req);
  if (!token) throw ApiError.unauthorized();
  req.user = await resolveUser(token);
  next();
}

/**
 * For public endpoints that show more to signed-in users (e.g. ENROLLED_ONLY notes).
 * Sets req.user when a valid token is sent, otherwise leaves it null. A bad token is
 * still rejected so the client knows to log in again.
 */
export async function optionalAuth(req, _res, next) {
  const token = readBearer(req);
  req.user = token ? await resolveUser(token) : null;
  next();
}

/**
 * Role guard; use after verifyJWT.
 *   router.post('/spaces', verifyJWT, requireRole('EDUCATOR'), createSpace)
 */
export function requireRole(...roles) {
  const allowed = new Set(roles.flat());
  if (allowed.size === 0) throw new Error('requireRole needs at least one role');

  return function roleGuard(req, _res, next) {
    if (!req.user) throw ApiError.unauthorized();
    if (!allowed.has(req.user.role)) {
      throw ApiError.forbidden(`This action is limited to: ${[...allowed].join(', ')}`);
    }
    next();
  };
}
