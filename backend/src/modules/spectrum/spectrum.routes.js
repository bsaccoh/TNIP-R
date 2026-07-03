import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as svc from './spectrum.service.js';

const router = Router();
router.use(authenticate);

const canRead  = requireAccess({ permissions: ['compliance:read'] });
const canWrite = requireAccess({ permissions: ['compliance:write'] });

/* ── Summary & bands ─────────────────────────────────────────────────────── */
router.get('/summary',     canRead, asyncHandler(async (_req, res) =>
  ok(res, await svc.spectrumSummary())));

router.get('/band-summary', canRead, asyncHandler(async (_req, res) =>
  ok(res, await svc.bandSummary())));

router.get('/expiry-watchlist', canRead, asyncHandler(async (req, res) =>
  ok(res, await svc.expiryWatchlist(Number(req.query.days) || 180))));

/* ── Assignments ─────────────────────────────────────────────────────────── */
router.get('/', canRead, asyncHandler(async (req, res) =>
  ok(res, await svc.listAssignments({
    operatorId:    req.query.operatorId,
    band:          req.query.band,
    status:        req.query.status,
    expiringDays:  req.query.expiringDays ? Number(req.query.expiringDays) : undefined,
  }))));

router.get('/:id(\\d+)', canRead, asyncHandler(async (req, res) =>
  ok(res, await svc.getAssignment(req.params.id))));

router.post('/', canWrite, asyncHandler(async (req, res) =>
  ok(res, await svc.createAssignment(req.body, req.user.userId), 201)));

router.put('/:id(\\d+)', canWrite, asyncHandler(async (req, res) =>
  ok(res, await svc.updateAssignment(req.params.id, req.body))));

router.delete('/:id(\\d+)', canWrite, asyncHandler(async (req, res) => {
  await svc.deleteAssignment(req.params.id);
  ok(res, { deleted: true });
}));

/* ── Interference reports ────────────────────────────────────────────────── */
router.get('/interference', canRead, asyncHandler(async (req, res) =>
  ok(res, await svc.listInterference({
    status:     req.query.status,
    operatorId: req.query.operatorId,
    severity:   req.query.severity,
  }))));

router.get('/interference/:id(\\d+)', canRead, asyncHandler(async (req, res) =>
  ok(res, await svc.getInterference(req.params.id))));

router.post('/interference', canWrite, asyncHandler(async (req, res) =>
  ok(res, await svc.fileInterference(req.body, req.user.userId), 201)));

router.put('/interference/:id(\\d+)', canWrite, asyncHandler(async (req, res) =>
  ok(res, await svc.updateInterference(req.params.id, req.body))));

export default router;
