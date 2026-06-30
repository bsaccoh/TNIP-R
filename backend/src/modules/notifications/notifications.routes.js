import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { listNotifications, markRead, markAllRead, unreadCount, scanThresholdBreaches } from './notifications.service.js';

const router = Router();
router.use(authenticate);

router.get('/',        asyncHandler(async (req, res) => ok(res, await listNotifications(req.user.userId))));
router.get('/unread',  asyncHandler(async (req, res) => ok(res, { count: await unreadCount(req.user.userId) })));
router.post('/scan',   asyncHandler(async (req, res) => ok(res, { created: await scanThresholdBreaches() })));
router.put('/read-all', asyncHandler(async (req, res) => { await markAllRead(req.user.userId); return ok(res, { ok: true }); }));
router.put('/:id/read', asyncHandler(async (req, res) => {
  await markRead(Number(req.params.id), req.user.userId);
  return ok(res, { ok: true });
}));

export default router;
