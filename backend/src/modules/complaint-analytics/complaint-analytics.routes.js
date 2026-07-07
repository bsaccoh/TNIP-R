import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { operatorScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as svc from './complaint-analytics.service.js';

const router = Router();
router.use(authenticate);

router.get('/metrics', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await svc.resolutionMetrics(req.scope?.operatorId ?? null))
));

router.get('/trend', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await svc.resolutionTrend(req.scope?.operatorId ?? null))
));

router.get('/benchmark', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await svc.operatorBenchmark(req.scope?.operatorId ?? null))
));

router.get('/categories', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await svc.categoryBreakdown(req.scope?.operatorId ?? null))
));

router.get('/sla-breaches', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await svc.slaBreaches(req.scope?.operatorId ?? null))
));

router.get('/weekly', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await svc.weeklyTrend(req.scope?.operatorId ?? null))
));

export default router;
