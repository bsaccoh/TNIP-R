import crypto from 'crypto';
import { query } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

async function ensureTables() {
  await query(`CREATE TABLE IF NOT EXISTS operator_api_keys (
    key_id        INT AUTO_INCREMENT PRIMARY KEY,
    key_ref       VARCHAR(40)  NOT NULL UNIQUE,
    operator_id   INT          NOT NULL,
    key_hash      VARCHAR(128) NOT NULL,           -- SHA-256 of the raw key
    key_prefix    VARCHAR(12)  NOT NULL,           -- first 8 chars, shown in UI
    label         VARCHAR(100) NULL,
    status        ENUM('ACTIVE','REVOKED') DEFAULT 'ACTIVE',
    scopes        JSON         NULL,               -- ['push:pm','push:kpi','push:alarms']
    rate_limit    INT          DEFAULT 1000,       -- requests per hour
    last_used_at  DATETIME     NULL,
    expires_at    DATETIME     NULL,
    created_by    INT          NULL,
    revoked_by    INT          NULL,
    revoked_at    DATETIME     NULL,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id) ON DELETE CASCADE,
    INDEX idx_key_hash (key_hash),
    INDEX idx_operator (operator_id)
  ) ENGINE=InnoDB`);

  await query(`CREATE TABLE IF NOT EXISTS gateway_push_log (
    log_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    key_id        INT          NOT NULL,
    operator_id   INT          NOT NULL,
    endpoint      VARCHAR(100) NOT NULL,
    method        VARCHAR(10)  NOT NULL DEFAULT 'POST',
    status_code   SMALLINT     NOT NULL,
    rows_received INT          DEFAULT 0,
    rows_accepted INT          DEFAULT 0,
    error_msg     TEXT         NULL,
    ip_address    VARCHAR(45)  NULL,
    duration_ms   INT          NULL,
    pushed_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_operator_time (operator_id, pushed_at),
    INDEX idx_key (key_id)
  ) ENGINE=InnoDB`);
}

/* ── Key management ──────────────────────────────────────────────────────── */
function generateRawKey() {
  return 'ntk_' + crypto.randomBytes(32).toString('hex');
}

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export async function createApiKey({ operatorId, label, scopes, rateLimit, expiresAt, createdBy }) {
  await ensureTables();
  const raw    = generateRawKey();
  const hash   = hashKey(raw);
  const prefix = raw.slice(0, 12);
  const ref    = `NTAK-${Date.now().toString(36).toUpperCase()}`;

  await query(`
    INSERT INTO operator_api_keys
      (key_ref, operator_id, key_hash, key_prefix, label, scopes, rate_limit, expires_at, created_by)
    VALUES
      (:ref, :operatorId, :hash, :prefix, :label, :scopes, :rateLimit, :expiresAt, :createdBy)`,
    {
      ref, operatorId, hash, prefix,
      label:     label     ?? null,
      scopes:    scopes    ? JSON.stringify(scopes) : JSON.stringify(['push:pm', 'push:kpi']),
      rateLimit: rateLimit ?? 1000,
      expiresAt: expiresAt ?? null,
      createdBy: createdBy ?? null,
    });

  return { raw, prefix, ref, message: 'Store this key securely — it will not be shown again.' };
}

export async function listApiKeys(operatorId) {
  await ensureTables();
  return query(`
    SELECT k.key_id, k.key_ref, k.key_prefix, k.label, k.status, k.scopes,
           k.rate_limit, k.last_used_at, k.expires_at, k.created_at, k.revoked_at,
           o.operator_name, u.full_name AS created_by_name
      FROM operator_api_keys k
      JOIN operators o ON o.operator_id = k.operator_id
      LEFT JOIN users u ON u.user_id = k.created_by
     WHERE k.operator_id = :operatorId
     ORDER BY k.created_at DESC`, { operatorId });
}

export async function listAllApiKeys({ status } = {}) {
  await ensureTables();
  const where = status ? 'WHERE k.status = :status' : '';
  return query(`
    SELECT k.key_id, k.key_ref, k.key_prefix, k.label, k.status, k.scopes,
           k.rate_limit, k.last_used_at, k.expires_at, k.created_at,
           o.operator_name, o.operator_id
      FROM operator_api_keys k
      JOIN operators o ON o.operator_id = k.operator_id
     ${where}
     ORDER BY k.created_at DESC`, status ? { status } : {});
}

