import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { getSettings, updateSettings } from './settings.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', getSettings);
router.put('/', requireRole('SYSTEM_ADMIN', 'REGULATOR_ADMIN'), updateSettings);

export default router;
