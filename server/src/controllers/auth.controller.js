import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { User, ROLES } from '../models/User.js';
import { EducatorProfile } from '../models/EducatorProfile.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/jwt.js';
import { uniqueEducatorSlug } from '../utils/slug.js';

// Compared against when the email doesn't exist, so a login for an unknown email
// takes about as long as one with a wrong password (no account enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('deskfolio-timing-equalizer', 10);

const profileFor = (user) =>
  user.role === ROLES.EDUCATOR ? EducatorProfile.findOne({ userId: user._id }).lean() : null;

// POST /auth/register
export async function register(req, res) {
  const { fullName, email, password, role, bio, subjects } = req.valid.body;

  const passwordHash = await User.hashPassword(password, env.BCRYPT_SALT_ROUNDS);
  const user = await User.create({ fullName, email, passwordHash, role });

  let educatorProfile = null;
  if (role === ROLES.EDUCATOR) {
    try {
      educatorProfile = await EducatorProfile.create({
        userId: user._id,
        slug: await uniqueEducatorSlug(fullName, subjects?.[0]),
        displayName: fullName,
        bio: bio ?? '',
        subjects: subjects ?? [],
      });
    } catch (err) {
      await User.deleteOne({ _id: user._id }); // don't leave an educator without a profile
      throw err;
    }
  }

  res.status(201).json({
    success: true,
    token: signToken(user),
    user: user.toJSON(),
    educatorProfile,
  });
}

// POST /auth/login
export async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash');

  const ok = user ? await user.comparePassword(password) : await bcrypt.compare(password, DUMMY_HASH);
  if (!user || !ok) throw ApiError.unauthorized('Invalid email or password');

  res.json({
    success: true,
    token: signToken(user),
    user: user.toJSON(),
    educatorProfile: await profileFor(user),
  });
}

// GET /auth/me
export async function me(req, res) {
  res.json({ success: true, user: req.user, educatorProfile: await profileFor(req.user) });
}
