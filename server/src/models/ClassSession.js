import mongoose from 'mongoose';

export const SESSION_STATUS = Object.freeze({
  UPCOMING: 'UPCOMING',
  LIVE: 'LIVE',
  COMPLETED: 'COMPLETED',
});

const httpUrl = {
  validator: (v) => !v || /^https?:\/\//i.test(v),
  message: 'URL must start with http:// or https://',
};

const classSessionSchema = new mongoose.Schema(
  {
    spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
    meetingUrl: { type: String, trim: true, validate: httpUrl },
    recordingUrl: { type: String, trim: true, validate: httpUrl },
    linkedNoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'LockerItem', default: null },
    scheduledAt: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.UPCOMING,
    },
  },
  { timestamps: true },
);

// Upcoming banner (scheduledAt >= now, ascending) and Catch-Up history
// (scheduledAt < now or COMPLETED, chronological) both use this index.
classSessionSchema.index({ spaceId: 1, scheduledAt: 1 });

export const ClassSession = mongoose.model('ClassSession', classSessionSchema);
