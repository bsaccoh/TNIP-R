import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { TEMPLATES, fetchTemplateData } from './templates.service.js';

const router = Router();
router.use(authenticate);

const canRead = requireAccess({ permissions: ['reports:read'] });

router.get('/', canRead, (_req, res) => ok(res, TEMPLATES));

router.get('/:id/data', canRead, asyncHandler(async (req, res) => {
  const data = await fetchTemplateData(req.params.id, {
    from:       req.query.from,
    to:         req.query.to,
    operatorId: req.query.operatorId,
  });
  ok(res, data);
}));

export default router;
