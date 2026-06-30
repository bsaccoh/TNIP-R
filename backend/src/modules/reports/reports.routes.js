import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './reports.service.js';
import schedulesRoutes from './schedules.routes.js';

const router = Router();
router.use(authenticate);
router.use('/schedules', schedulesRoutes);

const SHEET_NAMES = { kpi: 'KPI_Performance', compliance: 'Compliance', trend: 'KPI_Trend', anomaly: 'Anomalies' };

router.get('/export/excel', requireRole('REGULATOR_ADMIN', 'REGULATOR_ANALYST'), asyncHandler(async (req, res) => {
  const operatorId = req.query.operatorId || null;
  const from = req.query.from || null;
  const to = req.query.to || null;
  const type = req.query.type || 'kpi';

  let rows;
  switch (type) {
    case 'compliance': rows = await service.generateComplianceReport(operatorId, from, to); break;
    case 'trend': rows = await service.generateTrendReport(operatorId, from, to); break;
    case 'anomaly': rows = await service.generateAnomalyReport(operatorId); break;
    default: rows = await service.generateOperatorKpiReport(operatorId, from, to);
  }

  if (req.query.format === 'json') {
    return res.json({ data: rows });
  }

  const buffer = service.buildExcelBuffer(rows, SHEET_NAMES[type] || 'Report');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="TNIP_${type}_Report.xlsx"`);
  res.send(buffer);
}));

export default router;
