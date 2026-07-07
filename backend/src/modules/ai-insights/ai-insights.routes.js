import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as svc from './ai-insights.service.js';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (req, res) =>
  ok(res, await svc.listInsights({
    domain:   req.query.domain,
    severity: req.query.severity,
    status:   req.query.status,
  }))
));

router.get('/summary', asyncHandler(async (req, res) =>
  ok(res, await svc.insightSummary())
));

router.get('/health', asyncHandler(async (req, res) =>
  ok(res, await svc.networkHealthScore())
));

router.patch('/:id', asyncHandler(async (req, res) =>
  ok(res, await svc.updateInsight(req.params.id, req.body))
));

export default router;
