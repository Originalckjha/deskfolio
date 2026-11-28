/**
 * Helpers for MONGODB_URI values pasted into hosting dashboards.
 * They tidy up common paste slips and explain anything still wrong, without ever
 * printing the password.
 */

/** Strips the slips people make when pasting: spaces/newlines, quotes, a "MONGODB_URI=" prefix. */
export function cleanMongoUri(raw) {
  if (typeof raw !== 'string') return raw;
  let v = raw.trim();
  v = v.replace(/^MONGODB_URI\s*=\s*/i, '').trim();
  v = v.replace(/^(['"`])([\s\S]*)\1$/, '$2').trim();
  // Line breaks or spaces inside a URI are never valid; they come from wrapped copies.
  return v.replace(/\s+/g, '');
}

/** The URI with the password replaced by •••, safe to log. */
export function maskMongoUri(uri) {
  // Mask everything up to the LAST "@", so a password that itself contains "@" stays hidden.
  return String(uri).replace(/^(mongodb(?:\+srv)?:\/\/[^:/@]*:)(.*)@(?=[^@]*$)/i, (_m, head, pw) => `${head}${'•'.repeat(Math.min(pw.length, 8)) || '(empty)'}@`);
}

/** Human-readable problems with a (cleaned) URI; empty array when it looks valid. */
export function mongoUriProblems(uri) {
  const problems = [];
  if (!uri) return ['MONGODB_URI is empty'];
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    problems.push('must start with "mongodb+srv://" (copy the whole string from Atlas → Connect → Drivers)');
    return problems;
  }
  if (/[<>]/.test(uri)) {
    problems.push('still contains "<" or ">": replace <db_password> (including the angle brackets) with the real password');
  }
  const rest = uri.replace(/^mongodb(\+srv)?:\/\//i, '');
  const ats = (rest.match(/@/g) || []).length;
  // No "@" is fine for a local server without auth (mongodb://127.0.0.1/db), but Atlas always needs it.
  if (ats === 0 && /mongodb\.net/i.test(rest)) {
    problems.push('has no "@": it should look like user:password@cluster0.xxxxx.mongodb.net/...');
  }
  if (ats > 1) {
    problems.push('has more than one "@": the password probably contains "@". Autogenerate a new password in Atlas (letters and digits only) or URL-encode it');
  }
  if (ats === 1) {
    const [cred, hostPart] = rest.split('@');
    if (!cred.includes(':')) problems.push('is missing ":password" after the username');
    if (/[/?#]/.test(cred)) {
      problems.push('the password contains "/", "?" or "#": autogenerate a new password in Atlas or URL-encode it');
    }
    if ((cred.match(/:/g) || []).length > 1) {
      problems.push('the password contains ":": autogenerate a new password in Atlas or URL-encode it');
    }
    if (!/^[a-z0-9.-]+(:\d+)?(,[a-z0-9.-]+(:\d+)?)*(\/|$|\?)/i.test(hostPart)) {
      problems.push('the part after "@" should be the cluster host, e.g. cluster0.xxxxx.mongodb.net');
    }
  }
  return problems;
}
