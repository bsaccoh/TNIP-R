import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/http.js';
import * as service from './thresholds.service.js';

const router = Router();
router.use(authenticate);

const canWrite = requireAccess({ roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'], permissions: ['compliance:write'] });

router.get('/', asyncHandler(async (_req, res) => ok(res, await service.listThresholds())));

router.post('/', canWrite,
  asyncHandler(async (req, res) => created(res, await service.createThreshold({ ...req.body, created_by: req.user.userId }))));

router.put('/:id', canWrite,
  asyncHandler(async (req, res) => ok(res, await service.updateThreshold(Number(req.params.id), req.body))));

router.delete('/:id', canWrite,
  asyncHandler(async (req, res) => { await service.deleteThreshold(Number(req.params.id)); return ok(res, { deleted: true }); }));

export default router;
