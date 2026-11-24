import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { EducatorRating } from '../models/EducatorRating.js';
import { EducatorProfile } from '../models/EducatorProfile.js';

const round = (n, dp) => Math.round(n * 10 ** dp) / 10 ** dp;

/**
 * Bayesian weighted rating:
 *   score = (v / (v + m)) * R + (m / (v + m)) * C
 * R = educator's average, v = review count, m = minimum-reviews threshold,
 * C = platform baseline. Few reviews → score stays near C; many → approaches R.
 *
 * Educators with no reviews score 0 rather than C, so unrated profiles sit
 * below rated ones instead of starting at 4.0.
 */
export function bayesianScore(R, v, m = env.RANKING_MIN_REVIEWS_M, C = env.RANKING_BASELINE_C) {
  if (!v || v <= 0) return 0;
  return (v / (v + m)) * R + (m / (v + m)) * C;
}

/**
 * Recomputes avgRating, totalReviews and rankingScore from the ratings collection.
 * Aggregating from source (rather than incrementing) keeps the numbers correct
 * when ratings are edited or two arrive at once.
 */
export async function recalculateEducatorStats(educatorId) {
  const [agg] = await EducatorRating.aggregate([
    { $match: { educatorId: new mongoose.Types.ObjectId(String(educatorId)) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const R = agg?.avg ?? 0;
  const v = agg?.count ?? 0;

  return EducatorProfile.findOneAndUpdate(
    { userId: educatorId },
    {
      $set: {
        avgRating: round(R, 2),
        totalReviews: v,
        rankingScore: round(bayesianScore(R, v), 4),
      },
    },
    { returnDocument: 'after' },
  ).lean();
}
