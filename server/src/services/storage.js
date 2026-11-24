import { randomUUID } from 'node:crypto';
import { cloudinary } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Streams a buffer to Cloudinary. PDFs and slides go up as `raw` so they download
 * as the original file (Cloudinary treats PDFs uploaded as `image` as restricted
 * on many accounts). Raw public IDs keep their extension so downloads open correctly.
 * Returns { url, publicId, bytes }.
 */
export function uploadBuffer(buffer, { folder, ext, resourceType }) {
  if (!env.cloudinaryEnabled) {
    throw new ApiError(503, 'File uploads are not configured on this server');
  }
  const id = randomUUID();
  const publicId = resourceType === 'raw' ? `${id}.${ext}` : id;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.CLOUDINARY_FOLDER}/${folder}`,
        public_id: publicId,
        resource_type: resourceType,
        overwrite: false,
      },
      (err, result) => {
        if (err) return reject(new ApiError(502, `Upload failed: ${err.message}`));
        resolve({ url: result.secure_url, publicId: result.public_id, bytes: result.bytes });
      },
    );
    stream.end(buffer);
  });
}

/** Best-effort delete; a failure here should never break the user's request. */
export async function deleteAsset(publicId, resourceType) {
  if (!publicId || !env.cloudinaryEnabled) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
  } catch (err) {
    console.warn(`[storage] could not delete ${publicId}:`, err.message);
  }
}
