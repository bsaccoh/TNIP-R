import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.js';
import { requireRole, operatorScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/http.js';
import { env } from '../../config/env.js';
import * as service from './drivetest.service.js';
import * as report from './report.service.js';
import * as regional from './regional.service.js';
import * as trend     from './trend.service.js';
import * as blackspot from './blackspot.service.js';
import * as corridor  from './corridor.service.js';
import * as pci       from './pci.service.js';
import * as operatorRepo from '../operators/operators.repository.js';

const router = Router();
router.use(authenticate);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.uploadMaxMb * 1024 * 1024 } });

function detectTechFromFilename(filename, defaultTech) {
  const upper = filename.toUpperCase();
  if (/(?:^|[_ ])2G[_ .]/.test(upper)) return '2G';
  if (/(?:^|[_ ])3G[_ .]/.test(upper)) return '3G';
  if (/(?:^|[_ ])4G[_ .]/.test(upper) || upper.includes('LTE')) return '4G';
  if (/(?:^|[_ ])5G[_ .]/.test(upper) || /[_ ]NR[_ .]/.test(upper)) return '5G';
  return defaultTech;
}

router.get('/', operatorScope, asyncHandler(async (req, res) =>
  ok(res, await service.listDriveTests(req.scope?.operatorId ?? null))));

router.post('/preview', requireRole('REGULATOR_ADMIN', 'REGULATOR_ANALYST', 'SYSTEM_ADMIN'),
  upload.array('file', 1000), asyncHandler(async (req, res) => {
    const files = req.files || [];
    if (!files.length) throw new Error('No files provided');
    const { previewTrpFile } = await import('./trp-parser.js');
    let operators = [];
    try { operators = (await operatorRepo.listOperators({ limit: 100, offset: 0 })).rows || []; } catch(e) {}
    const results = [];
    for (const f of files) {
      try {
        if (f.originalname.toLowerCase().endsWith('.trp')) {
          const preview = await previewTrpFile(f.buffer);
          preview.technology = detectTechFromFilename(f.originalname, preview.technology);
          const upper = f.originalname.toUpperCase();
          for (const op of operators) {
            if (upper.includes(op.operator_name.toUpperCase())) {
              preview.operator = op.operator_name;
              break;
            }
          }
          const opNameSafe = preview.operator ? preview.operator.split(' ')[0] : 'Unknown';
          const defaultCluster = `${opNameSafe}_Bo_CL01`;
          results.push({ filename: f.originalname, ...preview, cluster: defaultCluster });
        } else {
          let detectedOperator = null;
          const upper = f.originalname.toUpperCase();
          for (const op of operators) {
            if (upper.includes(op.operator_name.toUpperCase())) {
              detectedOperator = op.operator_name;
              break;
            }
          }
          const opNameSafe = detectedOperator ? detectedOperator.split(' ')[0] : 'Unknown';
          const defaultCluster = `${opNameSafe}_Bo_CL01`;
          results.push({ filename: f.originalname, operator: detectedOperator, device: null, technology: detectTechFromFilename(f.originalname, '4G'), testDate: null, testName: f.originalname.replace(/\.[^.]+$/, ''), cluster: defaultCluster });
        }
      } catch {
        results.push({ filename: f.originalname, error: 'Could not read file metadata' });
      }
    }
    ok(res, results);
  }));

router.post('/import', requireRole('REGULATOR_ADMIN', 'REGULATOR_ANALYST', 'SYSTEM_ADMIN'),
  upload.array('file', 1000), asyncHandler(async (req, res) => {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files.length) throw new Error('No file uploaded (field name: file)');
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

    let operators = [];
    try { operators = (await operatorRepo.listOperators({ limit: 100, offset: 0 })).rows || []; } catch(e) {}
    function detectOpId(filename, defaultId) {
      const upper = filename.toUpperCase();
      for (const op of operators) {
        if (upper.includes(op.operator_name.toUpperCase())) return op.operator_id;
      }
      return defaultId;
    }

    function getOpNameSafe(opId) {
      const op = operators.find(o => o.operator_id === opId);
      return op ? op.operator_name.split(' ')[0] : 'Unknown';
    }

    if (files.length === 1) {
      const f = files[0];
      const isTrp = f.originalname.toLowerCase().endsWith('.trp');
      const opId = detectOpId(f.originalname, operatorId);
      const defaultCluster = `${getOpNameSafe(opId)}_Bo_CL01`;
      const finalTestName = `${f.originalname.replace(/\.[^.]+$/, '')} — ${defaultCluster}`;
      const fileMeta = { ...meta, testName: finalTestName, technology: detectTechFromFilename(f.originalname, meta.technology) };
      const result = isTrp
        ? await service.importTrpFile(opId, fileMeta, f.buffer, f.originalname)
        : await service.importDriveTest(opId, fileMeta, f.buffer, f.originalname);
      return created(res, result);
    }

    const results = [];
    for (const f of files) {
      try {
        const isTrp = f.originalname.toLowerCase().endsWith('.trp');
        const opId = detectOpId(f.originalname, operatorId);
        const defaultCluster = `${getOpNameSafe(opId)}_Bo_CL01`;
        const finalTestName = `${f.originalname.replace(/\.[^.]+$/, '')} — ${defaultCluster}`;
        const fileMeta = { ...meta, testName: finalTestName, technology: detectTechFromFilename(f.originalname, meta.technology) };
        const result = isTrp
          ? await service.importTrpFile(opId, fileMeta, f.buffer, f.originalname)
          : await service.importDriveTest(opId, fileMeta, f.buffer, f.originalname);
        results.push({ filename: f.originalname, status: 'success', ...result });
      } catch (err) {
        results.push({ filename: f.originalname, status: 'error', message: err.message });
      }
    }
    return created(res, {
      batch: true,
      total: files.length,
      succeeded: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'error').length,
      results,
    });
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

router.get('/cluster-samples', asyncHandler(async (req, res) => {
  const ids = String(req.query.testIds || '').split(',').map(Number).filter(Boolean);
  ok(res, await service.getClusterSamples(ids));
}));

router.get('/throughput-analysis', asyncHandler(async (req, res) =>
  ok(res, await service.getThroughputAnalysis(req.query.cluster || null, req.query.technology || null))));

router.get('/signal-thresholds', asyncHandler(async (req, res) =>
  ok(res, await service.getSignalThresholds())));

router.put('/signal-thresholds/:id', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'), asyncHandler(async (req, res) =>
  ok(res, await service.updateSignalThreshold(Number(req.params.id), req.body))));

