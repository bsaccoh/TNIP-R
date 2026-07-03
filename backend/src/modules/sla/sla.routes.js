import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as svc from './sla.service.js';

const router = Router();
router.use(authenticate);

const canRead = requireAccess({ permissions: ['compliance:read'] });

router.get('/overview', canRead, asyncHandler(async (req, res) =>
  ok(res, await svc.slaOverview({ days: Number(req.query.days) || 30 }))));

router.get('/operator/:id(\\d+)', canRead, asyncHandler(async (req, res) => {
  const detail = await svc.slaOperatorDetail(Number(req.params.id), { days: Number(req.query.days) || 30 });
  if (!detail) return res.status(404).json({ error: 'Operator not found' });
  ok(res, detail);
}));

export default router;
