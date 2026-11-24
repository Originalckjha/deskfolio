import { LockerItem, ITEM_TYPES } from '../models/LockerItem.js';
import { ClassSession } from '../models/ClassSession.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyFileContent, resourceTypeFor } from '../utils/fileType.js';
import { getSpaceAccess, allowedVisibilities, requireSpaceOwner } from '../services/access.js';
import { uploadBuffer, deleteAsset } from '../services/storage.js';

const LIST_FIELDS = '-contentMarkdown -filePublicId -__v';

// POST /spaces/:spaceId/locker  (EDUCATOR owner)
// JSON body for notes/links, or multipart/form-data with a `file` field for uploads.
export async function createItem(req, res) {
  const space = await requireSpaceOwner(req.valid.params.spaceId, req.user);
  const body = req.valid.body;
  const base = {
    spaceId: space._id,
    educatorId: req.user.id,
    title: body.title,
    folderName: body.folderName,
    visibility: body.visibility,
  };

  if (req.file) {
    const { ext, resourceType } = verifyFileContent(req.file.buffer, req.file.mimetype);
    const uploaded = await uploadBuffer(req.file.buffer, { folder: String(space._id), ext, resourceType });
    try {
      const item = await LockerItem.create({
        ...base,
        itemType: ITEM_TYPES.FILE_UPLOAD,
        fileUrl: uploaded.url,
        filePublicId: uploaded.publicId,
        mimeType: req.file.mimetype,
        fileSizeKb: Math.ceil(req.file.size / 1024),
      });
      return res.status(201).json({ success: true, item: strip(item) });
    } catch (err) {
      await deleteAsset(uploaded.publicId, resourceType); // don't orphan the upload
      throw err;
    }
  }

  const itemType = body.itemType ?? (body.fileUrl ? ITEM_TYPES.EXTERNAL_LINK : ITEM_TYPES.RICH_NOTE);
  if (itemType === ITEM_TYPES.FILE_UPLOAD) {
    throw ApiError.badRequest('Attach a file in the "file" field (multipart/form-data)');
  }

  const item = await LockerItem.create({
    ...base,
    itemType,
    ...(itemType === ITEM_TYPES.RICH_NOTE
      ? { contentMarkdown: body.contentMarkdown }
      : { fileUrl: body.fileUrl }),
  });
  res.status(201).json({ success: true, item: strip(item) });
}

// GET /spaces/:spaceId/locker  → items grouped by folder, filtered by what the viewer may see
export async function listItems(req, res) {
  const access = await getSpaceAccess(req.valid.params.spaceId, req.user);
  if (!access.canSeeSpace) throw ApiError.notFound('Space not found');

  const visible = allowedVisibilities(access);
  const items = visible.length
    ? await LockerItem.find({ spaceId: access.space._id, visibility: { $in: visible } })
        .select(LIST_FIELDS)
        .sort({ folderName: 1, createdAt: -1 })
        .lean()
    : [];

  const folders = new Map();
  for (const item of items) {
    if (!folders.has(item.folderName)) folders.set(item.folderName, []);
    folders.get(item.folderName).push(item);
  }

  res.json({
    success: true,
    access: { isOwner: access.isOwner, isEnrolled: access.isEnrolled },
    totalItems: items.length,
    folders: [...folders].map(([folderName, list]) => ({ folderName, count: list.length, items: list })),
  });
}

// GET /locker/:id  → full item including Markdown (Quick Revision reader)
export async function getItem(req, res) {
  const item = await loadReadableItem(req.valid.params.id, req.user);
  res.json({ success: true, item });
}

// PATCH /locker/:id/download  → counts the download and returns the URL to open
export async function registerDownload(req, res) {
  const item = await loadReadableItem(req.valid.params.id, req.user);
  const updated = await LockerItem.findByIdAndUpdate(
    item._id,
    { $inc: { downloadCount: 1 } },
    { returnDocument: 'after', projection: 'fileUrl downloadCount itemType' },
  ).lean();
  res.json({ success: true, fileUrl: updated.fileUrl ?? null, downloadCount: updated.downloadCount });
}

// DELETE /locker/:id  (EDUCATOR owner)
export async function deleteItem(req, res) {
  const item = await LockerItem.findById(req.valid.params.id).select('+filePublicId').lean();
  if (!item) throw ApiError.notFound('Item not found');
  if (String(item.educatorId) !== req.user.id) throw ApiError.forbidden('You can only delete your own items');

  await LockerItem.deleteOne({ _id: item._id });
  await ClassSession.updateMany({ linkedNoteId: item._id }, { $set: { linkedNoteId: null } });
  if (item.filePublicId) await deleteAsset(item.filePublicId, resourceTypeFor(item.mimeType));
  res.json({ success: true });
}

/** Loads an item the viewer is allowed to read; anything else is a 404 so hidden items stay hidden. */
async function loadReadableItem(id, user) {
  const item = await LockerItem.findById(id).select('-filePublicId -__v').lean();
  if (!item) throw ApiError.notFound('Item not found');
  const access = await getSpaceAccess(item.spaceId, user);
  if (!access.canSeeSpace || !allowedVisibilities(access).includes(item.visibility)) {
    throw ApiError.notFound('Item not found');
  }
  return item;
}

function strip(doc) {
  const { filePublicId, __v, ...rest } = doc.toObject();
  return rest;
}
