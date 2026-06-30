import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireRole, operatorScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/http.js';
import { audit } from '../../utils/audit.js';
import * as service from './sftp.service.js';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  operator_id: z.number().int(),
  name: z.string().min(2),
  host: z.string().min(1),
  port: z.number().int().optional(),
  username: z.string().min(1),
  auth_type: z.enum(['PASSWORD', 'KEY']).optional(),
  secret: z.string().optional(),
  remote_path: z.string().min(1),
  file_pattern: z.string().optional(),
  delete_after: z.boolean().optional(),
  poll_enabled: z.boolean().optional(),
  poll_interval_sec: z.number().int().min(60).optional(),
});

router.get('/', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.listConnections(req.scope?.operatorId ?? null))));

router.post('/', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => {
    const conn = await service.createConnection(createSchema.parse(req.body));
    await audit({ userId: req.user.userId, operatorId: conn.operator_id, action: 'SFTP_CREATE', entityId: conn.sftp_id, ip: req.ip });
    const { secret, ...safe } = conn;
    return created(res, safe);
  }));

router.post('/:sftpId/test', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => ok(res, await service.testConnection(Number(req.params.sftpId)))));

/**
 * @openapi
 * /sftp/{sftpId}/pull:
 *   post:
 *     tags: [SFTP]
 *     summary: Pull new files from an SFTP feed now (batch/on-demand ingestion)
 */
router.post('/:sftpId/pull', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => {
    const max = req.body?.max ? Number(req.body.max) : 200;
    const result = await service.pullOnce(Number(req.params.sftpId), { max });
    await audit({ userId: req.user.userId, action: 'SFTP_PULL', entityId: req.params.sftpId, detail: { ingested: result.ingested }, ip: req.ip });
    return ok(res, result);
  }));

router.delete('/:sftpId', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => {
    await service.deleteConnection(Number(req.params.sftpId));
    await audit({ userId: req.user.userId, action: 'SFTP_DELETE', entityId: req.params.sftpId, ip: req.ip });
    return ok(res, { deleted: true });
  }));

export default router;
