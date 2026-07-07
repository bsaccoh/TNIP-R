import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { operatorScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as service from './core-network.service.js';

const router = Router();
router.use(authenticate);

router.get('/elements', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.listElements(req.scope?.operatorId ?? null))
));

router.get('/summary', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.coreSummary(req.scope?.operatorId ?? null))
));

router.get('/alarms', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.listAlarms(req.scope?.operatorId ?? null))
));

router.get('/elements/:id', asyncHandler(async (req, res) =>
  ok(res, await service.elementDetail(req.params.id))
));

export default router;
