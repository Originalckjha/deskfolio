import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
  spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joinedAt: { type: Date, default: Date.now },
});

// One enrollment per student per space; also serves "is this student enrolled in space X?"
enrollmentSchema.index({ spaceId: 1, studentId: 1 }, { unique: true });
// "Which spaces has this student joined?" (GET /spaces/my for students, rating eligibility)
enrollmentSchema.index({ studentId: 1, joinedAt: -1 });

export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