export async function revokeApiKey(keyId, revokedBy) {
  await ensureTables();
  const [key] = await query(`SELECT * FROM operator_api_keys WHERE key_id = :keyId`, { keyId });
  if (!key) throw ApiError.badRequest('Key not found');
  if (key.status === 'REVOKED') throw ApiError.badRequest('Key already revoked');
  await query(`UPDATE operator_api_keys
               SET status='REVOKED', revoked_by=:revokedBy, revoked_at=NOW()
               WHERE key_id=:keyId`, { keyId, revokedBy });
}

/* ── Authentication (called by middleware) ───────────────────────────────── */
export async function authenticateKey(rawKey) {
  await ensureTables();
  const hash = hashKey(rawKey);
  const [key] = await query(`
    SELECT k.*, o.operator_id, o.operator_name, o.status AS operator_status
      FROM operator_api_keys k
      JOIN operators o ON o.operator_id = k.operator_id
     WHERE k.key_hash = :hash`, { hash });

  if (!key)                           throw ApiError.forbidden('Invalid API key');
  if (key.status !== 'ACTIVE')        throw ApiError.forbidden('API key has been revoked');
  if (key.operator_status !== 'ACTIVE') throw ApiError.forbidden('Operator account is not active');
  if (key.expires_at && new Date(key.expires_at) < new Date())
    throw ApiError.forbidden('API key has expired');

  // Update last_used_at (fire-and-forget)
  query(`UPDATE operator_api_keys SET last_used_at=NOW() WHERE key_id=:id`, { id: key.key_id })
    .catch(() => {});

  return key;
}

/* ── Push log ────────────────────────────────────────────────────────────── */
export async function recordPush({
  keyId, operatorId, endpoint, method = 'POST',
  statusCode, rowsReceived = 0, rowsAccepted = 0,
  errorMsg, ipAddress, durationMs,
}) {
  await ensureTables();
  await query(`
    INSERT INTO gateway_push_log
      (key_id, operator_id, endpoint, method, status_code,
       rows_received, rows_accepted, error_msg, ip_address, duration_ms)
    VALUES
      (:keyId, :operatorId, :endpoint, :method, :statusCode,
       :rowsReceived, :rowsAccepted, :errorMsg, :ipAddress, :durationMs)`,
    { keyId, operatorId, endpoint, method, statusCode,
      rowsReceived, rowsAccepted,
      errorMsg: errorMsg ?? null, ipAddress: ipAddress ?? null,
      durationMs: durationMs ?? null });
}

export async function getPushLogs({ operatorId, keyId, limit = 100, offset = 0 } = {}) {
  await ensureTables();
  const conds = []; const params = {};
  if (operatorId) { conds.push('l.operator_id = :operatorId'); params.operatorId = operatorId; }
  if (keyId)      { conds.push('l.key_id = :keyId');           params.keyId = keyId; }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  params.limit = Number(limit); params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(`
      SELECT l.*, o.operator_name, k.key_prefix, k.label AS key_label
        FROM gateway_push_log l
        JOIN operators o ON o.operator_id = l.operator_id
        JOIN operator_api_keys k ON k.key_id = l.key_id
       ${where}
       ORDER BY l.pushed_at DESC
       LIMIT :limit OFFSET :offset`, params),
    query(`SELECT COUNT(*) AS total FROM gateway_push_log l ${where}`, params),
  ]);
  return { rows, total };
}

export async function pushStats(operatorId) {
  await ensureTables();
  const params = operatorId ? { operatorId } : {};
  const where  = operatorId ? 'WHERE operator_id = :operatorId' : '';

  const [agg] = await query(`
    SELECT COUNT(*) AS total_calls,
           SUM(rows_accepted) AS total_rows,
           SUM(status_code < 300) AS success_calls,
           SUM(status_code >= 400) AS error_calls,
           ROUND(AVG(duration_ms)) AS avg_duration_ms,
           SUM(status_code < 300 AND pushed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS calls_24h
      FROM gateway_push_log ${where}`, params);

  const byEndpoint = await query(`
    SELECT endpoint,
           COUNT(*) AS calls,
           SUM(rows_accepted) AS rows,
           SUM(status_code >= 400) AS errors
      FROM gateway_push_log ${where}
     GROUP BY endpoint
     ORDER BY calls DESC`, params);

  return { ...agg, byEndpoint };
}

