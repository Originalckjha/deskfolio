import mongoose from 'mongoose';

const educatorProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain a-z, 0-9 and single hyphens'],
    },
    // Copy of User.fullName so the leaderboard can search and sort without a $lookup.
    // Keep it in sync when the user renames themselves.
    displayName: { type: String, required: true, trim: true },
    bio: { type: String, trim: true, maxlength: 1000, default: '' },
    subjects: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
      default: [],
      validate: [(arr) => arr.length <= 10, 'At most 10 subjects'],
    },
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    rankingScore: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true },
);

// Leaderboard: GET /leaderboard?subject=... sorted by rankingScore DESC
educatorProfileSchema.index({ rankingScore: -1, totalReviews: -1 });
educatorProfileSchema.index({ subjects: 1, rankingScore: -1 });
// Leaderboard search box
educatorProfileSchema.index({ displayName: 'text', subjects: 'text', bio: 'text' });

export const EducatorProfile = mongoose.model('EducatorProfile', educatorProfileSchema);
