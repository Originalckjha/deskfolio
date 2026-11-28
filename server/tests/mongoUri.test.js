import { describe, it, expect } from 'vitest';
import { cleanMongoUri, maskMongoUri, mongoUriProblems } from '../src/config/mongoUri.js';

const GOOD = 'mongodb+srv://user:Abc123xyz@cluster0.abcde.mongodb.net/deskfolio?retryWrites=true&w=majority';

describe('MONGODB_URI helpers', () => {
  it('accepts a correct Atlas string and local strings without credentials', () => {
    expect(mongoUriProblems(GOOD)).toEqual([]);
    expect(mongoUriProblems('mongodb://127.0.0.1:27017/deskfolio-test')).toEqual([]);
  });

  it('cleans common paste slips', () => {
    for (const raw of [`  ${GOOD}\n`, `"${GOOD}"`, `MONGODB_URI=${GOOD}`, GOOD.replace('net/', 'net/\n'), `'${GOOD}' `]) {
      expect(cleanMongoUri(raw)).toBe(GOOD);
    }
  });

  it('encodes special characters in a raw password so the URI parses', () => {
    const raw = GOOD.replace('Abc123xyz', 'p@ss:w/rd?#%x');
    const cleaned = cleanMongoUri(raw);
    expect(cleaned).toBe(GOOD.replace('Abc123xyz', encodeURIComponent('p@ss:w/rd?#%x')));
    expect(mongoUriProblems(cleaned)).toEqual([]);
    // Already-encoded passwords are not double-encoded.
    expect(cleanMongoUri(cleaned)).toBe(cleaned);
    // Plain passwords are untouched.
    expect(cleanMongoUri(GOOD)).toBe(GOOD);
  });

  it('explains placeholders, missing parts and unsafe password characters', () => {
    expect(mongoUriProblems(GOOD.replace('Abc123xyz', '<db_password>')).join()).toMatch(/angle brackets/);
    expect(mongoUriProblems('Abc123xyz').join()).toMatch(/must start with/);
    expect(mongoUriProblems(GOOD.replace('Abc123xyz', 'p@ss')).join()).toMatch(/more than one "@"/);
    expect(mongoUriProblems(GOOD.replace('Abc123xyz', 'pa/ss')).join()).toMatch(/"\/", "\?" or "#"/);
    expect(mongoUriProblems(GOOD.replace('Abc123xyz', 'pa:ss')).join()).toMatch(/contains ":"/);
    expect(mongoUriProblems('mongodb+srv://cluster0.abcde.mongodb.net/x').join()).toMatch(/no "@"/);
  });

  it('never prints the password', () => {
    const masked = maskMongoUri(GOOD);
    expect(masked).not.toContain('Abc123xyz');
    const tricky = maskMongoUri(GOOD.replace('Abc123xyz', 'se@cr@et'));
    for (const piece of ['se@', 'cr@', '@et', 'cr@et']) expect(tricky).not.toContain(piece);
    expect(tricky).toMatch(/:•+@cluster0/);
    expect(masked).toMatch(/^mongodb\+srv:\/\/user:•+@cluster0\.abcde\.mongodb\.net\/deskfolio\?/);
  });
});
