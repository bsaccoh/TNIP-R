import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { runAnomalyScan } from '../modules/ai/ai.service.js';

/**
 * Automatically runs the AI Anomaly Scan every day at 3:00 AM.
 * The scan analyzes all KPI time-series data using Z-Scores,
 * persists anomalies to the database, and dispatches HIGH/CRITICAL
 * alerts to the notification center.
 */
export function startAnomalyScheduler() {
  logger.info('Starting AI Anomaly Scheduler (runs daily at 03:00 AM)');

  cron.schedule('0 3 * * *', async () => {
    logger.info('Running scheduled AI Anomaly Scan...');
    try {
      // Run scan for all operators (operatorId = null)
      const result = await runAnomalyScan(null);
      logger.info(`AI Anomaly Scan completed. Detected: ${result.detected}, Alerts Dispatched: ${result.alertsDispatched}`);
    } catch (error) {
      logger.error(`Error during scheduled AI Anomaly Scan: ${error.message}`);
    }
  });
}
