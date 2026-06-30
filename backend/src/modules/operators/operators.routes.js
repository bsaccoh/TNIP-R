import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole, operatorScope } from '../../middleware/rbac.js';
import * as c from './operators.controller.js';

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /operators:
 *   get: { tags: [Operators], summary: List operators, responses: { 200: { description: OK } } }
 *   post: { tags: [Operators], summary: Create operator, responses: { 201: { description: Created } } }
 */
router.get('/', operatorScope, c.listController);
router.get('/:operatorId', operatorScope, c.getController);
router.post('/', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'), c.createController);
router.put('/:operatorId', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'), c.updateController);
router.delete('/:operatorId', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'), c.deleteController);

export default router;
