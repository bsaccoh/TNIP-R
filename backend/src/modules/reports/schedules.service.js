import { query } from '../../config/db.js';

export async function ensureRunLogTable() {
  await query(`CREATE TABLE IF NOT EXISTS schedule_run_logs (
    log_id        INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id   INT          NOT NULL,
    triggered_by  ENUM('AUTO','MANUAL') DEFAULT 'AUTO',
    status        ENUM('SUCCESS','FAILED','PARTIAL') DEFAULT 'SUCCESS',
    rows_exported INT          NULL,
    recipients    TEXT         NULL,
    emailed       TINYINT(1)   DEFAULT 0,
    error_message TEXT         NULL,
    duration_ms   INT          NULL,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);
}

export async function recordRunLog({ scheduleId, triggeredBy = 'AUTO', status, rowsExported, recipients, emailed, errorMessage, durationMs }) {
  await ensureRunLogTable();
  await query(`INSERT INTO schedule_run_logs
    (schedule_id, triggered_by, status, rows_exported, recipients, emailed, error_message, duration_ms)
    VALUES (:scheduleId, :triggeredBy, :status, :rowsExported, :recipients, :emailed, :errorMessage, :durationMs)`,
    { scheduleId, triggeredBy, status, rowsExported: rowsExported ?? null,
      recipients: recipients ?? null, emailed: emailed ? 1 : 0,
      errorMessage: errorMessage ?? null, durationMs: durationMs ?? null });
}

export async function listRunLogs(scheduleId, limit = 20) {
  await ensureRunLogTable();
  return query(`SELECT * FROM schedule_run_logs
                 WHERE schedule_id = :scheduleId
                 ORDER BY created_at DESC LIMIT :limit`, { scheduleId, limit });
}

export async function allRecentLogs(limit = 50) {
  await ensureRunLogTable();
  return query(`SELECT l.*, s.name AS schedule_name, s.report_type
                  FROM schedule_run_logs l
                  JOIN scheduled_reports s ON s.schedule_id = l.schedule_id
                 ORDER BY l.created_at DESC LIMIT :limit`, { limit });
}

export async function scheduleStats() {
  await ensureRunLogTable();
  const [totals] = await query(`SELECT COUNT(*) AS total_schedules,
    SUM(is_active) AS active_schedules FROM scheduled_reports`);
  const [runStats] = await query(`SELECT COUNT(*) AS total_runs,
    SUM(status='SUCCESS') AS successful, SUM(status='FAILED') AS failed,
    SUM(emailed) AS emails_sent FROM schedule_run_logs`);
  const nextDue = await query(
    `SELECT name, next_run_at FROM scheduled_reports
      WHERE is_active = 1 ORDER BY next_run_at ASC LIMIT 1`);
  return { ...totals, ...runStats, nextDue: nextDue[0] ?? null };
}

function nextRun(frequency, dayOfWeek, dayOfMonth) {
  const now = new Date();
  const d = new Date(now);
  if (frequency === 'DAILY') {
    d.setDate(d.getDate() + 1);
    d.setHours(6, 0, 0, 0);
  } else if (frequency === 'WEEKLY') {
    const target = dayOfWeek ?? 1;
    const diff = (target - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(6, 0, 0, 0);
  } else {
    const dom = dayOfMonth ?? 1;
    d.setMonth(d.getMonth() + 1, dom);
    d.setHours(6, 0, 0, 0);
  }
  return d;
}

export async function listSchedules() {
  return query(`
    SELECT s.*, o.operator_name
      FROM scheduled_reports s
      LEFT JOIN operators o ON o.operator_id = s.operator_id
     ORDER BY s.is_active DESC, s.next_run_at ASC
  `);
}

export async function createSchedule(data, userId) {
  const nr = nextRun(data.frequency, data.day_of_week, data.day_of_month);
  const r = await query(`
    INSERT INTO scheduled_reports
      (name, report_type, operator_id, format, frequency,
       day_of_week, day_of_month, recipients, is_active, next_run_at, created_by)
    VALUES (:name,:type,:op,:format,:freq,:dow,:dom,:recip,1,:next,:by)`,
    {
      name: data.name, type: data.report_type, op: data.operator_id ?? null,
      format: data.format ?? 'XLSX', freq: data.frequency,
      dow: data.day_of_week ?? null, dom: data.day_of_month ?? null,
      recip: data.recipients ?? null, next: nr, by: userId,
    });
  return (await query('SELECT s.*, o.operator_name FROM scheduled_reports s LEFT JOIN operators o ON o.operator_id = s.operator_id WHERE s.schedule_id = :id', { id: r.insertId }))[0];
}

export async function updateSchedule(id, data) {
  const nr = nextRun(data.frequency, data.day_of_week, data.day_of_month);
  await query(`
    UPDATE scheduled_reports SET
      name=:name, report_type=:type, operator_id=:op, format=:format,
      frequency=:freq, day_of_week=:dow, day_of_month=:dom,
      recipients=:recip, is_active=:active, next_run_at=:next
    WHERE schedule_id=:id`,
    {
      id, name: data.name, type: data.report_type, op: data.operator_id ?? null,
      format: data.format ?? 'XLSX', freq: data.frequency,
      dow: data.day_of_week ?? null, dom: data.day_of_month ?? null,
      recip: data.recipients ?? null, active: data.is_active ? 1 : 0, next: nr,
    });
  return (await query('SELECT s.*, o.operator_name FROM scheduled_reports s LEFT JOIN operators o ON o.operator_id = s.operator_id WHERE s.schedule_id = :id', { id }))[0];
}

export async function deleteSchedule(id) {
  await query('DELETE FROM scheduled_reports WHERE schedule_id = :id', { id });
}

export async function markRan(id) {
  const row = (await query('SELECT * FROM scheduled_reports WHERE schedule_id = :id', { id }))[0];
  if (!row) return;
  const nr = nextRun(row.frequency, row.day_of_week, row.day_of_month);
  await query('UPDATE scheduled_reports SET last_run_at=NOW(), next_run_at=:nr WHERE schedule_id=:id', { nr, id });
}
