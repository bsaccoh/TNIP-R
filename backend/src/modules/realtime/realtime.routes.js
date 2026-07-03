import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import * as svc from './realtime.service.js';

const router = Router();
router.use(authenticate);

const canRead  = requireAccess({ permissions: ['ingestion:read'] });
const canWrite = requireAccess({ permissions: ['ingestion:write'] });
const regulatorRoles = ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'];

/* ── Alarm summary ───────────────────────────────────────────────────────── */
router.get('/alarm-summary', canRead, asyncHandler(async (req, res) => {
  ok(res, await svc.alarmSummary());
}));

/* ── Active alarms ───────────────────────────────────────────────────────── */
router.get('/alarms', canRead, asyncHandler(async (req, res) => {
  const operatorId = req.user.role === 'OPERATOR_USER'
    ? req.user.operatorId : req.query.operatorId;
  ok(res, await svc.listAlarms({
    operatorId,
    status:   req.query.status,
    severity: req.query.severity,
    limit:    req.query.limit,
    offset:   req.query.offset,
  }));
}));

router.put('/alarms/:id/acknowledge', canWrite, asyncHandler(async (req, res) => {
  await svc.acknowledgeAlarm(req.params.id, req.user.userId);
  ok(res, { acknowledged: true });
}));

router.put('/alarms/:id/clear', canWrite, asyncHandler(async (req, res) => {
  if (!regulatorRoles.includes(req.user.role))
    throw ApiError.forbidden('Only regulators can clear alarms');
  await svc.clearAlarm(req.params.id, req.user.userId);
  ok(res, { cleared: true });
}));

/* ── Live push pulse ─────────────────────────────────────────────────────── */
router.get('/pulse', canRead, asyncHandler(async (req, res) => {
  ok(res, await svc.livePulse(Number(req.query.minutes) || 60));
}));

/* ── KPI snapshot ────────────────────────────────────────────────────────── */
router.get('/kpi-snapshot', canRead, asyncHandler(async (req, res) => {
  const operatorId = req.user.role === 'OPERATOR_USER'
    ? req.user.operatorId : req.query.operatorId;
  ok(res, await svc.kpiSnapshot(operatorId));
}));

/* ── PM snapshot ─────────────────────────────────────────────────────────── */
router.get('/pm-snapshot', canRead, asyncHandler(async (req, res) => {
  const operatorId = req.user.role === 'OPERATOR_USER'
    ? req.user.operatorId : req.query.operatorId;
  ok(res, await svc.pmSnapshot(operatorId));
}));

export default router;
