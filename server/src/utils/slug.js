import slugify from 'slugify';
import { randomInt } from 'node:crypto';
import { EducatorProfile } from '../models/EducatorProfile.js';

const toSlug = (text) => slugify(text, { lower: true, strict: true, trim: true }).slice(0, 50).replace(/-+$/, '');

/** e.g. "Rahul Sharma" + "Physics" → "rahul-sharma-physics", then "-2", "-3"... if taken. */
export async function uniqueEducatorSlug(fullName, subject = '') {
  const base = toSlug(`${fullName} ${subject}`) || 'educator';
  if (!(await EducatorProfile.exists({ slug: base }))) return base;
  for (let n = 2; n <= 20; n += 1) {
    const candidate = `${base}-${n}`;
    if (!(await EducatorProfile.exists({ slug: candidate }))) return candidate;
  }
  return `${base}-${randomInt(1000, 99999)}`;
}

/** Escapes user input for safe use inside a RegExp. */
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
