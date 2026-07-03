import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import * as svc from './disputes.service.js';

const router = Router();
router.use(authenticate);

const canReview = requireAccess({ roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'] });

/* List disputes — operators see only their own, regulators see all */
router.get('/', asyncHandler(async (req, res) => {
  const operatorId = req.user.roleKey === 'OPERATOR_USER'
    ? req.user.operatorId
    : (req.query.operatorId ? Number(req.query.operatorId) : undefined);

  ok(res, await svc.listDisputes({
    operatorId, status: req.query.status,
    from: req.query.from, to: req.query.to,
    limit: req.query.limit ? Number(req.query.limit) : 50,
    offset: req.query.offset ? Number(req.query.offset) : 0,
  }));
}));

/* Summary */
router.get('/summary', asyncHandler(async (req, res) => {
  const operatorId = req.user.roleKey === 'OPERATOR_USER'
    ? req.user.operatorId
    : (req.query.operatorId ? Number(req.query.operatorId) : undefined);
  ok(res, await svc.disputeSummary(operatorId));
}));

/* Get single */
router.get('/:id', asyncHandler(async (req, res) => {
  const d = await svc.getDispute(Number(req.params.id));
  if (!d) return res.status(404).json({ message: 'Dispute not found' });
  // Operator can only see their own
  if (req.user.roleKey === 'OPERATOR_USER' && d.operator_id !== req.user.operatorId)
    throw ApiError.forbidden('Access denied');
  ok(res, d);
}));

/* Create (operator submits) */
router.post('/', asyncHandler(async (req, res) => {
  const { caseId, complianceId, title, description, evidence } = req.body;
  const operatorId = req.user.roleKey === 'OPERATOR_USER'
    ? req.user.operatorId
    : Number(req.body.operatorId);
  if (!operatorId) throw ApiError.badRequest('operatorId required');

  ok(res, await svc.createDispute({
    operatorId, caseId: caseId ? Number(caseId) : undefined,
    complianceId: complianceId ? Number(complianceId) : undefined,
    title, description, evidence, submittedBy: req.user.userId,
  }));
}));

/* Review / update status (regulator only) */
router.put('/:id/review', canReview, asyncHandler(async (req, res) => {
  const { status, reviewNotes } = req.body;
  ok(res, await svc.reviewDispute(Number(req.params.id), {
    status, reviewNotes, reviewedBy: req.user.userId,
  }));
}));

export default router;
