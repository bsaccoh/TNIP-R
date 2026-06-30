import { z } from 'zod';
import * as service from './operators.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginate, pageMeta } from '../../utils/http.js';
import { audit } from '../../utils/audit.js';

const upsertSchema = z.object({
  operator_name: z.string().min(2),
  license_number: z.string().optional(),
  license_type: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'UNDER_REVIEW']).optional(),
  country: z.string().optional(),
  contact_email: z.string().email().optional(),
  logo_url: z.string().url().optional(),
});

export const listController = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const { rows, total } = await service.list({
    status: req.query.status,
    scopeOperatorId: req.scope?.operatorId ?? null,
    limit, offset,
  });
  return ok(res, rows, pageMeta(page, limit, total));
});

export const getController = asyncHandler(async (req, res) => {
  return ok(res, await service.getWithSummary(Number(req.params.operatorId)));
});

export const createController = asyncHandler(async (req, res) => {
  const data = upsertSchema.parse(req.body);
  const op = await service.create(data);
  await audit({ userId: req.user.userId, action: 'OPERATOR_CREATE', entityType: 'operator', entityId: op.operator_id, ip: req.ip });
  return created(res, op);
});

export const updateController = asyncHandler(async (req, res) => {
  const data = upsertSchema.parse(req.body);
  const op = await service.update(Number(req.params.operatorId), data);
  await audit({ userId: req.user.userId, action: 'OPERATOR_UPDATE', entityType: 'operator', entityId: req.params.operatorId, ip: req.ip });
  return ok(res, op);
});

export const deleteController = asyncHandler(async (req, res) => {
  await service.remove(Number(req.params.operatorId));
  await audit({ userId: req.user.userId, action: 'OPERATOR_DELETE', entityType: 'operator', entityId: req.params.operatorId, ip: req.ip });
  return ok(res, { deleted: true });
});
