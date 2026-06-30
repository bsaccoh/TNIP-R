import SftpClient from 'ssh2-sftp-client';
import { query } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { ApiError } from '../../utils/ApiError.js';
import { ingestArchive } from '../ingestion/ingestion.service.js';

// LIKE-style pattern → RegExp ("%.csv.gz" or "HOST03_*.csv.gz").
function patternToRegex(pattern) {
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/[%*]/g, '.*').replace(/[_?]/g, '.');
  return new RegExp(`^${esc}$`, 'i');
}

async function connect(cfg) {
  const sftp = new SftpClient();
  const opts = { host: cfg.host, port: cfg.port || 22, username: cfg.username };
  if (cfg.auth_type === 'KEY') opts.privateKey = cfg.secret;
  else opts.password = cfg.secret;
  await sftp.connect(opts);
  return sftp;
}

export async function listConnections(operatorId) {
  const where = operatorId != null ? 'WHERE operator_id = :op' : '';
  return query(
    `SELECT sftp_id, operator_id, name, host, port, username, auth_type, remote_path,
            file_pattern, delete_after, poll_enabled, poll_interval_sec, last_run_at, last_status
       FROM sftp_connections ${where} ORDER BY name`,
    operatorId != null ? { op: operatorId } : {});
}

export async function createConnection(data) {
  const r = await query(
    `INSERT INTO sftp_connections
       (operator_id, name, host, port, username, auth_type, secret, remote_path, file_pattern,
        delete_after, poll_enabled, poll_interval_sec)
     VALUES (:operator_id,:name,:host,:port,:username,:auth_type,:secret,:remote_path,:file_pattern,
        :delete_after,:poll_enabled,:poll_interval_sec)`,
    {
      operator_id: data.operator_id, name: data.name, host: data.host, port: data.port ?? 22,
      username: data.username, auth_type: data.auth_type ?? 'PASSWORD', secret: data.secret ?? null,
      remote_path: data.remote_path, file_pattern: data.file_pattern ?? '%.csv.gz',
      delete_after: data.delete_after ? 1 : 0, poll_enabled: data.poll_enabled ? 1 : 0,
      poll_interval_sec: data.poll_interval_sec ?? 300,
    });
  return (await query('SELECT * FROM sftp_connections WHERE sftp_id = :id', { id: r.insertId }))[0];
}

export async function deleteConnection(id) {
  await query('DELETE FROM sftp_connections WHERE sftp_id = :id', { id });
}

export async function testConnection(id) {
  const cfg = (await query('SELECT * FROM sftp_connections WHERE sftp_id = :id', { id }))[0];
  if (!cfg) throw ApiError.notFound('SFTP connection not found');
  const sftp = await connect(cfg);
  try {
    const list = await sftp.list(cfg.remote_path);
    return { ok: true, remotePath: cfg.remote_path, fileCount: list.length };
  } finally { await sftp.end(); }
}

/**
 * Pull new files from an SFTP connection and ingest them.
 * Idempotent: files already recorded in ingestion_jobs (DONE/DUPLICATE) are skipped.
 * @param max safety cap on files per run (volumes can be ~19.5k/day).
 */
export async function pullOnce(id, { max = 200 } = {}) {
  const cfg = (await query('SELECT * FROM sftp_connections WHERE sftp_id = :id', { id }))[0];
  if (!cfg) throw ApiError.notFound('SFTP connection not found');
  const re = patternToRegex(cfg.file_pattern || '%');
  const sftp = await connect(cfg);
  const summary = { connection: cfg.name, pulled: 0, ingested: 0, skipped: 0, failed: 0, files: [] };
  try {
    const remote = (await sftp.list(cfg.remote_path)).filter((f) => f.type === '-' && re.test(f.name));
    for (const f of remote.slice(0, max)) {
      const done = await query(
        `SELECT job_id FROM ingestion_jobs WHERE sftp_id=:s AND remote_file=:f AND status IN ('DONE','DUPLICATE')`,
        { s: id, f: f.name });
      if (done.length) { summary.skipped++; continue; }

      const job = await query(
        `INSERT INTO ingestion_jobs (sftp_id, operator_id, source, remote_file, status, started_at)
         VALUES (:s,:op,'SFTP',:f,'RUNNING',NOW())`, { s: id, op: cfg.operator_id, f: f.name });
      const jobId = job.insertId;
      try {
        const remotePath = `${cfg.remote_path.replace(/\/$/, '')}/${f.name}`;
        const buffer = await sftp.get(remotePath);   // Buffer (no dst path)
        const res = await ingestArchive({ operatorId: cfg.operator_id, fileName: f.name, buffer, uploadedBy: null });
        summary.pulled++; summary.ingested += res.ok;
        await query(`UPDATE ingestion_jobs SET status='DONE', message=:m, finished_at=NOW() WHERE job_id=:id`,
          { m: `ingested ${res.ok}/${res.total}`, id: jobId });
        if (cfg.delete_after) await sftp.delete(remotePath).catch(() => {});
        summary.files.push({ file: f.name, ...res });
      } catch (err) {
        summary.failed++;
        await query(`UPDATE ingestion_jobs SET status='FAILED', message=:m, finished_at=NOW() WHERE job_id=:id`,
          { m: err.message?.slice(0, 500), id: jobId });
        logger.warn(`SFTP ingest ${f.name} failed: ${err.message}`);
      }
    }
    await query(`UPDATE sftp_connections SET last_run_at=NOW(), last_status=:s WHERE sftp_id=:id`,
      { s: `pulled ${summary.pulled}, skipped ${summary.skipped}, failed ${summary.failed}`, id });
    return summary;
  } finally { await sftp.end(); }
}
