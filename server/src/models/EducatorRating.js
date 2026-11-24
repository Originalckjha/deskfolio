import mongoose from 'mongoose';

const educatorRatingSchema = new mongoose.Schema(
  {
    educatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: { validator: Number.isInteger, message: 'Rating must be a whole number 1-5' },
    },
    reviewText: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true },
);

// One rating per student per educator (re-rating updates it).
educatorRatingSchema.index({ educatorId: 1, studentId: 1 }, { unique: true });
// Recent reviews on the public profile
educatorRatingSchema.index({ educatorId: 1, createdAt: -1 });

export const EducatorRating = mongoose.model('EducatorRating', educatorRatingSchema);