// ─── Trend / Campaign analysis ─────────────────────────────────────────────
router.get('/trend', asyncHandler(async (req, res) =>
  ok(res, await trend.getCampaignTrend(req.query.operatorId ? Number(req.query.operatorId) : null))));

// ─── Dead zone / blackspot mapping ─────────────────────────────────────────
router.get('/blackspots', asyncHandler(async (req, res) =>
  ok(res, await blackspot.getBlackspots(
    req.query.threshold ? Number(req.query.threshold) : -110,
    req.query.operatorId ? Number(req.query.operatorId) : null,
  ))));

// ─── Corridor / route analysis ──────────────────────────────────────────────
router.get('/corridor/tests', asyncHandler(async (req, res) =>
  ok(res, await corridor.listTestsForCorridor())));

router.get('/corridor/:driveTestId', asyncHandler(async (req, res) =>
  ok(res, await corridor.getCorridorAnalysis(
    Number(req.params.driveTestId),
    req.query.segments ? Number(req.query.segments) : 20,
  ))));

// ─── PCI / interference analysis ────────────────────────────────────────────
router.get('/pci-analysis', asyncHandler(async (req, res) =>
  ok(res, await pci.getPciAnalysis(
    req.query.operatorId ? Number(req.query.operatorId) : null,
  ))));

// ─── Regional analysis routes ───────────────────────────────────────────────
router.get('/regional/overview', asyncHandler(async (req, res) =>
  ok(res, await regional.getRegionalOverview())));

router.get('/regional/comparison', asyncHandler(async (req, res) =>
  ok(res, await regional.getRegionalComparison())));

router.get('/regional/districts', asyncHandler(async (req, res) =>
  ok(res, await regional.getDistrictData())));

router.get('/regional/:regionId', asyncHandler(async (req, res) =>
  ok(res, await regional.getRegionalDetail(req.params.regionId))));

// ─── Report generation routes ──────────────────────────────────────────────
router.get('/report/pdf', asyncHandler(async (req, res) => {
  const regionId = req.query.regionId || null;
  const buf = await report.generatePdfReport(regionId);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="DT_Report_${regionId || 'National'}_${new Date().toISOString().slice(0,10)}.pdf"` });
  res.send(buf);
}));

router.post('/report/cluster/pdf', asyncHandler(async (req, res) => {
  const { html, filename } = req.body;
  if (!html) throw new Error('HTML content is required');
  const buf = await report.generateClusterPdf(html);
  const name = filename || `Cluster_Report_${new Date().toISOString().slice(0,10)}.pdf`;
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"` });
  res.send(buf);
}));

router.get('/report/excel', asyncHandler(async (req, res) => {
  const regionId = req.query.regionId || null;
  const buf = await report.generateExcelReport(regionId);
  res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="DT_Report_${regionId || 'National'}_${new Date().toISOString().slice(0,10)}.xlsx"` });
  res.send(Buffer.from(buf));
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

router.get('/operator-summary/:operatorId', asyncHandler(async (req, res) =>
  ok(res, await service.getOperatorExecutiveSummary(req.params.operatorId))));

router.get('/compare-operators/all', asyncHandler(async (req, res) =>
  ok(res, await service.getOperatorComparisonDashboard())));

router.delete('/:id', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'), asyncHandler(async (req, res) => {
  await service.deleteDriveTest(req.params.id);
  ok(res, { deleted: true });
}));

export default router;
