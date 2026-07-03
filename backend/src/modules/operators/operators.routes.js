import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess, operatorScope } from '../../middleware/rbac.js';
import * as c from './operators.controller.js';

const router = Router();
router.use(authenticate);

const canWrite = requireAccess({ roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'], permissions: ['operators:write'] });

/**
 * @openapi
 * /operators:
 *   get: { tags: [Operators], summary: List operators, responses: { 200: { description: OK } } }
 *   post: { tags: [Operators], summary: Create operator, responses: { 201: { description: Created } } }
 */
router.get('/', operatorScope, c.listController);
router.get('/:operatorId', operatorScope, c.getController);
router.post('/', canWrite, c.createController);
router.put('/:operatorId', canWrite, c.updateController);
router.delete('/:operatorId', canWrite, c.deleteController);

export default router;
