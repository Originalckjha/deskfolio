import dotenv from 'dotenv';
import { z } from 'zod';
import { cleanMongoUri, maskMongoUri, mongoUriProblems } from './mongoUri.js';

dotenv.config({ quiet: true });

const csv = (value) =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_ORIGINS: z.string().default('http://localhost:5173').transform(csv),

  MONGODB_URI: z.preprocess(
    cleanMongoUri,
    z
      .string()
      .min(1, 'MONGODB_URI is required')
      .superRefine((uri, ctx) => {
        const problems = mongoUriProblems(uri);
        if (problems.length) {
          ctx.addIssue({
            code: 'custom',
            message: `${problems.join('; ')}\n      value seen (password hidden): ${maskMongoUri(uri)}`,
          });
        }
      }),
  ),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // Optional so the API boots without uploads configured; the storage service
  // refuses FILE_UPLOAD requests when these are missing.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('deskfolio'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(15),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  RANKING_MIN_REVIEWS_M: z.coerce.number().positive().default(10),
  RANKING_BASELINE_C: z.coerce.number().min(1).max(5).default(4.0),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = Object.freeze({
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  cloudinaryEnabled: Boolean(
    parsed.data.CLOUDINARY_CLOUD_NAME &&
      parsed.data.CLOUDINARY_API_KEY &&
      parsed.data.CLOUDINARY_API_SECRET,
  ),
});
