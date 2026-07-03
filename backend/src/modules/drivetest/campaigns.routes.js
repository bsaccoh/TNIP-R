import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import * as svc from './campaigns.service.js';

const router = Router();
router.use(authenticate);

const canRead  = requireAccess({ permissions: ['drivetest:read'] });
const canWrite = requireAccess({ permissions: ['drivetest:write'] });

const regulatorRoles = ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'];

/* ── List / Summary ──────────────────────────────────────────────────────── */
router.get('/summary', canRead, asyncHandler(async (req, res) => {
  ok(res, await svc.campaignSummary());
}));

router.get('/', canRead, asyncHandler(async (req, res) => {
  const operatorId = req.user.role === 'OPERATOR_USER'
    ? req.user.operatorId
    : req.query.operatorId;
  ok(res, await svc.listCampaigns({
    operatorId, status: req.query.status,
    limit: req.query.limit, offset: req.query.offset,
  }));
}));

/* ── Create ──────────────────────────────────────────────────────────────── */
router.post('/', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can create campaigns');
  const campaign = await svc.createCampaign({ ...req.body, createdBy: req.user.userId });
  ok(res, campaign, 201);
}));

/* ── Single campaign ─────────────────────────────────────────────────────── */
router.get('/:id', canRead, asyncHandler(async (req, res) => {
  const c = await svc.getCampaign(req.params.id);
  if (!c) throw ApiError.badRequest('Campaign not found');
  if (req.user.role === 'OPERATOR_USER' && c.operator_id !== req.user.operatorId)
    throw ApiError.forbidden();
  ok(res, c);
}));

router.put('/:id', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can update campaigns');
  ok(res, await svc.updateCampaign(req.params.id, req.body));
}));

/* ── Status transitions ──────────────────────────────────────────────────── */
router.put('/:id/status', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can change campaign status');
  ok(res, await svc.updateStatus(req.params.id, req.body.status));
}));

/* ── Test linkage ────────────────────────────────────────────────────────── */
router.post('/:id/tests', canWrite, asyncHandler(async (req, res) => {
  const { driveTestId } = req.body;
  if (!driveTestId) throw ApiError.badRequest('driveTestId required');
  ok(res, await svc.addTest(req.params.id, driveTestId));
}));

router.delete('/:id/tests/:driveTestId', canWrite, asyncHandler(async (req, res) => {
  await svc.removeTest(req.params.id, req.params.driveTestId);
  ok(res, { removed: true });
}));

/* ── Analytics ───────────────────────────────────────────────────────────── */
router.get('/:id/analytics', canRead, asyncHandler(async (req, res) => {
  const c = await svc.getCampaign(req.params.id);
  if (!c) throw ApiError.badRequest('Campaign not found');
  if (req.user.role === 'OPERATOR_USER' && c.operator_id !== req.user.operatorId)
    throw ApiError.forbidden();
  ok(res, await svc.campaignAnalytics(req.params.id));
}));

export default router;
