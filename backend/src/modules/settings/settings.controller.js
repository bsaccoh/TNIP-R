import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as service from './settings.service.js';

export const getSettings = asyncHandler(async (_req, res) =>
  ok(res, await service.getAll()));

export const updateSettings = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: { message: 'Body must be a key-value object' } });
  }
  return ok(res, await service.setMany(req.body));
});
