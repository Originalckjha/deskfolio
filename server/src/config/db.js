import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDB(uri = env.MONGODB_URI) {
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
  mongoose.connection.on('reconnected', () => console.info('[db] reconnected'));
  mongoose.connection.on('error', (err) => console.error('[db] error:', err.message));

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 10,
    // Build indexes automatically in dev; in production create them once
    // (Atlas UI or `Model.syncIndexes()`) to avoid blocking boot on big collections.
    autoIndex: !env.isProd,
  });

  console.info(`[db] connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.connection.close();
}
