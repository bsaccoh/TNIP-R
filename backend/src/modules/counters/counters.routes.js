import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginate, pageMeta } from '../../utils/http.js';
import * as service from './counters.service.js';

const router = Router();
router.use(authenticate);

const canWrite = requireAccess({ roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'], permissions: ['kpi:write'] });

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const { rows, total } = await service.listCounters({
    status: req.query.status, technology: req.query.technology, search: req.query.search,
    operatorId: req.query.operatorId, vendorId: req.query.vendorId, limit, offset,
  });
  return ok(res, rows, pageMeta(page, limit, total));
}));

router.get('/stats', asyncHandler(async (_req, res) => ok(res, await service.counterStats())));

router.get('/vendors', asyncHandler(async (_req, res) => ok(res, await service.listVendors())));

const importSchema = z.object({
  technology: z.enum(['2G', '3G', '4G', '5G']),
  mappings: z.array(z.object({
    counter_key: z.union([z.string(), z.number()]).optional(),
    counter_id: z.union([z.string(), z.number()]).optional(),
    counter_name: z.string(),
    category: z.string().optional(),
    measurement_object: z.string().optional(),
    aggregation: z.string().optional(),
    unit: z.string().optional(),
  })).min(1),
});

router.post('/import', canWrite,
  asyncHandler(async (req, res) => ok(res, await service.importMappings(importSchema.parse(req.body)))));

const singleSchema = z.object({
  counter_key: z.union([z.string(), z.number()]),
  counter_name: z.string().min(1),
  technology: z.enum(['2G', '3G', '4G', '5G']),
  category: z.string().optional(),
  measurement_object: z.string().optional(),
  aggregation: z.string().optional(),
  unit: z.string().optional(),
  operator_id: z.union([z.string(), z.number()]).nullable().optional(),
  vendor_id: z.union([z.string(), z.number()]).nullable().optional(),
});

router.post('/', canWrite,
  asyncHandler(async (req, res) => created(res, await service.createCounter(singleSchema.parse(req.body)))));

router.put('/:counterId', canWrite,
  asyncHandler(async (req, res) => ok(res, await service.updateCounter(Number(req.params.counterId), req.body))));

router.delete('/:counterId', canWrite,
  asyncHandler(async (req, res) => ok(res, await service.deleteCounter(Number(req.params.counterId)))));

export default router;
