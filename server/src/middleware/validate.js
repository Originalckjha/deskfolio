/**
 * Parses request parts with zod schemas and stores the typed result on req.valid.
 * (Express 5 makes req.query read-only, so parsed values never overwrite req.*.)
 * Failures throw a ZodError, which errorHandler turns into a 400.
 *
 *   router.post('/x', validate({ params: idParams, body: createSchema }), handler)
 */
export const validate = (schemas) => (req, _res, next) => {
  req.valid ??= {};
  for (const part of ['params', 'query', 'body']) {
    if (schemas[part]) req.valid[part] = schemas[part].parse(req[part] ?? {});
  }
  next();
};
