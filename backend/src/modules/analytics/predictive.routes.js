import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as svc from './predictive.service.js';

const router = Router();
router.use(authenticate);

const canRead = requireAccess({ permissions: ['compliance:read'] });

router.get('/summary',          canRead, asyncHandler(async (req, res) =>
  ok(res, await svc.predictiveSummary())));

router.get('/kpi-trends',       canRead, asyncHandler(async (req, res) =>
  ok(res, await svc.kpiTrends({
    operatorId:   req.query.operatorId,
    days:         Number(req.query.days)        || 90,
    horizonDays:  Number(req.query.horizonDays) || 90,
  }))));

router.get('/health-scores',    canRead, asyncHandler(async (_req, res) =>
  ok(res, await svc.operatorHealthScores())));

router.get('/obligation-risks', canRead, asyncHandler(async (_req, res) =>
  ok(res, await svc.obligationRiskWatchlist())));

export default router;
