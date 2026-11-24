import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import app from './app.js';

try {
  await connectDB();
} catch (err) {
  console.error('[db] could not connect:', err.message);
  process.exit(1);
}

const server = app.listen(env.PORT, () => {
  console.info(`[api] DeskFolio API listening on :${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal) {
  console.info(`[api] ${signal} received, shutting down`);
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
  // Force-exit if open connections don't drain in time.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('[api] unhandled rejection:', reason);
});
