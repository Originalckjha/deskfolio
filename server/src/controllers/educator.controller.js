import { EducatorProfile } from '../models/EducatorProfile.js';
import { EducatorRating } from '../models/EducatorRating.js';
import { Enrollment } from '../models/Enrollment.js';
import { LockerItem, VISIBILITY } from '../models/LockerItem.js';
import { Space } from '../models/Space.js';
import { ROLES } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/slug.js';
import { recalculateEducatorStats } from '../services/ranking.js';

/** Verified rating rule: the student must be enrolled in one of the educator's spaces. */
async function isEnrolledWithEducator(studentId, educatorId) {
  const spaceIds = await Space.find({ educatorId }).distinct('_id');
  return spaceIds.length > 0 && Boolean(await Enrollment.exists({ studentId, spaceId: { $in: spaceIds } }));
}

// Reviews show "Priya S." rather than full names.
const shortName = (fullName = '') => {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
};

// POST /educators/:educatorId/rate  (STUDENT, enrolled)
export async function rateEducator(req, res) {
  const { educatorId } = req.valid.params;
  const { rating, reviewText } = req.valid.body;

  if (!(await EducatorProfile.exists({ userId: educatorId }))) throw ApiError.notFound('Educator not found');
  if (!(await isEnrolledWithEducator(req.user.id, educatorId))) {
    throw ApiError.forbidden('You can only rate educators whose space you have joined');
  }

  const filter = { educatorId, studentId: req.user.id };
  let doc = await EducatorRating.findOne(filter);
  const created = !doc;
  if (doc) {
    doc.set({ rating, reviewText });
    await doc.save();
  } else {
    try {
      doc = await EducatorRating.create({ ...filter, rating, reviewText });
    } catch (err) {
      if (err?.code !== 11000) throw err;
      // Two submissions raced; fall back to updating the one that won.
      doc = await EducatorRating.findOneAndUpdate(
        filter,
        { $set: { rating, reviewText } },
        { returnDocument: 'after', runValidators: true },
      );
    }
  }

  const stats = await recalculateEducatorStats(educatorId);
  res.status(created ? 201 : 200).json({
    success: true,
    created,
    rating: doc,
    stats: {
      avgRating: stats.avgRating,
      totalReviews: stats.totalReviews,
      rankingScore: stats.rankingScore,
    },
  });
}

// GET /educators/:slug  → public profile, public spaces & notes, recent reviews
export async function getEducatorProfile(req, res) {
  const profile = await EducatorProfile.findOne({ slug: req.valid.params.slug })
    .populate('userId', 'fullName avatarUrl createdAt')
    .lean();
  if (!profile?.userId) throw ApiError.notFound('Educator not found');
  const educatorId = profile.userId._id;

  const [spaces, reviews, rankAbove] = await Promise.all([
    Space.find({ educatorId, isPublic: true }).select('title subject createdAt').sort({ createdAt: -1 }).lean(),
    EducatorRating.find({ educatorId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('studentId', 'fullName avatarUrl')
      .lean(),
    profile.totalReviews > 0
      ? EducatorProfile.countDocuments({ rankingScore: { $gt: profile.rankingScore } })
      : Promise.resolve(null),
  ]);

  const publicNotes = await LockerItem.find({
    educatorId,
    visibility: VISIBILITY.PUBLIC,
    spaceId: { $in: spaces.map((s) => s._id) },
  })
    .select('-contentMarkdown -filePublicId -__v')
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  let viewer = null;
  if (req.user?.role === ROLES.STUDENT) {
    const mine = await EducatorRating.findOne({ educatorId, studentId: req.user.id })
      .select('rating reviewText updatedAt')
      .lean();
    viewer = { canRate: await isEnrolledWithEducator(req.user.id, educatorId), myRating: mine };
  }

  const { userId: user, ...rest } = profile;
  res.json({
    success: true,
    educator: {
      ...rest,
      educatorId,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      memberSince: user.createdAt,
      rank: rankAbove === null ? null : rankAbove + 1,
    },
    spaces,
    publicNotes,
    reviews: reviews.map((r) => ({
      _id: r._id,
      rating: r.rating,
      reviewText: r.reviewText,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      student: { name: shortName(r.studentId?.fullName), avatarUrl: r.studentId?.avatarUrl ?? '' },
      verified: true, // every rating required an enrollment
    })),
    viewer,
  });
}

// GET /leaderboard?subject=&q=&page=&limit=
export async function getLeaderboard(req, res) {
  const { subject, q, page, limit } = req.valid.query;
  const filter = {};
  if (subject) filter.subjects = subject;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ displayName: rx }, { subjects: rx }];
  }

  const skip = (page - 1) * limit;
  const [total, rows] = await Promise.all([
    EducatorProfile.countDocuments(filter),
    EducatorProfile.find(filter)
      .sort({ rankingScore: -1, totalReviews: -1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .select('slug displayName subjects bio avgRating totalReviews rankingScore userId')
      .populate('userId', 'avatarUrl')
      .lean(),
  ]);

  res.json({
    success: true,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    educators: rows.map(({ userId, bio, ...r }, i) => ({
      ...r,
      rank: skip + i + 1,
      educatorId: userId?._id,
      avatarUrl: userId?.avatarUrl ?? '',
      bio: bio?.length > 160 ? `${bio.slice(0, 157)}...` : bio,
    })),
  });
}

// GET /leaderboard/subjects  → values for the subject filter
export async function getSubjects(_req, res) {
  const subjects = await EducatorProfile.distinct('subjects');
  res.json({ success: true, subjects: subjects.filter(Boolean).sort() });
}
