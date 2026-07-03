import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import * as svc from './penalties.service.js';

const router = Router();
router.use(authenticate);

const canRead  = requireAccess({ permissions: ['compliance:read'] });
const canWrite = requireAccess({ permissions: ['compliance:write'] });

const regulatorRoles = ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'];

/* ── Rules ───────────────────────────────────────────────────────────────── */
router.get('/rules', canRead, asyncHandler(async (req, res) => {
  const data = await svc.listRules({ active: req.query.active !== 'false' ? true : undefined });
  ok(res, data);
}));

router.post('/rules', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can create penalty rules');
  const rule = await svc.createRule({ ...req.body, createdBy: req.user.userId });
  ok(res, rule, 201);
}));

router.put('/rules/:id', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can update penalty rules');
  const rule = await svc.updateRule(req.params.id, req.body);
  ok(res, rule);
}));

/* ── Assessments ─────────────────────────────────────────────────────────── */
router.get('/', canRead, asyncHandler(async (req, res) => {
  const operatorId = req.user.role === 'OPERATOR_USER'
    ? req.user.operatorId
    : req.query.operatorId;
  const data = await svc.listAssessments({
    operatorId, status: req.query.status,
    limit: req.query.limit, offset: req.query.offset,
  });
  ok(res, data);
}));

router.get('/summary', canRead, asyncHandler(async (req, res) => {
  const operatorId = req.user.role === 'OPERATOR_USER'
    ? req.user.operatorId
    : req.query.operatorId;
  const data = await svc.penaltySummary(operatorId);
  ok(res, data);
}));

router.post('/auto-generate', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can auto-generate penalties');
  const data = await svc.autoGenerateFromObligations(req.user.userId);
  ok(res, data);
}));

router.get('/:id', canRead, asyncHandler(async (req, res) => {
  const a = await svc.getAssessment(req.params.id);
  if (!a) throw ApiError.badRequest('Assessment not found');
  if (req.user.role === 'OPERATOR_USER' && a.operator_id !== req.user.operatorId)
    throw ApiError.forbidden();
  ok(res, a);
}));

router.post('/', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can create assessments');
  const a = await svc.createAssessment({ ...req.body, createdBy: req.user.userId });
  ok(res, a, 201);
}));

router.put('/:id/issue', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can issue penalties');
  const a = await svc.issueAssessment(req.params.id, {
    userId: req.user.userId, dueDate: req.body.dueDate,
  });
  ok(res, a);
}));

router.put('/:id/status', canWrite, asyncHandler(async (req, res) => {
  const a = await svc.updateAssessmentStatus(req.params.id, {
    status: req.body.status, paidAmount: req.body.paidAmount,
    notes: req.body.notes, userId: req.user.userId,
  });
  ok(res, a);
}));

export default router;
