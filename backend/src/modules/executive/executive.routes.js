import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { operatorScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as service from './executive.service.js';

const router = Router();
router.use(authenticate);

router.get('/overview', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.fiveDomainOverview(req.scope?.operatorId ?? null))
));

export default router;
