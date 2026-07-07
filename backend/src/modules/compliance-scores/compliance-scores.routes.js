import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { operatorScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as service from './compliance-scores.service.js';

const router = Router();
router.use(authenticate);

router.get('/latest', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.latestScores(req.scope?.operatorId ?? null))
));

router.get('/trends', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.scoreTrends(
    req.scope?.operatorId ?? null,
    req.query.domain,
  ))
));

router.get('/summary', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.scoreSummary(req.scope?.operatorId ?? null))
));

export default router;
