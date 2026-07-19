import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import * as svc from './qoe.service.js';

const router = Router();

/* ── Public — no auth ────────────────────────────────────────────────────── */
router.post('/submit', asyncHandler(async (req, res) => {
  const result = await svc.submitComplaint({
    ...req.body,
    ipAddress: req.ip,
  });
  ok(res, result, 201);
}));

// Public list of operators (for the complaint form dropdown)
router.get('/operators', asyncHandler(async (_req, res) => {
  const { query } = await import('../../config/db.js');
  const ops = await query(
    `SELECT operator_id, operator_name FROM operators WHERE status='ACTIVE' ORDER BY operator_name`
  );
  ok(res, ops);
}));

// Public complaint tracking by reference number
router.get('/track/:ref', asyncHandler(async (req, res) => {
  const complaint = await svc.trackComplaint(req.params.ref);
  if (!complaint) throw ApiError.badRequest('Complaint not found. Please check your reference number.');
  ok(res, complaint);
}));

// Public AI chatbot assistant
router.post('/ask', asyncHandler(async (req, res) => {
  const result = await svc.askChatbot(req.body.question);
  ok(res, result);
}));

/* ── Authenticated — regulator / analyst ─────────────────────────────────── */
const canRead  = requireAccess({ permissions: ['compliance:read'] });
const canWrite = requireAccess({ permissions: ['compliance:write'] });

router.use(authenticate);

router.get('/summary', canRead, asyncHandler(async (req, res) => {
  ok(res, await svc.qoeSummary({ days: Number(req.query.days) || 30 }));
}));

router.get('/', canRead, asyncHandler(async (req, res) => {
  ok(res, await svc.listComplaints({
    operatorId: req.query.operatorId,
    status:     req.query.status,
    issueType:  req.query.issueType,
    district:   req.query.district,
    severity:   req.query.severity,
    dateFrom:   req.query.dateFrom,
    dateTo:     req.query.dateTo,
    limit:      req.query.limit,
    offset:     req.query.offset,
  }));
}));

router.get('/:id', canRead, asyncHandler(async (req, res) => {
  const c = await svc.getComplaint(req.params.id);
  if (!c) throw ApiError.badRequest('Complaint not found');
  ok(res, c);
}));

router.put('/:id', canWrite, asyncHandler(async (req, res) => {
  ok(res, await svc.updateComplaint(req.params.id, {
    status:         req.body.status,
    resolutionNote: req.body.resolutionNote,
    reviewedBy:     req.user.userId,
  }));
}));

export default router;
