import { query } from '../../config/db.js';

/* ── Table bootstrap ─────────────────────────────────────────────────────── */
export async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS spectrum_assignments (
      assignment_id   INT AUTO_INCREMENT PRIMARY KEY,
      assignment_ref  VARCHAR(32) NOT NULL UNIQUE,
      operator_id     INT NOT NULL,
      band_name       VARCHAR(64) NOT NULL,
      frequency_low   DECIMAL(10,3) NOT NULL,
      frequency_high  DECIMAL(10,3) NOT NULL,
      bandwidth_mhz   DECIMAL(8,3) NOT NULL,
      technology      ENUM('2G','3G','4G','5G','Other') DEFAULT 'Other',
      region          VARCHAR(128) DEFAULT 'National',
      license_ref     VARCHAR(64),
      status          ENUM('ACTIVE','PENDING','SUSPENDED','EXPIRED') DEFAULT 'ACTIVE',
      assigned_date   DATE,
      expiry_date     DATE,
      fee_usd         DECIMAL(14,2),
      notes           TEXT,
      created_by      INT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (operator_id) REFERENCES operators(operator_id)
    )`);

  await query(`
    CREATE TABLE IF NOT EXISTS spectrum_interference (
      report_id         INT AUTO_INCREMENT PRIMARY KEY,
      report_ref        VARCHAR(32) NOT NULL UNIQUE,
      reporter_op_id    INT,
      affected_op_id    INT,
      band_name         VARCHAR(64),
      frequency_mhz     DECIMAL(10,3),
      region            VARCHAR(128),
      lat               DECIMAL(9,6),
      lng               DECIMAL(9,6),
      severity          ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
      status            ENUM('OPEN','INVESTIGATING','RESOLVED','DISMISSED') DEFAULT 'OPEN',
      description       TEXT,
      reported_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at       DATETIME,
      resolution_notes  TEXT,
      assigned_to       INT,
      FOREIGN KEY (reporter_op_id) REFERENCES operators(operator_id),
      FOREIGN KEY (affected_op_id) REFERENCES operators(operator_id)
    )`);
}

ensureTables().catch(console.error);

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function genRef(prefix) {
  const now = new Date();
  const ym  = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${ym}-${rnd}`;
}

/* ── Assignments ─────────────────────────────────────────────────────────── */
export async function listAssignments({ operatorId, band, status, expiringDays } = {}) {
  const conds = ['1=1'];
  const p     = {};
  if (operatorId)   { conds.push('sa.operator_id = :operatorId');  p.operatorId = operatorId; }
  if (band)         { conds.push('sa.band_name = :band');           p.band = band; }
  if (status)       { conds.push('sa.status = :status');            p.status = status; }
  if (expiringDays) { conds.push('sa.expiry_date <= DATE_ADD(NOW(), INTERVAL :expiringDays DAY) AND sa.expiry_date >= CURDATE()'); p.expiringDays = expiringDays; }

  return query(`
    SELECT sa.*,
           o.operator_name,
           DATEDIFF(sa.expiry_date, CURDATE()) AS days_to_expiry
      FROM spectrum_assignments sa
      JOIN operators o ON o.operator_id = sa.operator_id
     WHERE ${conds.join(' AND ')}
     ORDER BY sa.band_name, sa.frequency_low`, p);
}

export async function getAssignment(id) {
  const [row] = await query(`
    SELECT sa.*,
           o.operator_name,
           DATEDIFF(sa.expiry_date, CURDATE()) AS days_to_expiry
      FROM spectrum_assignments sa
      JOIN operators o ON o.operator_id = sa.operator_id
     WHERE sa.assignment_id = :id`, { id });
  return row || null;
}

export async function createAssignment(data, userId) {
  const ref = genRef('SPEC');
  const {
    operator_id, band_name, frequency_low, frequency_high, bandwidth_mhz,
    technology, region, license_ref, status, assigned_date, expiry_date,
    fee_usd, notes,
  } = data;

  const result = await query(`
    INSERT INTO spectrum_assignments
      (assignment_ref, operator_id, band_name, frequency_low, frequency_high,
       bandwidth_mhz, technology, region, license_ref, status, assigned_date,
       expiry_date, fee_usd, notes, created_by)
    VALUES
      (:ref, :operator_id, :band_name, :frequency_low, :frequency_high,
       :bandwidth_mhz, :technology, :region, :license_ref, :status, :assigned_date,
       :expiry_date, :fee_usd, :notes, :userId)`,
    { ref, operator_id, band_name, frequency_low, frequency_high,
      bandwidth_mhz, technology, region: region || 'National',
      license_ref, status: status || 'ACTIVE', assigned_date, expiry_date,
      fee_usd, notes, userId });

  return getAssignment(result.insertId);
}

export async function updateAssignment(id, data) {
  const fields = ['band_name','frequency_low','frequency_high','bandwidth_mhz',
                  'technology','region','license_ref','status','assigned_date',
                  'expiry_date','fee_usd','notes'];
  const sets = fields.filter((f) => data[f] !== undefined).map((f) => `${f} = :${f}`);
  if (!sets.length) return getAssignment(id);
  await query(`UPDATE spectrum_assignments SET ${sets.join(', ')} WHERE assignment_id = :id`,
    { ...data, id });
  return getAssignment(id);
}

export async function deleteAssignment(id) {
  await query(`DELETE FROM spectrum_assignments WHERE assignment_id = :id`, { id });
}

