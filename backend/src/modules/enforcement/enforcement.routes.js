import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess, operatorScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as svc from './enforcement.service.js';

const router = Router();
router.use(authenticate);

const canWrite = requireAccess({ roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'], permissions: ['compliance:write'] });
const canRead  = requireAccess({ roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'], permissions: ['compliance:read'] });

/* List cases */
router.get('/', canRead, asyncHandler(async (req, res) => {
  const { operatorId, status, severity, from, to, limit, offset } = req.query;
  ok(res, await svc.listCases({
    operatorId: operatorId ? Number(operatorId) : undefined,
    status, severity, from, to,
    limit:  limit  ? Number(limit)  : 50,
    offset: offset ? Number(offset) : 0,
  }));
}));

/* Summary stats */
router.get('/summary', canRead, asyncHandler(async (req, res) => {
  ok(res, await svc.caseSummary(req.query.operatorId ? Number(req.query.operatorId) : undefined));
}));

/* Auto-generate from violations */
router.post('/auto-generate', canWrite, asyncHandler(async (req, res) => {
  ok(res, await svc.autoGenerateFromViolations(req.user.userId));
}));

/* Get single case */
router.get('/:id', canRead, asyncHandler(async (req, res) => {
  const c = await svc.getCase(Number(req.params.id));
  if (!c) return res.status(404).json({ message: 'Case not found' });
  ok(res, c);
}));

/* Create case manually */
router.post('/', canWrite, asyncHandler(async (req, res) => {
  const { operatorId, title, description, severity, kpiId, complianceId, deadline } = req.body;
  ok(res, await svc.createCase({
    operatorId: Number(operatorId), title, description, severity,
    kpiId: kpiId ? Number(kpiId) : undefined,
    complianceId: complianceId ? Number(complianceId) : undefined,
    deadline, createdBy: req.user.userId,
  }));
}));

/* Status transition */
router.put('/:id/status', canWrite, asyncHandler(async (req, res) => {
  const { toStatus, notes, operatorResponse, resolvedNotes } = req.body;
  ok(res, await svc.transitionCase(Number(req.params.id), {
    toStatus, notes, userId: req.user.userId, operatorResponse, resolvedNotes,
  }));
}));

/* Add note */
router.post('/:id/notes', canRead, asyncHandler(async (req, res) => {
  ok(res, await svc.addNote(Number(req.params.id), { notes: req.body.notes, userId: req.user.userId }));
}));

export default router;
