import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { list, roles, create, update, reset, remove } from './users.controller.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('SYSTEM_ADMIN', 'REGULATOR_ADMIN'));

router.get('/', list);
router.get('/roles', roles);
router.post('/', create);
router.put('/:id', update);
router.post('/:id/reset-password', reset);
router.delete('/:id', remove);

export default router;
