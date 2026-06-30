import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as service from './ranking.service.js';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (_req, res) => ok(res, await service.currentRankings())));
router.post('/compute', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'),
  asyncHandler(async (_req, res) => ok(res, await service.computeRankings())));

export default router;
