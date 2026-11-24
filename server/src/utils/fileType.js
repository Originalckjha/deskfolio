import { ApiError } from './ApiError.js';

const startsWith = (buf, bytes, offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));

const ZIP = [0x50, 0x4b, 0x03, 0x04]; // PPTX is a zip container
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // legacy PPT

// Declared MIME type → magic-byte check, extension, and Cloudinary resource type.
// SVG is deliberately absent: it can carry scripts.
const TYPES = {
  'application/pdf': { ext: 'pdf', resourceType: 'raw', test: (b) => startsWith(b, ascii('%PDF-')) },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    ext: 'pptx',
    resourceType: 'raw',
    test: (b) => startsWith(b, ZIP),
  },
  'application/vnd.ms-powerpoint': { ext: 'ppt', resourceType: 'raw', test: (b) => startsWith(b, OLE) },
  'image/png': { ext: 'png', resourceType: 'image', test: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47]) },
  'image/jpeg': { ext: 'jpg', resourceType: 'image', test: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  'image/gif': { ext: 'gif', resourceType: 'image', test: (b) => startsWith(b, ascii('GIF8')) },
  'image/webp': {
    ext: 'webp',
    resourceType: 'image',
    test: (b) => startsWith(b, ascii('RIFF')) && startsWith(b, ascii('WEBP'), 8),
  },
};

export const ALLOWED_MIME_TYPES = new Set(Object.keys(TYPES));

/** Cloudinary resource type for a stored MIME type (used when deleting). */
export const resourceTypeFor = (mime) => TYPES[mime]?.resourceType ?? 'raw';

/**
 * Confirms the file content matches its declared type (the browser-supplied
 * MIME type is trivially spoofed). Returns { ext, resourceType }.
 */
export function verifyFileContent(buffer, declaredMime) {
  const type = TYPES[declaredMime];
  if (!type || !type.test(buffer)) {
    throw ApiError.badRequest('File content does not match its type');
  }
  return { ext: type.ext, resourceType: type.resourceType };
}
