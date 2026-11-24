import { z } from 'zod';
import { ITEM_TYPES, VISIBILITY } from '../models/LockerItem.js';
import { SESSION_STATUS } from '../models/ClassSession.js';

// ---------- shared ----------
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .regex(/^https?:\/\/\S+$/i, 'Must be an http(s) URL');
const optionalUrl = z.union([httpUrl, z.literal('')]).optional().transform((v) => v || undefined);
// Multipart forms send booleans as strings; z.coerce.boolean() would turn "false" into true.
const boolish = z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]);
const subjectName = z.string().trim().toLowerCase().min(1).max(40);

export const idParams = z.object({ id: objectId });
export const spaceParams = z.object({ spaceId: objectId });
export const educatorParams = z.object({ educatorId: objectId });
export const slugParams = z.object({ slug: z.string().trim().toLowerCase().min(1).max(80) });

// ---------- auth ----------
export const registerBody = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email('Invalid email address')),
  // bcrypt only uses the first 72 bytes
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  // ADMIN accounts are never self-registered.
  role: z.enum(['EDUCATOR', 'STUDENT']).default('STUDENT'),
  bio: z.string().trim().max(1000).optional(),
  subjects: z.array(subjectName).max(10).optional(),
});

export const loginBody = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Invalid email address')),
  password: z.string().min(1).max(72),
});

// ---------- spaces ----------
export const createSpaceBody = z.object({
  title: z.string().trim().min(2).max(120),
  subject: subjectName,
  isPublic: boolish.default(true),
});

export const joinSpaceBody = z.object({
  joinCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6,8}$/, 'Join codes are 6-8 letters or digits'),
});

// ---------- locker ----------
export const createLockerBody = z.object({
  title: z.string().trim().min(1).max(160),
  folderName: z.string().trim().max(60).optional().transform((v) => v || 'General'),
  itemType: z.enum(Object.values(ITEM_TYPES)).optional(),
  contentMarkdown: z.string().max(200_000).optional(),
  fileUrl: optionalUrl,
  visibility: z.enum(Object.values(VISIBILITY)).default(VISIBILITY.ENROLLED_ONLY),
});

// ---------- class sessions ----------
export const createSessionBody = z.object({
  title: z.string().trim().min(2).max(160),
  meetingUrl: optionalUrl,
  recordingUrl: optionalUrl,
  linkedNoteId: objectId.nullable().optional(),
  scheduledAt: z.coerce.date(),
});

export const updateSessionBody = z
  .object({
    title: z.string().trim().min(2).max(160),
    meetingUrl: z.union([httpUrl, z.literal('')]),
    recordingUrl: z.union([httpUrl, z.literal('')]),
    linkedNoteId: objectId.nullable(),
    scheduledAt: z.coerce.date(),
    status: z.enum(Object.values(SESSION_STATUS)),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, 'Nothing to update');

// ---------- ratings & leaderboard ----------
export const rateBody = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  reviewText: z.string().trim().max(1000).optional().default(''),
});

export const leaderboardQuery = z.object({
  subject: z.string().trim().toLowerCase().max(40).optional().transform((v) => v || undefined),
  q: z.string().trim().max(60).optional().transform((v) => v || undefined),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
