import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

// CLIENT_ORIGINS entries may use * as a wildcard, e.g. https://deskfolio-*.vercel.app
// for Vercel preview deployments.
const originMatchers = env.CLIENT_ORIGINS.map((o) =>
  o.includes('*')
    ? new RegExp(`^${o.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]+')}$`, 'i')
    : o,
);
const isAllowedOrigin = (origin) =>
  originMatchers.some((m) => (typeof m === 'string' ? m === origin : m.test(origin)));

export function createApp() {
  const app = express();

  // Render (and most PaaS) sit behind one proxy; needed for correct client IPs in rate limiting.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      // Requests without an Origin header (curl, server-to-server, health checks) are allowed;
      // CORS only governs browsers.
      origin: (origin, cb) => cb(null, !origin || isAllowedOrigin(origin)),
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  if (env.NODE_ENV !== 'test') app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({
      status: dbUp ? 'ok' : 'degraded',
      db: dbUp ? 'up' : 'down',
      uptimeSec: Math.round(process.uptime()),
    });
  });

  app.use('/api/v1', apiLimiter, apiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export default createApp();
