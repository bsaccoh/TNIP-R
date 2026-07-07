import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { operatorScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as service from './fiber.service.js';

const router = Router();
router.use(authenticate);

router.get('/kpis', asyncHandler(async (_req, res) =>
  ok(res, await service.listKpiDefinitions())
));

router.get('/nodes', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.listNodes(req.scope?.operatorId ?? null))
));

router.get('/timeseries', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.fiberKpiTimeSeries({
    operatorId: req.scope?.operatorId ?? null,
    from: req.query.from,
    to:   req.query.to,
  }))
));

router.get('/summary', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.fiberSummary(req.scope?.operatorId ?? null))
));

router.get('/topology', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.fiberTopology(req.scope?.operatorId ?? null))
));

router.get('/outages', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.listOutages(req.scope?.operatorId ?? null))
));

export default router;
