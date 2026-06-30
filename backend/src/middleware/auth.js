import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Verifies the Bearer access token and attaches req.user:
 *   { userId, roleKey, operatorId, email }
 */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(ApiError.unauthorized('Missing access token'));
  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = {
      userId: payload.sub,
      roleKey: payload.role,
      operatorId: payload.operatorId ?? null,
      email: payload.email,
    };
    return next();
  } catch {
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}
