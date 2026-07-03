import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import { query } from '../../config/db.js';
import * as service from './schedules.service.js';
import { executeSchedule, testSmtp } from '../../jobs/reportScheduler.js';

const router = Router();
router.use(authenticate, requireRole('SYSTEM_ADMIN', 'REGULATOR_ADMIN'));

router.get('/',    asyncHandler(async (_req, res) => ok(res, await service.listSchedules())));
router.get('/stats', asyncHandler(async (_req, res) => ok(res, await service.scheduleStats())));
router.get('/logs',  asyncHandler(async (req, res) => ok(res, await service.allRecentLogs(Number(req.query.limit) || 50))));

router.post('/', asyncHandler(async (req, res) =>
  created(res, await service.createSchedule(req.body, req.user.userId))));

router.put('/:id', asyncHandler(async (req, res) =>
  ok(res, await service.updateSchedule(Number(req.params.id), req.body))));

router.delete('/:id', asyncHandler(async (req, res) => {
  await service.deleteSchedule(Number(req.params.id));
  return ok(res, { deleted: true });
}));

router.get('/:id/logs', asyncHandler(async (req, res) =>
  ok(res, await service.listRunLogs(Number(req.params.id), Number(req.query.limit) || 20))));

router.post('/:id/run', asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM scheduled_reports WHERE schedule_id = :id', { id: Number(req.params.id) });
  if (!rows.length) throw new ApiError(404, 'Schedule not found');
  const result = await executeSchedule(rows[0], 'MANUAL');
  return ok(res, { ran: true, ...result });
}));

router.post('/smtp-test', asyncHandler(async (req, res) => {
  const { to } = req.body;
  if (!to) throw new ApiError(400, 'Recipient email required');
  const result = await testSmtp(to);
  return ok(res, result);
}));

export default router;
