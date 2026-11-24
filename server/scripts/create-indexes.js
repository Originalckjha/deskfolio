/**
 * Creates every Mongoose index in the target database. Production boots with
 * autoIndex off, so run this once per deploy (render.yaml runs it in the build).
 * Safe to repeat: existing indexes are left alone, nothing is dropped.
 *
 *   npm run db:indexes        (uses MONGODB_URI from the environment / .env)
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import * as models from '../src/models/index.js';

await mongoose.connect(env.MONGODB_URI, { autoIndex: false, serverSelectionTimeoutMS: 15_000 });

const all = Object.values(models).filter((m) => typeof m?.createIndexes === 'function');
for (const Model of all) {
  await Model.createIndexes();
  const names = Object.keys(await Model.collection.indexInformation());
  console.info(`[indexes] ${Model.modelName}: ${names.join(', ')}`);
}

await mongoose.disconnect();
console.info(`[indexes] done (${all.length} collections)`);
