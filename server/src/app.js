import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

// The built React app (client/dist). When it exists, the API also serves the web app,
// so one deployment hosts both on one URL. Locally (no build) the Vite dev server is used.
const CLIENT_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

function serveClient(app) {
  const indexHtml = path.join(CLIENT_DIST, 'index.html');
  if (!fs.existsSync(indexHtml)) return;

  // Hashed build files never change, so browsers can cache them for a year.
  app.use('/assets', express.static(path.join(CLIENT_DIST, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }));
  // Every other GET outside /api returns the app shell so deep links (/e/:slug, /read/:id) work.
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
}

export function createApp() {
  const app = express();

  // Render (and most PaaS) sit behind one proxy; needed for correct client IPs in rate limiting.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // Google Fonts for the UI; images may come from Cloudinary or avatar hosts.
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
          'img-src': ["'self'", 'data:', 'https:'],
          'connect-src': ["'self'"],
        },
      },
    }),
  );
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
  serveClient(app);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export default createApp();
