import { query } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

async function ensureTables() {
  // network_alarms may be populated by the API gateway push endpoint
  await query(`CREATE TABLE IF NOT EXISTS network_alarms (
    alarm_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    operator_id   INT          NOT NULL,
    alarm_name    VARCHAR(200) NOT NULL,
    element_id    VARCHAR(200) NULL,
    technology    VARCHAR(20)  NULL,
    severity      ENUM('CRITICAL','MAJOR','MINOR','WARNING','INFO') DEFAULT 'MAJOR',
    description   TEXT         NULL,
    status        ENUM('ACTIVE','ACKNOWLEDGED','CLEARED') DEFAULT 'ACTIVE',
    source        VARCHAR(40)  DEFAULT 'API_PUSH',
    raised_at     DATETIME     NOT NULL,
    ack_at        DATETIME     NULL,
    ack_by        INT          NULL,
    cleared_at    DATETIME     NULL,
    cleared_by    INT          NULL,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id) ON DELETE CASCADE,
    INDEX idx_operator_status (operator_id, status),
    INDEX idx_raised (raised_at)
  ) ENGINE=InnoDB`);

  // pm_raw_data populated by gateway push
  await query(`CREATE TABLE IF NOT EXISTS pm_raw_data (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    operator_id   INT          NOT NULL,
    counter_name  VARCHAR(200) NOT NULL,
    element_id    VARCHAR(200) NULL,
    technology    VARCHAR(20)  NULL,
    timestamp     DATETIME     NOT NULL,
    value         DOUBLE       NOT NULL,
    unit          VARCHAR(40)  NULL,
    source        VARCHAR(40)  DEFAULT 'API_PUSH',
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id) ON DELETE CASCADE,
    INDEX idx_operator_counter (operator_id, counter_name, timestamp),
    UNIQUE KEY uq_push (operator_id, counter_name, element_id, timestamp)
  ) ENGINE=InnoDB`);

  // kpi_measurements populated by gateway push
  await query(`CREATE TABLE IF NOT EXISTS kpi_measurements (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    operator_id   INT          NOT NULL,
    kpi_name      VARCHAR(200) NOT NULL,
    technology    VARCHAR(20)  NULL,
    region        VARCHAR(100) NULL,
    period_start  DATETIME     NOT NULL,
    period_end    DATETIME     NULL,
    value         DOUBLE       NOT NULL,
    unit          VARCHAR(40)  NULL,
    source        VARCHAR(40)  DEFAULT 'API_PUSH',
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id) ON DELETE CASCADE,
    INDEX idx_operator_kpi (operator_id, kpi_name, period_start),
    UNIQUE KEY uq_kpi (operator_id, kpi_name, technology, period_start)
  ) ENGINE=InnoDB`);
}

/* ── Active alarms ───────────────────────────────────────────────────────── */
export async function listAlarms({ operatorId, status, severity, limit = 200, offset = 0 } = {}) {
  await ensureTables();
  const conds = []; const params = {};
  if (operatorId) { conds.push('a.operator_id = :operatorId'); params.operatorId = operatorId; }
  if (status)     { conds.push('a.status = :status');          params.status = status; }
  if (severity)   { conds.push('a.severity = :severity');      params.severity = severity; }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  params.limit = Number(limit); params.offset = Number(offset);

  return query(`
    SELECT a.*, o.operator_name, u.full_name AS ack_by_name
      FROM network_alarms a
      JOIN operators o ON o.operator_id = a.operator_id
      LEFT JOIN users u ON u.user_id = a.ack_by
     ${where}
     ORDER BY
       FIELD(a.severity,'CRITICAL','MAJOR','MINOR','WARNING','INFO'),
       a.raised_at DESC
     LIMIT :limit OFFSET :offset`, params);
}

export async function acknowledgeAlarm(alarmId, userId) {
  await ensureTables();
  const [alarm] = await query(`SELECT * FROM network_alarms WHERE alarm_id = :alarmId`, { alarmId });
  if (!alarm) throw ApiError.badRequest('Alarm not found');
  if (alarm.status !== 'ACTIVE') throw ApiError.badRequest('Alarm is not active');
  await query(`UPDATE network_alarms SET status='ACKNOWLEDGED', ack_at=NOW(), ack_by=:userId
               WHERE alarm_id=:alarmId`, { alarmId, userId });
}

export async function clearAlarm(alarmId, userId) {
  await ensureTables();
  const [alarm] = await query(`SELECT * FROM network_alarms WHERE alarm_id = :alarmId`, { alarmId });
  if (!alarm) throw ApiError.badRequest('Alarm not found');
  await query(`UPDATE network_alarms SET status='CLEARED', cleared_at=NOW(), cleared_by=:userId
               WHERE alarm_id=:alarmId`, { alarmId, userId });
}

