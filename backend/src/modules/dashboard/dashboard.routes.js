import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as service from './dashboard.service.js';
import { dataQuality } from './quality.service.js';

const router = Router();
router.use(authenticate);

router.get('/national', asyncHandler(async (req, res) => ok(res, await service.nationalExecutive({ from: req.query.from, to: req.query.to }))));
router.get('/national-qos', asyncHandler(async (_req, res) => ok(res, await service.nationalQos())));
router.get('/activity', asyncHandler(async (_req, res) => ok(res, await service.recentActivity())));
router.get('/notifications', asyncHandler(async (_req, res) => ok(res, await service.notifications())));
router.get('/data-quality', asyncHandler(async (_req, res) => ok(res, await dataQuality())));

export default router;
