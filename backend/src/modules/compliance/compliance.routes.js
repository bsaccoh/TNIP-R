import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess, operatorScope } from '../../middleware/rbac.js';
import * as c from './compliance.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { listNotices, issueNotice, generateNoticeExcel, updateNoticeStatus } from './notices.service.js';
import { generateNoticePdf } from './pdf.service.js';

const router = Router();
router.use(authenticate);

const canWrite = requireAccess({ roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'], permissions: ['compliance:write'] });

router.get('/matrix', c.matrixController);                 // ?period=YYYY-MM (operators × KPIs)
router.get('/summary', operatorScope, c.summaryController);
router.get('/alerts', operatorScope, c.alertsController);
router.post('/evaluate', canWrite, c.evaluateController);

// Compliance notices
router.get('/notices', asyncHandler(async (req, res) =>
  ok(res, await listNotices(req.query.operatorId ? Number(req.query.operatorId) : null))));

router.post('/notices', canWrite, asyncHandler(async (req, res) => {
  const { operatorId, period } = req.body;
  return ok(res, await issueNotice(Number(operatorId), req.user.userId, period));
}));

router.get('/notices/:id/download', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (req.query.format === 'pdf') {
    const { buffer, ref } = await generateNoticePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Notice_${ref}.pdf"`);
    return res.send(buffer);
  }
  const { buffer, ref } = await generateNoticeExcel(id);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="Notice_${ref}.xlsx"`);
  res.send(buffer);
}));

router.put('/notices/:id/status', canWrite, asyncHandler(async (req, res) => {
  await updateNoticeStatus(Number(req.params.id), req.body.status);
  return ok(res, { ok: true });
}));

export default router;
