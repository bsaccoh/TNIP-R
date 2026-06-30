import { query } from '../../config/db.js';

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
