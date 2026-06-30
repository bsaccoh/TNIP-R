import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';

// 404 fallthrough
export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.path}` } });
}

// Central error handler — last middleware.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { message: 'Validation failed', details: err.flatten() },
    });
  }
  if (err instanceof ApiError) {
    if (err.status >= 500) logger.error(err.message, { stack: err.stack });
    return res.status(err.status).json({ error: { message: err.message, details: err.details } });
  }
  // Duplicate key etc.
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: { message: 'Duplicate resource' } });
  }
  logger.error(err.message || 'Unhandled error', { stack: err.stack });
  return res.status(500).json({ error: { message: 'Internal server error' } });
}
