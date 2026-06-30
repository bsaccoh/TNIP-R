import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginate, pageMeta } from '../../utils/http.js';
import * as service from './counters.service.js';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const { rows, total } = await service.listCounters({
    status: req.query.status, technology: req.query.technology, search: req.query.search, limit, offset,
  });
  return ok(res, rows, pageMeta(page, limit, total));
}));

router.get('/stats', asyncHandler(async (_req, res) => ok(res, await service.counterStats())));

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

router.post('/import', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => ok(res, await service.importMappings(importSchema.parse(req.body)))));

const singleSchema = z.object({
  counter_key: z.union([z.string(), z.number()]),
  counter_name: z.string().min(1),
  technology: z.enum(['2G', '3G', '4G', '5G']),
  category: z.string().optional(),
  measurement_object: z.string().optional(),
  aggregation: z.string().optional(),
  unit: z.string().optional(),
});

router.post('/', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => created(res, await service.createCounter(singleSchema.parse(req.body)))));

router.put('/:counterId', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => ok(res, await service.updateCounter(Number(req.params.counterId), req.body))));

router.delete('/:counterId', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => ok(res, await service.deleteCounter(Number(req.params.counterId)))));

export default router;
