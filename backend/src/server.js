import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { waitForDb } from './config/db.js';
import { ensureSeedAdmin } from './seed/ensureAdmin.js';
import { startSftpPoller } from './modules/sftp/sftp.poller.js';
import { startReportScheduler } from './jobs/reportScheduler.js';
import { startAnomalyScheduler } from './jobs/anomalyScheduler.js';

async function main() {
  await waitForDb();
  await ensureSeedAdmin();

  const app = createApp();
  app.listen(env.port, () => {
    logger.info(`TNIP-R backend listening on :${env.port} (${env.nodeEnv})`);
    logger.info(`Swagger UI at /docs · OpenAPI at /openapi.json`);
  });

  // Start real-time SFTP feeds (no-op if none enabled).
  await startSftpPoller();

  // Start scheduled report runner (checks every 5 min).
  startReportScheduler();

  // Start AI Predictive Analytics anomaly scheduler (runs daily).
  startAnomalyScheduler();
}

main().catch((err) => {
  logger.error(`Fatal startup error: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => logger.error(`Unhandled rejection: ${reason}`));
