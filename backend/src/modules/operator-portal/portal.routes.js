import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import { operatorOverview } from './portal.service.js';

const router = Router();
router.use(authenticate);

// Any authenticated user can access their own overview.
// OPERATOR_USER gets their bound operatorId; regulators must pass ?operatorId=
router.get('/overview', asyncHandler(async (req, res) => {
  let operatorId;

  if (req.user.roleKey === 'OPERATOR_USER') {
    if (!req.user.operatorId) throw ApiError.forbidden('No operator binding on this account');
    operatorId = req.user.operatorId;
  } else {
    // Regulator impersonating a specific operator for review
    if (!req.query.operatorId) throw ApiError.badRequest('operatorId query param required');
    operatorId = Number(req.query.operatorId);
  }

  ok(res, await operatorOverview(operatorId));
}));

export default router;
