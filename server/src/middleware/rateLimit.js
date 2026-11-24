import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

const common = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  handler: (_req, res, _next, options) =>
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many requests, please try again later',
    }),
};

/** All /api/v1 traffic. */
export const apiLimiter = rateLimit({ ...common, limit: env.RATE_LIMIT_MAX });

/** Login and register: slows down password guessing and signup spam. */
export const authLimiter = rateLimit({ ...common, limit: env.AUTH_RATE_LIMIT_MAX });