/* ── Data push handlers ──────────────────────────────────────────────────── */
export async function pushPmData({ operatorId, rows }) {
  if (!Array.isArray(rows) || rows.length === 0)
    throw ApiError.badRequest('rows must be a non-empty array');

  let accepted = 0;
  const errors = [];

  for (const row of rows) {
    if (!row.counter_name || !row.timestamp || !row.value == null) {
      errors.push({ row, error: 'Missing required fields: counter_name, timestamp, value' });
      continue;
    }
    try {
      await query(`
        INSERT INTO pm_raw_data (operator_id, counter_name, element_id, technology,
                                 timestamp, value, unit, source)
        VALUES (:operatorId, :counterName, :elementId, :technology,
                :timestamp, :value, :unit, 'API_PUSH')
        ON DUPLICATE KEY UPDATE value=VALUES(value), unit=VALUES(unit)`,
        {
          operatorId,
          counterName: row.counter_name,
          elementId:   row.element_id   ?? null,
          technology:  row.technology   ?? null,
          timestamp:   row.timestamp,
          value:       row.value,
          unit:        row.unit         ?? null,
        });
      accepted++;
    } catch (e) {
      errors.push({ row, error: e.message });
    }
  }

  return { received: rows.length, accepted, rejected: errors.length, errors: errors.slice(0, 10) };
}

export async function pushKpiData({ operatorId, rows }) {
  if (!Array.isArray(rows) || rows.length === 0)
    throw ApiError.badRequest('rows must be a non-empty array');

  let accepted = 0;
  const errors = [];

  for (const row of rows) {
    if (!row.kpi_name || !row.period_start || row.value == null) {
      errors.push({ row, error: 'Missing required fields: kpi_name, period_start, value' });
      continue;
    }
    try {
      await query(`
        INSERT INTO kpi_measurements (operator_id, kpi_name, technology, region,
                                      period_start, period_end, value, unit, source)
        VALUES (:operatorId, :kpiName, :technology, :region,
                :periodStart, :periodEnd, :value, :unit, 'API_PUSH')
        ON DUPLICATE KEY UPDATE value=VALUES(value)`,
        {
          operatorId,
          kpiName:     row.kpi_name,
          technology:  row.technology  ?? null,
          region:      row.region      ?? null,
          periodStart: row.period_start,
          periodEnd:   row.period_end  ?? null,
          value:       row.value,
          unit:        row.unit        ?? null,
        });
      accepted++;
    } catch (e) {
      errors.push({ row, error: e.message });
    }
  }

  return { received: rows.length, accepted, rejected: errors.length, errors: errors.slice(0, 10) };
}

export async function pushAlarms({ operatorId, rows }) {
  if (!Array.isArray(rows) || rows.length === 0)
    throw ApiError.badRequest('rows must be a non-empty array');

  let accepted = 0;
  const errors = [];

  for (const row of rows) {
    if (!row.alarm_name || !row.severity || !row.raised_at) {
      errors.push({ row, error: 'Missing required fields: alarm_name, severity, raised_at' });
      continue;
    }
    try {
      await query(`
        INSERT INTO network_alarms (operator_id, alarm_name, element_id, technology,
                                    severity, description, raised_at, cleared_at, source)
        VALUES (:operatorId, :alarmName, :elementId, :technology,
                :severity, :description, :raisedAt, :clearedAt, 'API_PUSH')`,
        {
          operatorId,
          alarmName:   row.alarm_name,
          elementId:   row.element_id  ?? null,
          technology:  row.technology  ?? null,
          severity:    row.severity,
          description: row.description ?? null,
          raisedAt:    row.raised_at,
          clearedAt:   row.cleared_at  ?? null,
        });
      accepted++;
    } catch (e) {
      errors.push({ row, error: e.message });
    }
  }

  return { received: rows.length, accepted, rejected: errors.length, errors: errors.slice(0, 10) };
}
