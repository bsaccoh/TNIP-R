import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole, operatorScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import * as c from './kpi.controller.js';
import * as service from './kpi.service.js';
import { getForecast } from './forecast.service.js';

const router = Router();
router.use(authenticate);

router.get('/definitions', c.definitionsController);
router.get('/comparison', c.comparisonController);
router.get('/analytics', c.analyticsController);
router.get('/timeseries', operatorScope, c.timeSeriesController);
router.post('/validate', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'), c.validateController);
router.post('/recalculate', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'), c.recalcController);
router.get('/forecast', asyncHandler(async (req, res) => {
  const { operatorId, kpiId, days } = req.query;
  if (!operatorId || !kpiId) throw ApiError.badRequest('operatorId and kpiId are required');
  return ok(res, await getForecast(Number(operatorId), Number(kpiId), days ? Number(days) : 30));
}));

router.post('/definitions', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => {
    const { kpi_key, name, unit, category, description } = req.body;
    if (!kpi_key || !name) throw ApiError.badRequest('kpi_key and name are required');
    return created(res, await service.createKpiDefinition({ kpiKey: kpi_key, name, unit, category, description }));
  }));

router.get('/definitions/:kpiId/formulas',
  asyncHandler(async (req, res) => ok(res, await service.getFormulasForKpi(Number(req.params.kpiId)))));

router.post('/formulas', requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => {
    const { kpi_id, expression, operator_id, technology_id, vendor_id } = req.body;
    if (!kpi_id || !expression) throw ApiError.badRequest('kpi_id and expression are required');
    return created(res, await service.saveFormula({
      kpiId: kpi_id, expression, operatorId: operator_id, technologyId: technology_id, vendorId: vendor_id,
    }));
  }));

export default router;
