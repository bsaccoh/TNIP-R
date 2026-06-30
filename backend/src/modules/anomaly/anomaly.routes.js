import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { detectAnomalies, listAnomalies } from './anomaly.service.js';

const router = Router();
router.use(authenticate);

router.get('/',       asyncHandler(async (req, res) => ok(res, await listAnomalies(req.query))));
router.post('/scan',  asyncHandler(async (req, res) => {
  const { minPct } = req.body;
  return ok(res, await detectAnomalies(minPct ? Number(minPct) : 10));
}));

export default router;
