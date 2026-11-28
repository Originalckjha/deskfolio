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

// Show what we're connecting with (password never printed, only its length) so a
// wrong user, host or empty password is obvious in the deploy log.
{
  const m = env.MONGODB_URI.match(/^(mongodb(?:\+srv)?):\/\/(?:([^:@]*)(?::([^@]*))?@)?([^/?]+)(\/[^?]*)?/i);
  if (m) {
    const [, scheme, user = '', pass = '', host, db = ''] = m;
    const pwLen = pass ? decodeURIComponent(pass).length : 0;
    console.info(
      `[indexes] connecting: ${scheme}://${decodeURIComponent(user) || '(no user)'} @ ${host}${db || ' (no database name)'} | password: ${pwLen} chars`,
    );
  }
}

try {
  await mongoose.connect(env.MONGODB_URI, { autoIndex: false, serverSelectionTimeoutMS: 15_000 });
} catch (err) {
  if (/auth/i.test(err.message)) {
    console.error(
      '[indexes] Atlas rejected the username/password. In Atlas → Database Access, check the user above exists in this project,' +
        ' and reset its password if unsure; then paste the new one into MONGODB_URI.',
    );
  }
  throw err;
}

const all = Object.values(models).filter((m) => typeof m?.createIndexes === 'function');
for (const Model of all) {
  await Model.createIndexes();
  const names = Object.keys(await Model.collection.indexInformation());
  console.info(`[indexes] ${Model.modelName}: ${names.join(', ')}`);
}

await mongoose.disconnect();
console.info(`[indexes] done (${all.length} collections)`);
