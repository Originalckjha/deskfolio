import { Space } from '../models/Space.js';
import { Enrollment } from '../models/Enrollment.js';
import { EducatorProfile } from '../models/EducatorProfile.js';
import { ROLES } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { generateJoinCode } from '../utils/joinCode.js';
import { getSpaceAccess } from '../services/access.js';

const isDuplicate = (err, field) => err?.code === 11000 && err.keyPattern?.[field];

// POST /spaces  (EDUCATOR)
export async function createSpace(req, res) {
  const { title, subject, isPublic } = req.valid.body;

  // 32^7 ≈ 34 billion codes, so a collision is rare; retry a few times just in case.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const space = await Space.create({
        educatorId: req.user.id,
        title,
        subject,
        isPublic,
        joinCode: generateJoinCode(),
      });
      return res.status(201).json({ success: true, space });
    } catch (err) {
      if (!isDuplicate(err, 'joinCode')) throw err;
    }
  }
  throw new ApiError(500, 'Could not generate a unique join code, please retry');
}

// GET /spaces/my  (role-aware)
export async function mySpaces(req, res) {
  if (req.user.role === ROLES.EDUCATOR) {
    const spaces = await Space.find({ educatorId: req.user.id }).sort({ createdAt: -1 }).lean();
    const counts = await Enrollment.aggregate([
      { $match: { spaceId: { $in: spaces.map((s) => s._id) } } },
      { $group: { _id: '$spaceId', n: { $sum: 1 } } },
    ]);
    const countBy = new Map(counts.map((c) => [String(c._id), c.n]));
    return res.json({
      success: true,
      role: req.user.role,
      spaces: spaces.map((s) => ({ ...s, studentCount: countBy.get(String(s._id)) ?? 0 })),
    });
  }

  if (req.user.role === ROLES.STUDENT) {
    const enrollments = await Enrollment.find({ studentId: req.user.id })
      .sort({ joinedAt: -1 })
      .populate({ path: 'spaceId', populate: { path: 'educatorId', select: 'fullName avatarUrl' } })
      .lean();
    const live = enrollments.filter((e) => e.spaceId); // skip spaces that were deleted
    const educatorIds = live.map((e) => e.spaceId.educatorId?._id).filter(Boolean);
    const profiles = await EducatorProfile.find({ userId: { $in: educatorIds } })
      .select('userId slug')
      .lean();
    const slugBy = new Map(profiles.map((p) => [String(p.userId), p.slug]));

    return res.json({
      success: true,
      role: req.user.role,
      spaces: live.map(({ spaceId: s, joinedAt }) => ({
        _id: s._id,
        title: s.title,
        subject: s.subject,
        isPublic: s.isPublic,
        joinedAt,
        educator: s.educatorId && {
          _id: s.educatorId._id,
          fullName: s.educatorId.fullName,
          avatarUrl: s.educatorId.avatarUrl,
          slug: slugBy.get(String(s.educatorId._id)) ?? null,
        },
      })),
    });
  }

  res.json({ success: true, role: req.user.role, spaces: [] });
}

// POST /spaces/join  (STUDENT)
export async function joinSpace(req, res) {
  const space = await Space.findOne({ joinCode: req.valid.body.joinCode }).lean();
  if (!space) throw ApiError.notFound('No space found with that join code');

  try {
    await Enrollment.create({ spaceId: space._id, studentId: req.user.id });
    res.status(201).json({ success: true, alreadyEnrolled: false, space: publicSpace(space) });
  } catch (err) {
    if (!isDuplicate(err, 'spaceId')) throw err;
    res.json({ success: true, alreadyEnrolled: true, space: publicSpace(space) });
  }
}

// GET /spaces/:spaceId  (public spaces, or members of private ones)
export async function getSpace(req, res) {
  const access = await getSpaceAccess(req.valid.params.spaceId, req.user);
  // 404 rather than 403 so private spaces can't be discovered by id.
  if (!access.canSeeSpace) throw ApiError.notFound('Space not found');

  const { space, isOwner, isEnrolled, isAdmin } = access;
  const educator = await EducatorProfile.findOne({ userId: space.educatorId })
    .select('slug displayName avgRating totalReviews')
    .lean();

  res.json({
    success: true,
    space: isOwner || isAdmin ? space : publicSpace(space),
    educator,
    access: { isOwner, isEnrolled, isAdmin },
    ...(isOwner && { studentCount: await Enrollment.countDocuments({ spaceId: space._id }) }),
  });
}

// The join code is the key to a space; only its educator sees it.
function publicSpace({ joinCode, ...rest }) {
  return rest;
}
