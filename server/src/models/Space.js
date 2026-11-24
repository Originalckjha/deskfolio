import mongoose from 'mongoose';

export const JOIN_CODE_REGEX = /^[A-Z0-9]{6,8}$/;

const spaceSchema = new mongoose.Schema(
  {
    educatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    subject: { type: String, required: true, trim: true, lowercase: true, maxlength: 40 },
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [JOIN_CODE_REGEX, 'Join code must be 6-8 uppercase letters or digits'],
    },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Space = mongoose.model('Space', spaceSchema);
