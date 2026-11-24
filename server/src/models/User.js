import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = Object.freeze({
  EDUCATOR: 'EDUCATOR',
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN',
});

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    // Never returned by default; use .select('+passwordHash') when logging in.
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.STUDENT,
      required: true,
    },
    avatarUrl: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.statics.hashPassword = function hashPassword(plain, rounds = 12) {
  return bcrypt.hash(plain, rounds);
};

userSchema.methods.comparePassword = function comparePassword(plain) {
  if (!this.passwordHash) {
    throw new Error('passwordHash not loaded; query with .select("+passwordHash")');
  }
  return bcrypt.compare(plain, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);
