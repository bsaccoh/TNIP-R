import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as svc from './field.service.js';

const router = Router();
router.use(authenticate);

router.get('/my-campaigns', asyncHandler(async (req, res) =>
  ok(res, await svc.getMyCampaigns(req.user.userId))));

router.post('/session/start', asyncHandler(async (req, res) => {
  const { campaignId, operatorId, technology, deviceModel, routeType } = req.body;
  const result = await svc.startSession({
    userId:      req.user.userId,
    userName:    req.user.fullName || req.user.email,
    campaignId, operatorId, technology, deviceModel, routeType,
  });
  ok(res, result, 201);
}));

router.post('/session/:id/reading', asyncHandler(async (req, res) =>
  ok(res, await svc.addReading(Number(req.params.id), req.body))));

router.post('/session/:id/bulk', asyncHandler(async (req, res) =>
  ok(res, await svc.bulkReadings(Number(req.params.id), req.body.readings || []))));

router.post('/session/:id/end', asyncHandler(async (req, res) =>
  ok(res, await svc.endSession(Number(req.params.id), req.body.notes))));

router.get('/session/:id', asyncHandler(async (req, res) =>
  ok(res, await svc.getSession(Number(req.params.id)))));

router.get('/history', asyncHandler(async (req, res) =>
  ok(res, await svc.getMyHistory(req.user.fullName || req.user.email))));

export default router;
