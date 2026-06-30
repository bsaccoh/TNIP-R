// Small helpers for consistent API responses and list pagination.

export function ok(res, data, meta) {
  return res.json(meta ? { data, meta } : { data });
}

export function created(res, data) {
  return res.status(201).json({ data });
}

/** Parse ?page & ?limit into LIMIT/OFFSET (1-based page). */
export function paginate(req, { defaultLimit = 25, maxLimit = 200 } = {}) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

export function pageMeta(page, limit, total) {
  return { page, limit, total, pages: Math.ceil(total / limit) || 1 };
}