/* ── Live pulse — recent gateway pushes ──────────────────────────────────── */
export async function livePulse(minutes = 60) {
  await ensureTables();
  const [summary] = await query(`
    SELECT COUNT(*) AS total_pushes,
           SUM(rows_accepted) AS total_rows,
           SUM(status_code >= 400) AS errors,
           COUNT(DISTINCT operator_id) AS active_operators
      FROM gateway_push_log
     WHERE pushed_at >= DATE_SUB(NOW(), INTERVAL :minutes MINUTE)`, { minutes });

  const byOperator = await query(`
    SELECT o.operator_name, l.operator_id,
           COUNT(*) AS pushes, SUM(l.rows_accepted) AS rows,
           MAX(l.pushed_at) AS last_push,
           SUM(l.status_code >= 400) AS errors
      FROM gateway_push_log l
      JOIN operators o ON o.operator_id = l.operator_id
     WHERE l.pushed_at >= DATE_SUB(NOW(), INTERVAL :minutes MINUTE)
     GROUP BY l.operator_id
     ORDER BY last_push DESC`, { minutes });

  const recent = await query(`
    SELECT l.pushed_at, l.endpoint, l.status_code, l.rows_accepted,
           l.duration_ms, l.error_msg, o.operator_name, k.key_prefix
      FROM gateway_push_log l
      JOIN operators o ON o.operator_id = l.operator_id
      JOIN operator_api_keys k ON k.key_id = l.key_id
     ORDER BY l.pushed_at DESC LIMIT 20`);

  return { summary, byOperator, recent };
}

/* ── KPI snapshot — latest value per operator+KPI ───────────────────────── */
export async function kpiSnapshot(operatorId) {
  await ensureTables();
  const where = operatorId ? 'WHERE m.operator_id = :operatorId' : '';
  const params = operatorId ? { operatorId } : {};

  return query(`
    SELECT m.operator_id, o.operator_name, m.kpi_name,
           m.technology, m.region, m.value, m.unit,
           m.period_start, m.created_at
      FROM kpi_measurements m
      JOIN operators o ON o.operator_id = m.operator_id
      JOIN (
        SELECT operator_id, kpi_name, MAX(period_start) AS latest
          FROM kpi_measurements
         ${where}
         GROUP BY operator_id, kpi_name
      ) latest ON latest.operator_id = m.operator_id
              AND latest.kpi_name    = m.kpi_name
              AND latest.latest      = m.period_start
     ORDER BY o.operator_name, m.kpi_name`, params);
}

/* ── PM snapshot — latest counter values per operator ────────────────────── */
export async function pmSnapshot(operatorId) {
  await ensureTables();
  const where = operatorId ? 'WHERE p.operator_id = :operatorId' : '';
  const params = operatorId ? { operatorId } : {};

  return query(`
    SELECT p.operator_id, o.operator_name, p.counter_name,
           p.element_id, p.technology, p.value, p.unit, p.timestamp
      FROM pm_raw_data p
      JOIN operators o ON o.operator_id = p.operator_id
      JOIN (
        SELECT operator_id, counter_name, MAX(timestamp) AS latest
          FROM pm_raw_data
         ${where}
         GROUP BY operator_id, counter_name
        LIMIT 100
      ) latest ON latest.operator_id  = p.operator_id
              AND latest.counter_name = p.counter_name
              AND latest.latest       = p.timestamp
     ORDER BY o.operator_name, p.counter_name
     LIMIT 200`, params);
}

/* ── Dashboard summary counts ────────────────────────────────────────────── */
export async function alarmSummary() {
  await ensureTables();
  const [counts] = await query(`
    SELECT
      SUM(status='ACTIVE' AND severity='CRITICAL')    AS critical_active,
      SUM(status='ACTIVE' AND severity='MAJOR')       AS major_active,
      SUM(status='ACTIVE' AND severity='MINOR')       AS minor_active,
      SUM(status='ACTIVE')                            AS total_active,
      SUM(status='ACKNOWLEDGED')                      AS acknowledged,
      SUM(status='CLEARED' AND cleared_at >= DATE_SUB(NOW(),INTERVAL 24 HOUR)) AS cleared_24h
    FROM network_alarms`);

  const byOperator = await query(`
    SELECT o.operator_name, a.operator_id,
           SUM(a.status='ACTIVE') AS active,
           SUM(a.status='ACTIVE' AND a.severity='CRITICAL') AS critical
      FROM network_alarms a
      JOIN operators o ON o.operator_id = a.operator_id
     WHERE a.status IN ('ACTIVE','ACKNOWLEDGED')
     GROUP BY a.operator_id
     ORDER BY critical DESC, active DESC`);

  return { counts, byOperator };
}
