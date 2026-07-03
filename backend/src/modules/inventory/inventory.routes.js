import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireRole, operatorScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginate, pageMeta } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import { audit } from '../../utils/audit.js';
import * as service from './inventory.service.js';

const router = Router();
router.use(authenticate);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

/**
 * @openapi
 * /inventory/import:
 *   post:
 *     tags: [Inventory]
 *     summary: Import the Geo-Dimension workbook (sites + cells) for an operator
 */
router.post('/import', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'), upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file uploaded (field name: file)');
    const operatorId = Number(z.string().or(z.number()).parse(req.body.operator_id));
    const result = await service.importGeoDimension(operatorId, req.file.buffer);
    await audit({ userId: req.user.userId, operatorId, action: 'INVENTORY_IMPORT', detail: result, ip: req.ip });
    return created(res, result);
  }));

router.post('/sites', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => {
    const result = await service.createSite(req.body);
    await audit({ userId: req.user.userId, action: 'SITE_CREATE', detail: result, ip: req.ip });
    return created(res, result);
  }));

router.put('/sites/:id', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => {
    const result = await service.updateSite(Number(req.params.id), req.body);
    await audit({ userId: req.user.userId, action: 'SITE_UPDATE', detail: result, ip: req.ip });
    return ok(res, result);
  }));

router.delete('/sites/:id', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => {
    const result = await service.deleteSite(Number(req.params.id));
    await audit({ userId: req.user.userId, action: 'SITE_DELETE', detail: result, ip: req.ip });
    return ok(res, result);
  }));

router.get('/sites', operatorScope, asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const { rows, total } = await service.listSites({
    operatorId: req.scope?.operatorId ?? null,
    region: req.query.region, technology: req.query.technology, search: req.query.search, limit, offset,
  });
  return ok(res, rows, pageMeta(page, limit, total));
}));

router.get('/map', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.mapSites({ operatorId: req.scope?.operatorId ?? null, technology: req.query.technology }))));

router.get('/map/cells', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.mapCells({ operatorId: req.scope?.operatorId ?? null, technology: req.query.technology }))));

router.get('/map/regions', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.mapRegionStats({ operatorId: req.scope?.operatorId ?? null }))));

router.get('/map/heat', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.mapHeatData({ operatorId: req.scope?.operatorId ?? null, kpiKey: req.query.kpi }))));

router.get('/stats', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.inventoryStats(req.scope?.operatorId ?? null))));

router.get('/breakdown', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.inventoryBreakdown(req.scope?.operatorId ?? null))));

router.get('/reference', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.resolveReference({
    operatorId: req.scope?.operatorId ?? null,
    cellCode: req.query.cell, cgi: req.query.cgi, siteCode: req.query.site,
  }))));

export default router;
