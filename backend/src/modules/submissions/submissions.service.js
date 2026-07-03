import { query } from '../../config/db.js';

async function ensureTables() {
  await query(`CREATE TABLE IF NOT EXISTS submission_periods (
    period_id     INT AUTO_INCREMENT PRIMARY KEY,
    period_ref    VARCHAR(40)  NOT NULL UNIQUE,
    name          VARCHAR(255) NOT NULL,
    period_type   ENUM('MONTHLY','QUARTERLY','ANNUAL','ADHOC') DEFAULT 'MONTHLY',
    report_month  VARCHAR(7)   NULL,           -- YYYY-MM for monthly
    report_quarter VARCHAR(7)  NULL,           -- YYYY-QN for quarterly
    start_date    DATE         NOT NULL,
    end_date      DATE         NOT NULL,
    deadline      DATE         NOT NULL,
    instructions  TEXT         NULL,
    status        ENUM('DRAFT','OPEN','CLOSED','ARCHIVED') DEFAULT 'DRAFT',
    created_by    INT          NULL,
    closed_by     INT          NULL,
    closed_at     DATETIME     NULL,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);

  await query(`CREATE TABLE IF NOT EXISTS operator_submissions (
    submission_id  INT AUTO_INCREMENT PRIMARY KEY,
    period_id      INT         NOT NULL,
    operator_id    INT         NOT NULL,
    status         ENUM('PENDING','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','RESUBMIT_REQUIRED')
                               DEFAULT 'PENDING',
    submitted_at   DATETIME    NULL,
    submitted_by   INT         NULL,
    pm_file_ids    JSON        NULL,       -- array of pm_file_id linked to this submission
    notes          TEXT        NULL,       -- operator's submission notes
    reviewed_by    INT         NULL,
    reviewed_at    DATETIME    NULL,
    review_notes   TEXT        NULL,
    created_at     DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_period_op (period_id, operator_id),
    FOREIGN KEY (period_id)   REFERENCES submission_periods(period_id) ON DELETE CASCADE,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id)
  ) ENGINE=InnoDB`);
}

function generateRef(type) {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `SUB-${type.slice(0, 1)}${y}${m}-${rand}`;
}

/* ── Periods ─────────────────────────────────────────────────────────────── */
export async function listPeriods({ status, type, limit = 50, offset = 0 } = {}) {
  await ensureTables();
  const conds = []; const params = {};
  if (status) { conds.push('sp.status = :status'); params.status = status; }
  if (type)   { conds.push('sp.period_type = :type'); params.type = type; }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  params.limit = Number(limit); params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(`SELECT sp.*, u.full_name AS created_by_name,
                  COUNT(os.submission_id)                              AS total_operators,
                  SUM(os.status = 'SUBMITTED')                        AS submitted_count,
                  SUM(os.status = 'APPROVED')                         AS approved_count,
                  SUM(os.status = 'REJECTED')                         AS rejected_count,
                  SUM(os.status = 'PENDING')                          AS pending_count,
                  SUM(os.status IN ('UNDER_REVIEW','RESUBMIT_REQUIRED')) AS review_count
             FROM submission_periods sp
             LEFT JOIN users u ON u.user_id = sp.created_by
             LEFT JOIN operator_submissions os ON os.period_id = sp.period_id
            ${where}
            GROUP BY sp.period_id
            ORDER BY sp.deadline DESC
            LIMIT :limit OFFSET :offset`, params),
    query(`SELECT COUNT(*) AS total FROM submission_periods sp ${where}`, params),
  ]);
  return { rows, total, limit: params.limit, offset: params.offset };
}

export async function getPeriod(periodId) {
  await ensureTables();
  const [period] = await query(`
    SELECT sp.*, u.full_name AS created_by_name
      FROM submission_periods sp
      LEFT JOIN users u ON u.user_id = sp.created_by
     WHERE sp.period_id = :periodId`, { periodId });
  if (!period) return null;

  const submissions = await query(`
    SELECT os.*, o.operator_name,
           us.full_name AS submitted_by_name, ur.full_name AS reviewed_by_name
      FROM operator_submissions os
      JOIN operators o ON o.operator_id = os.operator_id
      LEFT JOIN users us ON us.user_id = os.submitted_by
      LEFT JOIN users ur ON ur.user_id = os.reviewed_by
     WHERE os.period_id = :periodId
     ORDER BY o.operator_name`, { periodId });

  return { ...period, submissions };
}

export async function createPeriod({ name, periodType = 'MONTHLY', reportMonth, reportQuarter,
  startDate, endDate, deadline, instructions, createdBy }) {
  await ensureTables();
  const ref    = generateRef(periodType);
  const result = await query(`
    INSERT INTO submission_periods
      (period_ref, name, period_type, report_month, report_quarter,
       start_date, end_date, deadline, instructions, created_by)
    VALUES (:ref, :name, :periodType, :reportMonth, :reportQuarter,
            :startDate, :endDate, :deadline, :instructions, :createdBy)`,
    { ref, name, periodType, reportMonth: reportMonth ?? null, reportQuarter: reportQuarter ?? null,
      startDate, endDate, deadline, instructions: instructions ?? null, createdBy: createdBy ?? null });

  return getPeriod(result.insertId);
}

export async function updatePeriodStatus(periodId, { status, userId }) {
  await ensureTables();
  const extra = (status === 'CLOSED')
    ? ', closed_by = :userId, closed_at = NOW()'
    : '';
  await query(`UPDATE submission_periods SET status = :status${extra}, updated_at = NOW()
               WHERE period_id = :periodId`, { status, userId: userId ?? null, periodId });
  return getPeriod(periodId);
}

/* Publish an OPEN period — auto-creates PENDING rows for all active operators */
export async function publishPeriod(periodId, userId) {
  await ensureTables();
  await query(`UPDATE submission_periods SET status = 'OPEN', updated_at = NOW()
               WHERE period_id = :periodId`, { periodId });

  const operators = await query(
    `SELECT operator_id FROM operators WHERE deleted_at IS NULL AND status = 'ACTIVE'`
  );
  for (const op of operators) {
    await query(`INSERT IGNORE INTO operator_submissions (period_id, operator_id)
                 VALUES (:periodId, :operatorId)`,
      { periodId, operatorId: op.operator_id });
  }
  return getPeriod(periodId);
}

/* ── Operator submissions ────────────────────────────────────────────────── */
export async function getMySubmissions(operatorId) {
  await ensureTables();
  return query(`
    SELECT os.*, sp.name AS period_name, sp.period_ref, sp.period_type,
           sp.deadline, sp.status AS period_status, sp.report_month, sp.instructions
      FROM operator_submissions os
      JOIN submission_periods sp ON sp.period_id = os.period_id
     WHERE os.operator_id = :operatorId
       AND sp.status IN ('OPEN','CLOSED')
     ORDER BY sp.deadline DESC`, { operatorId });
}

export async function submitData(periodId, operatorId, { notes, pmFileIds, submittedBy }) {
  await ensureTables();
  await query(`INSERT INTO operator_submissions
                 (period_id, operator_id, status, submitted_at, submitted_by, notes, pm_file_ids)
               VALUES (:periodId, :operatorId, 'SUBMITTED', NOW(), :submittedBy, :notes, :pmFileIds)
               ON DUPLICATE KEY UPDATE
                 status = 'SUBMITTED', submitted_at = NOW(), submitted_by = :submittedBy,
                 notes = :notes, pm_file_ids = :pmFileIds, updated_at = NOW()`,
    { periodId, operatorId, submittedBy: submittedBy ?? null,
      notes: notes ?? null,
      pmFileIds: pmFileIds?.length ? JSON.stringify(pmFileIds) : null });

  const [row] = await query(
    `SELECT os.*, o.operator_name, sp.period_ref, sp.name AS period_name
       FROM operator_submissions os
       JOIN operators o ON o.operator_id = os.operator_id
       JOIN submission_periods sp ON sp.period_id = os.period_id
      WHERE os.period_id = :periodId AND os.operator_id = :operatorId`,
    { periodId, operatorId }
  );
  return row;
}

export async function reviewSubmission(periodId, operatorId, { status, reviewNotes, reviewedBy }) {
  await ensureTables();
  const allowed = ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESUBMIT_REQUIRED'];
  if (!allowed.includes(status))
    throw Object.assign(new Error(`Invalid review status: ${status}`), { status: 400 });

  await query(`UPDATE operator_submissions
               SET status = :status, review_notes = :reviewNotes,
                   reviewed_by = :reviewedBy, reviewed_at = NOW(), updated_at = NOW()
               WHERE period_id = :periodId AND operator_id = :operatorId`,
    { status, reviewNotes: reviewNotes ?? null, reviewedBy: reviewedBy ?? null, periodId, operatorId });

  const [row] = await query(
    `SELECT os.*, o.operator_name FROM operator_submissions os
       JOIN operators o ON o.operator_id = os.operator_id
      WHERE os.period_id = :periodId AND os.operator_id = :operatorId`,
    { periodId, operatorId }
  );
  return row;
}

/* ── Summary stats for dashboard ────────────────────────────────────────── */
export async function submissionSummary() {
  await ensureTables();
  const [openPeriods] = await query(
    `SELECT COUNT(*) AS open_periods FROM submission_periods WHERE status = 'OPEN'`
  );
  const statusCounts = await query(
    `SELECT os.status, COUNT(*) AS count
       FROM operator_submissions os
       JOIN submission_periods sp ON sp.period_id = os.period_id
      WHERE sp.status = 'OPEN'
      GROUP BY os.status`
  );
  return { ...openPeriods, statusCounts };
}
