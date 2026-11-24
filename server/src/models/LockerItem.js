import mongoose from 'mongoose';

export const ITEM_TYPES = Object.freeze({
  RICH_NOTE: 'RICH_NOTE',
  FILE_UPLOAD: 'FILE_UPLOAD',
  EXTERNAL_LINK: 'EXTERNAL_LINK',
});

export const VISIBILITY = Object.freeze({
  PUBLIC: 'PUBLIC',
  ENROLLED_ONLY: 'ENROLLED_ONLY',
  PRIVATE: 'PRIVATE',
});

const lockerItemSchema = new mongoose.Schema(
  {
    spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
    educatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    folderName: { type: String, trim: true, maxlength: 60, default: 'General' },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
    itemType: { type: String, enum: Object.values(ITEM_TYPES), required: true },
    contentMarkdown: { type: String, maxlength: 200_000 },
    // FILE_UPLOAD: Cloudinary secure URL. EXTERNAL_LINK: the link itself.
    fileUrl: { type: String, trim: true },
    // Cloudinary bookkeeping, needed to delete or replace an uploaded file.
    filePublicId: { type: String, select: false },
    mimeType: { type: String },
    fileSizeKb: { type: Number, min: 0 },
    visibility: {
      type: String,
      enum: Object.values(VISIBILITY),
      default: VISIBILITY.ENROLLED_ONLY,
    },
    downloadCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// Each item type must carry the content it needs.
lockerItemSchema.pre('validate', function checkContentForType() {
  if (this.itemType === ITEM_TYPES.RICH_NOTE && !this.contentMarkdown?.trim()) {
    this.invalidate('contentMarkdown', 'A note needs some content');
  }
  if (this.itemType !== ITEM_TYPES.RICH_NOTE) {
    if (!this.fileUrl) {
      this.invalidate('fileUrl', 'A file or link item needs a URL');
    } else if (!/^https?:\/\//i.test(this.fileUrl)) {
      this.invalidate('fileUrl', 'URL must start with http:// or https://');
    }
  }
});

// GET /spaces/:spaceId/locker (filtered by visibility, grouped by folder)
lockerItemSchema.index({ spaceId: 1, visibility: 1, folderName: 1, createdAt: -1 });
// Public educator profile: their PUBLIC notes across all spaces
lockerItemSchema.index({ educatorId: 1, visibility: 1, createdAt: -1 });

export const LockerItem = mongoose.model('LockerItem', lockerItemSchema);
