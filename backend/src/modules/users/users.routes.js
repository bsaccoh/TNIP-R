import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess } from '../../middleware/rbac.js';
import { list, roles, create, update, reset, remove } from './users.controller.js';

const router = Router();
router.use(authenticate);

// Any user who can reach User Management (by admin role OR a users:write grant).
const canManageUsers = requireAccess({
  roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'],
  permissions: ['users:write'],
});
router.use(canManageUsers);

router.get('/', list);
router.get('/roles', roles);
router.post('/', create);
router.put('/:id', update);
router.post('/:id/reset-password', reset);
router.delete('/:id', remove);

export default router;
