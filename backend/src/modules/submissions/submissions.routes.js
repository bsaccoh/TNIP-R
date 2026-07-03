import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import * as svc from './submissions.service.js';

const router = Router();
router.use(authenticate);

const canRead  = requireAccess({ permissions: ['compliance:read'] });
const canWrite = requireAccess({ permissions: ['compliance:write'] });

const regulatorRoles = ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'];

/* ── Periods ─────────────────────────────────────────────────────────────── */
router.get('/periods', canRead, asyncHandler(async (req, res) => {
  const data = await svc.listPeriods({
    status: req.query.status,
    type:   req.query.type,
    limit:  req.query.limit,
    offset: req.query.offset,
  });
  ok(res, data);
}));

router.get('/periods/:id', canRead, asyncHandler(async (req, res) => {
  const period = await svc.getPeriod(req.params.id);
  if (!period) throw ApiError.badRequest('Period not found');
  ok(res, period);
}));

router.post('/periods', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can create periods');
  const period = await svc.createPeriod({ ...req.body, createdBy: req.user.userId });
  ok(res, period, 201);
}));

router.put('/periods/:id/status', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can update period status');
  const { status } = req.body;
  if (!['DRAFT','OPEN','CLOSED','ARCHIVED'].includes(status))
    throw ApiError.badRequest('Invalid status');
  const period = await svc.updatePeriodStatus(req.params.id, { status, userId: req.user.userId });
  ok(res, period);
}));

router.post('/periods/:id/publish', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can publish periods');
  const period = await svc.publishPeriod(req.params.id, req.user.userId);
  ok(res, period);
}));

/* ── Operator Submissions ────────────────────────────────────────────────── */
router.get('/my-submissions', canRead, asyncHandler(async (req, res) => {
  const operatorId = req.user.role === 'OPERATOR_USER'
    ? req.user.operatorId
    : req.query.operatorId;
  if (!operatorId) throw ApiError.badRequest('operatorId required');
  const data = await svc.getMySubmissions(operatorId);
  ok(res, data);
}));

router.post('/periods/:id/submit', canRead, asyncHandler(async (req, res) => {
  const operatorId = req.user.role === 'OPERATOR_USER'
    ? req.user.operatorId
    : req.body.operatorId;
  if (!operatorId) throw ApiError.badRequest('operatorId required');
  const row = await svc.submitData(req.params.id, operatorId, {
    notes:       req.body.notes,
    pmFileIds:   req.body.pmFileIds,
    submittedBy: req.user.userId,
  });
  ok(res, row);
}));

router.put('/periods/:id/operators/:operatorId/review', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can review submissions');
  const row = await svc.reviewSubmission(req.params.id, req.params.operatorId, {
    status:      req.body.status,
    reviewNotes: req.body.reviewNotes,
    reviewedBy:  req.user.userId,
  });
  ok(res, row);
}));

/* ── Summary ─────────────────────────────────────────────────────────────── */
router.get('/summary', canRead, asyncHandler(async (req, res) => {
  const data = await svc.submissionSummary();
  ok(res, data);
}));

export default router;
