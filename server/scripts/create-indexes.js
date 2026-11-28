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
    let pw = pass;
    try {
      pw = decodeURIComponent(pass);
    } catch {
      /* keep raw */
    }
    // The shape of the password (never its characters), so a mismatch can be spotted:
    // compare these counts with the password you meant to use.
    const letters = (pw.match(/[A-Za-z]/g) || []).length;
    const digits = (pw.match(/[0-9]/g) || []).length;
    const other = pw.length - letters - digits;
    console.info(
      `[indexes] connecting: ${scheme}://${decodeURIComponent(user) || '(no user)'} @ ${host}${db || ' (no database name)'}` +
        ` | password: ${pw.length} chars (${letters} letters, ${digits} digits, ${other} other)`,
    );
    if (/db_password/i.test(pw) || /[<>]/.test(pw)) {
      console.warn('[indexes] WARNING: the password still contains the "<db_password>" placeholder text or "<" / ">".');
    }
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
