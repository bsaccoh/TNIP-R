import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as service from './ai.service.js';

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /ai/ask:
 *   post:
 *     tags: [AI]
 *     summary: Ask the regulatory assistant a natural-language question
 */
router.post('/ask', asyncHandler(async (req, res) => {
  const question = z.string().min(1).parse(req.body.question);
  return ok(res, await service.ask(question));
}));

router.get('/anomalies', asyncHandler(async (req, res) => {
  const operatorId = req.query.operatorId ? Number(req.query.operatorId) : null;
  return ok(res, await service.detectAnomalies({ operatorId }));
}));

router.post('/anomalies/scan', requireRole('REGULATOR_ADMIN', 'REGULATOR_ANALYST', 'SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => {
    const operatorId = req.body.operator_id ? Number(req.body.operator_id) : null;
    return ok(res, await service.runAnomalyScan(operatorId));
  }));

export default router;
