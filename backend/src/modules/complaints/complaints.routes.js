import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { operatorScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as service from './complaints.service.js';

const router = Router();
router.use(authenticate);

router.get('/', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.listComplaints({
    operatorId: req.scope?.operatorId ?? (req.query.operatorId ? Number(req.query.operatorId) : null),
    status:   req.query.status,
    category: req.query.category,
    severity: req.query.severity,
    from:     req.query.from,
    to:       req.query.to,
  }))
));

router.get('/summary', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.complaintSummary(req.scope?.operatorId ?? (req.query.operatorId ? Number(req.query.operatorId) : null)))
));

router.patch('/:id', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.updateComplaint(req.params.id, req.body))
));

export default router;
