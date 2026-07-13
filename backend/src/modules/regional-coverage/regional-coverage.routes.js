import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { operatorScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as svc from './regional-coverage.service.js';

const router = Router();
router.use(authenticate);

router.get('/districts', asyncHandler(async (req, res) =>
  ok(res, await svc.listDistricts())
));

router.get('/district/:name', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await svc.districtCoverage(req.params.name, req.scope?.operatorId ?? null))
));

router.get('/all', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await svc.allDistrictsSummary(req.scope?.operatorId ?? null))
));

router.get('/national', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await svc.nationalSummary(req.scope?.operatorId ?? null))
));

export default router;