/* ── Band overview ───────────────────────────────────────────────────────── */
export async function bandSummary() {
  const bands = await query(`
    SELECT sa.band_name,
           MIN(sa.frequency_low)  AS freq_min,
           MAX(sa.frequency_high) AS freq_max,
           COUNT(*)               AS total_assignments,
           SUM(sa.status='ACTIVE') AS active_count,
           COUNT(DISTINCT sa.operator_id) AS operator_count,
           SUM(sa.bandwidth_mhz)  AS total_bw_mhz,
           GROUP_CONCAT(DISTINCT sa.technology ORDER BY sa.technology SEPARATOR ',') AS technologies
      FROM spectrum_assignments sa
     GROUP BY sa.band_name
     ORDER BY freq_min`);

  const operators = await query(
    `SELECT o.operator_id, o.operator_name,
            sa.band_name, sa.frequency_low, sa.frequency_high,
            sa.bandwidth_mhz, sa.technology, sa.status
       FROM spectrum_assignments sa
       JOIN operators o ON o.operator_id = sa.operator_id
      WHERE sa.status IN ('ACTIVE','PENDING')
      ORDER BY sa.frequency_low`);

  return { bands, assignments: operators };
}

export async function spectrumSummary() {
  const [totals] = await query(`
    SELECT
      COUNT(*) AS total,
      SUM(status='ACTIVE') AS active,
      SUM(status='EXPIRED') AS expired,
      SUM(status='SUSPENDED') AS suspended,
      SUM(expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)
          AND status='ACTIVE') AS expiring_90d,
      SUM(expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
          AND status='ACTIVE') AS expiring_30d,
      ROUND(SUM(bandwidth_mhz),2) AS total_bw_mhz,
      COUNT(DISTINCT band_name) AS band_count,
      COUNT(DISTINCT operator_id) AS operator_count
    FROM spectrum_assignments`).catch(() => [{}]);

  const [interference] = await query(`
    SELECT COUNT(*) AS open,
           SUM(status='INVESTIGATING') AS investigating,
           SUM(severity='CRITICAL' AND status='OPEN') AS critical_open
    FROM spectrum_interference`).catch(() => [{}]);

  return { ...totals, interference };
}

/* ── Interference reports ────────────────────────────────────────────────── */
export async function listInterference({ status, operatorId, severity } = {}) {
  const conds = ['1=1'];
  const p     = {};
  if (status)     { conds.push('si.status = :status');   p.status = status; }
  if (severity)   { conds.push('si.severity = :severity'); p.severity = severity; }
  if (operatorId) { conds.push('(si.reporter_op_id = :operatorId OR si.affected_op_id = :operatorId)'); p.operatorId = operatorId; }

  return query(`
    SELECT si.*,
           r.operator_name AS reporter_name,
           a.operator_name AS affected_name
      FROM spectrum_interference si
      LEFT JOIN operators r ON r.operator_id = si.reporter_op_id
      LEFT JOIN operators a ON a.operator_id = si.affected_op_id
     WHERE ${conds.join(' AND ')}
     ORDER BY FIELD(si.severity,'CRITICAL','HIGH','MEDIUM','LOW'), si.reported_at DESC`, p);
}

export async function getInterference(id) {
  const [row] = await query(`
    SELECT si.*,
           r.operator_name AS reporter_name,
           a.operator_name AS affected_name
      FROM spectrum_interference si
      LEFT JOIN operators r ON r.operator_id = si.reporter_op_id
      LEFT JOIN operators a ON a.operator_id = si.affected_op_id
     WHERE si.report_id = :id`, { id });
  return row || null;
}

export async function fileInterference(data, userId) {
  const ref = genRef('INT');
  const {
    reporter_op_id, affected_op_id, band_name, frequency_mhz,
    region, lat, lng, severity, description,
  } = data;

  const result = await query(`
    INSERT INTO spectrum_interference
      (report_ref, reporter_op_id, affected_op_id, band_name, frequency_mhz,
       region, lat, lng, severity, description, assigned_to)
    VALUES
      (:ref, :reporter_op_id, :affected_op_id, :band_name, :frequency_mhz,
       :region, :lat, :lng, :severity, :description, :userId)`,
    { ref, reporter_op_id, affected_op_id, band_name,
      frequency_mhz: frequency_mhz || null, region: region || null,
      lat: lat || null, lng: lng || null,
      severity: severity || 'MEDIUM', description, userId });

  return getInterference(result.insertId);
}

export async function updateInterference(id, data) {
  const { status, resolution_notes, assigned_to, severity } = data;
  const sets = [];
  const p    = { id };
  if (status !== undefined) {
    sets.push('status = :status'); p.status = status;
    if (status === 'RESOLVED') { sets.push('resolved_at = NOW()'); }
  }
  if (resolution_notes !== undefined) { sets.push('resolution_notes = :resolution_notes'); p.resolution_notes = resolution_notes; }
  if (assigned_to !== undefined)      { sets.push('assigned_to = :assigned_to'); p.assigned_to = assigned_to; }
  if (severity !== undefined)         { sets.push('severity = :severity'); p.severity = severity; }
  if (!sets.length) return getInterference(id);
  await query(`UPDATE spectrum_interference SET ${sets.join(', ')} WHERE report_id = :id`, p);
  return getInterference(id);
}

/* ── Expiry watchlist ────────────────────────────────────────────────────── */
export async function expiryWatchlist(days = 180) {
  return query(`
    SELECT sa.*,
           o.operator_name,
           DATEDIFF(sa.expiry_date, CURDATE()) AS days_to_expiry
      FROM spectrum_assignments sa
      JOIN operators o ON o.operator_id = sa.operator_id
     WHERE sa.status = 'ACTIVE'
       AND sa.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL :days DAY)
     ORDER BY sa.expiry_date ASC`, { days });
}
