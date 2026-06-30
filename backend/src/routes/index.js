import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import operatorRoutes from '../modules/operators/operators.routes.js';
import ingestionRoutes from '../modules/ingestion/ingestion.routes.js';
import counterRoutes from '../modules/counters/counters.routes.js';
import inventoryRoutes from '../modules/inventory/inventory.routes.js';
import sftpRoutes from '../modules/sftp/sftp.routes.js';
import kpiRoutes from '../modules/kpi/kpi.routes.js';
import complianceRoutes from '../modules/compliance/compliance.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import rankingRoutes from '../modules/ranking/ranking.routes.js';
import aiRoutes from '../modules/ai/ai.routes.js';
import reportsRoutes from '../modules/reports/reports.routes.js';
import drivetestRoutes from '../modules/drivetest/drivetest.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import settingsRoutes from '../modules/settings/settings.routes.js';
import thresholdsRoutes from '../modules/compliance/thresholds.routes.js';
import licensesRoutes from '../modules/licenses/licenses.routes.js';
import auditRoutes from '../modules/audit/audit.routes.js';
import notificationsRoutes from '../modules/notifications/notifications.routes.js';
import anomalyRoutes from '../modules/anomaly/anomaly.routes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'tnipr-backend', ts: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/operators', operatorRoutes);
router.use('/ingestion', ingestionRoutes);
router.use('/counters', counterRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/sftp', sftpRoutes);
router.use('/kpis', kpiRoutes);
router.use('/compliance', complianceRoutes);
router.use('/dashboards', dashboardRoutes);
router.use('/rankings', rankingRoutes);
router.use('/ai', aiRoutes);
router.use('/reports', reportsRoutes);
router.use('/drive-tests', drivetestRoutes);
router.use('/users', usersRoutes);
router.use('/settings', settingsRoutes);
router.use('/thresholds', thresholdsRoutes);
router.use('/licenses', licensesRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/anomalies', anomalyRoutes);

export default router;
