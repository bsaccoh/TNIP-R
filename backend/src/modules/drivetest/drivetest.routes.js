import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.js';
import { requireRole, operatorScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/http.js';
import * as service from './drivetest.service.js';

const router = Router();
router.use(authenticate);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

router.get('/', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.listDriveTests(req.scope?.operatorId ?? null))));

router.post('/import', requireRole('REGULATOR_ADMIN', 'REGULATOR_ANALYST', 'SYSTEM_ADMIN'),
  upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) throw new Error('No file uploaded (field name: file)');
    const operatorId = Number(req.body.operator_id);
    if (!operatorId) throw new Error('operator_id is required');
    const meta = {
      testName: req.body.test_name,
      testDate: req.body.test_date,
      routeType: req.body.route_type,
      technology: req.body.technology,
      deviceModel: req.body.device_model,
      testerName: req.body.tester_name,
      notes: req.body.notes,
    };
    const result = await service.importDriveTest(operatorId, meta, req.file.buffer, req.file.originalname);
    return created(res, result);
  }));

// ─── Live recording routes (mobile app) ─────────────────────────────────────
router.post('/live', asyncHandler(async (req, res) => {
  const operatorId = Number(req.body.operator_id);
  if (!operatorId) throw new Error('operator_id is required');
  const meta = {
    testName: req.body.test_name,
    testDate: req.body.test_date,
    routeType: req.body.route_type,
    technology: req.body.technology,
    deviceModel: req.body.device_model,
    testerName: req.body.tester_name,
    notes: req.body.notes,
  };
  return created(res, await service.createLiveTest(operatorId, meta, req.user.userId));
}));

router.post('/live/:id/samples', asyncHandler(async (req, res) =>
  ok(res, await service.appendLiveSamples(Number(req.params.id), req.body.samples))));

router.put('/live/:id/end', asyncHandler(async (req, res) =>
  ok(res, await service.endLiveTest(Number(req.params.id)))));

router.get('/summary', asyncHandler(async (req, res) =>
  ok(res, await service.getDashboardSummary(req.query.from, req.query.to))));

router.get('/config', asyncHandler(async (req, res) =>
  ok(res, await service.getConfig())));

router.put('/config', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'), asyncHandler(async (req, res) =>
  ok(res, await service.updateConfig(req.body))));

router.get('/compare', asyncHandler(async (req, res) => {
  const ids = String(req.query.ids || '').split(',').map(Number).filter(Boolean);
  ok(res, await service.compareDriveTests(ids));
}));

router.get('/:id/samples', asyncHandler(async (req, res) =>
  ok(res, await service.getDriveTestSamples(req.params.id))));

router.get('/:id/analysis', asyncHandler(async (req, res) =>
  ok(res, await service.getDriveTestAnalysis(req.params.id))));

router.get('/:id/nearby-sites', asyncHandler(async (req, res) =>
  ok(res, await service.getNearbySites(req.params.id, Number(req.query.radius) || 2))));

router.get('/:id/coverage-gaps', asyncHandler(async (req, res) =>
  ok(res, await service.getCoverageGaps(req.params.id, Number(req.query.threshold) || -100))));

router.get('/:id/segments', asyncHandler(async (req, res) =>
  ok(res, await service.getRouteSegments(req.params.id, Number(req.query.size) || 25))));

router.get('/:id/compliance', asyncHandler(async (req, res) => {
  const t = {};
  if (req.query.rsrp) t.rsrp = Number(req.query.rsrp);
  if (req.query.rsrq) t.rsrq = Number(req.query.rsrq);
  if (req.query.sinr) t.sinr = Number(req.query.sinr);
  if (req.query.dl) t.dl = Number(req.query.dl);
  ok(res, await service.getComplianceSummary(req.params.id, t));
}));

router.delete('/:id', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'), asyncHandler(async (req, res) => {
  await service.deleteDriveTest(req.params.id);
  ok(res, { deleted: true });
}));

export default router;
