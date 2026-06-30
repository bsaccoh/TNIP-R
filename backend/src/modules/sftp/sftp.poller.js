import { query } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { pullOnce } from './sftp.service.js';

// Lightweight in-process scheduler for real-time SFTP feeds. Each enabled
// connection is polled on its own interval. For multi-instance deployments,
// move this to a dedicated worker + distributed lock.
const timers = new Map();

async function runConnection(id) {
  try {
    const res = await pullOnce(id);
    if (res.pulled || res.failed) logger.info(`SFTP poll [${res.connection}] pulled=${res.pulled} ingested=${res.ingested} failed=${res.failed}`);
  } catch (err) {
    logger.warn(`SFTP poll ${id} error: ${err.message}`);
  }
}

export async function startSftpPoller() {
  let conns = [];
  try {
    conns = await query('SELECT sftp_id, name, poll_interval_sec FROM sftp_connections WHERE poll_enabled = 1');
  } catch (err) {
    logger.warn(`SFTP poller init skipped: ${err.message}`);
    return;
  }
  for (const c of conns) {
    const everyMs = Math.max(60, c.poll_interval_sec || 300) * 1000;
    const t = setInterval(() => runConnection(c.sftp_id), everyMs);
    timers.set(c.sftp_id, t);
    logger.info(`SFTP poller scheduled "${c.name}" every ${everyMs / 1000}s`);
  }
  if (conns.length) logger.info(`SFTP poller started for ${conns.length} connection(s)`);
}

export function stopSftpPoller() {
  for (const t of timers.values()) clearInterval(t);
  timers.clear();
}
