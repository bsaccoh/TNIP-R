import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { listAuditLogs, getActionTypes } from './audit.service.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('SYSTEM_ADMIN', 'REGULATOR_ADMIN'));

router.get('/', asyncHandler(async (req, res) => {
  const { userId, action, entityType, from, to, limit, offset } = req.query;
  return ok(res, await listAuditLogs({ userId, action, entityType, from, to, limit, offset }));
}));

router.get('/actions', asyncHandler(async (_req, res) => ok(res, await getActionTypes())));

export default router;
