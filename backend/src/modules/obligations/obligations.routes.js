import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import * as svc from './obligations.service.js';

const router = Router();
router.use(authenticate);

const canRead  = requireAccess({ permissions: ['compliance:read'] });
const canWrite = requireAccess({ permissions: ['compliance:write'] });

const regulatorRoles = ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'];

router.get('/', canRead, asyncHandler(async (req, res) => {
  const operatorId = req.user.role === 'OPERATOR_USER'
    ? req.user.operatorId
    : req.query.operatorId;
  const data = await svc.listObligations({
    operatorId, status: req.query.status, type: req.query.type,
    dueBefore: req.query.dueBefore, dueAfter: req.query.dueAfter,
    limit: req.query.limit, offset: req.query.offset,
  });
  ok(res, data);
}));

router.get('/summary', canRead, asyncHandler(async (req, res) => {
  const operatorId = req.user.role === 'OPERATOR_USER'
    ? req.user.operatorId
    : req.query.operatorId;
  const data = await svc.obligationSummary(operatorId);
  ok(res, data);
}));

router.post('/auto-update', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can trigger auto-update');
  const data = await svc.autoUpdateStatuses();
  ok(res, data);
}));

router.get('/:id', canRead, asyncHandler(async (req, res) => {
  const obl = await svc.getObligation(req.params.id);
  if (!obl) throw ApiError.badRequest('Obligation not found');
  if (req.user.role === 'OPERATOR_USER' && obl.operator_id !== req.user.operatorId)
    throw ApiError.forbidden();
  ok(res, obl);
}));

router.post('/', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can create obligations');
  const obl = await svc.createObligation({ ...req.body, createdBy: req.user.userId });
  ok(res, obl, 201);
}));

router.put('/:id', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can update obligations');
  const obl = await svc.updateObligation(req.params.id, req.body);
  ok(res, obl);
}));

router.put('/:id/status', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can change obligation status');
  const obl = await svc.updateStatus(req.params.id, {
    status: req.body.status,
    userId: req.user.userId,
    waiverReason: req.body.waiverReason,
    currentValue: req.body.currentValue,
  });
  ok(res, obl);
}));

router.post('/:id/progress', canWrite, asyncHandler(async (req, res) => {
  const obl = await svc.getObligation(req.params.id);
  if (!obl) throw ApiError.badRequest('Obligation not found');
  const updated = await svc.recordProgress(req.params.id, {
    measuredValue:   req.body.measuredValue,
    measurementDate: req.body.measurementDate,
    notes:           req.body.notes,
    recordedBy:      req.user.userId,
  });
  ok(res, updated);
}));

export default router;
