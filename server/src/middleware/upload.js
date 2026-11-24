import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { ALLOWED_MIME_TYPES } from '../utils/fileType.js';

// Files are held in memory only long enough to stream them to Cloudinary;
// nothing binary is ever written to MongoDB or local disk.
export const uploadSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 20 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest('Only PDF, PPT/PPTX and PNG/JPEG/GIF/WEBP images are allowed'));
  },
}).single('file');
