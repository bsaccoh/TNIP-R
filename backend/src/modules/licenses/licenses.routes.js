import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/http.js';
import * as service from './licenses.service.js';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (req, res) =>
  ok(res, await service.listLicenses(req.query.operatorId ? Number(req.query.operatorId) : null))));

router.get('/alerts', asyncHandler(async (req, res) =>
  ok(res, await service.expiryAlerts(req.query.days ? Number(req.query.days) : 90))));

router.post('/', requireRole('SYSTEM_ADMIN', 'REGULATOR_ADMIN'),
  asyncHandler(async (req, res) => created(res, await service.createLicense(req.body))));

router.put('/:id', requireRole('SYSTEM_ADMIN', 'REGULATOR_ADMIN'),
  asyncHandler(async (req, res) => ok(res, await service.updateLicense(Number(req.params.id), req.body))));

router.delete('/:id', requireRole('SYSTEM_ADMIN', 'REGULATOR_ADMIN'),
  asyncHandler(async (req, res) => { await service.deleteLicense(Number(req.params.id)); return ok(res, { deleted: true }); }));

export default router;
