import { query } from '../../config/db.js';

export async function ensureTables() {
  await query(`CREATE TABLE IF NOT EXISTS license_obligations (
    obligation_id   INT AUTO_INCREMENT PRIMARY KEY,
    obligation_ref  VARCHAR(40)  NOT NULL UNIQUE,
    operator_id     INT          NOT NULL,
    license_id      INT          NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT         NULL,
    obligation_type ENUM('COVERAGE','ROLLOUT','SLA','REPORTING','FINANCIAL','OTHER') DEFAULT 'SLA',
    category        VARCHAR(100) NULL,        -- e.g. "2G Coverage", "4G Rollout", "QoS NPS"
    target_value    DECIMAL(15,4) NULL,       -- numeric target (e.g. 85.0 for 85% coverage)
    target_unit     VARCHAR(50)  NULL,        -- "%", "sites", "Mbps", etc.
    current_value   DECIMAL(15,4) NULL,       -- latest measured value
    due_date        DATE         NULL,
    recurrence      ENUM('ONCE','MONTHLY','QUARTERLY','ANNUAL') DEFAULT 'ONCE',
    status          ENUM('PENDING','ON_TRACK','AT_RISK','BREACHED','FULFILLED','WAIVED') DEFAULT 'PENDING',
    breach_severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
    notes           TEXT         NULL,
    evidence_files  JSON         NULL,        -- array of pm_file_id or external doc refs
    fulfilled_at    DATETIME     NULL,
    fulfilled_by    INT          NULL,
    waived_by       INT          NULL,
    waived_at       DATETIME     NULL,
    waiver_reason   TEXT         NULL,
    created_by      INT          NULL,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);

  await query(`CREATE TABLE IF NOT EXISTS obligation_progress (
    progress_id     INT AUTO_INCREMENT PRIMARY KEY,
    obligation_id   INT          NOT NULL,
    measured_value  DECIMAL(15,4) NULL,
    measurement_date DATE         NOT NULL,
    notes           TEXT         NULL,
    recorded_by     INT          NULL,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (obligation_id) REFERENCES license_obligations(obligation_id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);
}

function generateRef() {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `OBL-${y}${m}-${rand}`;
}

/* ── Obligations ─────────────────────────────────────────────────────────── */
export async function listObligations({ operatorId, status, type, dueBefore, dueAfter, limit = 50, offset = 0 } = {}) {
  await ensureTables();
  const conds = []; const params = {};
  if (operatorId) { conds.push('lo.operator_id = :operatorId'); params.operatorId = operatorId; }
  if (status)     { conds.push('lo.status = :status');          params.status = status; }
  if (type)       { conds.push('lo.obligation_type = :type');   params.type = type; }
  if (dueBefore)  { conds.push('lo.due_date <= :dueBefore');    params.dueBefore = dueBefore; }
  if (dueAfter)   { conds.push('lo.due_date >= :dueAfter');     params.dueAfter = dueAfter; }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  params.limit = Number(limit); params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(`
      SELECT lo.*, o.operator_name,
             l.license_number,
             u.full_name AS created_by_name,
             DATEDIFF(lo.due_date, CURDATE()) AS days_until_due
        FROM license_obligations lo
        JOIN operators o ON o.operator_id = lo.operator_id
        LEFT JOIN licenses l ON l.license_id = lo.license_id
        LEFT JOIN users u ON u.user_id = lo.created_by
       ${where}
       ORDER BY
         CASE lo.status WHEN 'BREACHED' THEN 0 WHEN 'AT_RISK' THEN 1 WHEN 'PENDING' THEN 2
                        WHEN 'ON_TRACK' THEN 3 ELSE 4 END,
         lo.due_date ASC
       LIMIT :limit OFFSET :offset`, params),
    query(`SELECT COUNT(*) AS total FROM license_obligations lo ${where}`, params),
  ]);
  return { rows, total, limit: params.limit, offset: params.offset };
}

export async function getObligation(obligationId) {
  await ensureTables();
  const [row] = await query(`
    SELECT lo.*, o.operator_name, l.license_number,
           u.full_name AS created_by_name,
           DATEDIFF(lo.due_date, CURDATE()) AS days_until_due
      FROM license_obligations lo
      JOIN operators o ON o.operator_id = lo.operator_id
      LEFT JOIN licenses l ON l.license_id = lo.license_id
      LEFT JOIN users u ON u.user_id = lo.created_by
     WHERE lo.obligation_id = :obligationId`, { obligationId });
  if (!row) return null;

  const progress = await query(`
    SELECT op.*, u.full_name AS recorded_by_name
      FROM obligation_progress op
      LEFT JOIN users u ON u.user_id = op.recorded_by
     WHERE op.obligation_id = :obligationId
     ORDER BY op.measurement_date DESC
     LIMIT 24`, { obligationId });

  return { ...row, progress };
}

export async function createObligation({
  operatorId, licenseId, title, description, obligationType = 'SLA',
  category, targetValue, targetUnit, dueDate, recurrence = 'ONCE',
  breachSeverity = 'MEDIUM', notes, createdBy
}) {
  await ensureTables();
  const ref = generateRef();
  const result = await query(`
    INSERT INTO license_obligations
      (obligation_ref, operator_id, license_id, title, description, obligation_type,
       category, target_value, target_unit, due_date, recurrence, breach_severity, notes, created_by)
    VALUES
      (:ref, :operatorId, :licenseId, :title, :description, :obligationType,
       :category, :targetValue, :targetUnit, :dueDate, :recurrence, :breachSeverity, :notes, :createdBy)`,
    {
      ref, operatorId, licenseId: licenseId ?? null, title,
      description: description ?? null, obligationType,
      category: category ?? null, targetValue: targetValue ?? null,
      targetUnit: targetUnit ?? null, dueDate: dueDate ?? null,
      recurrence, breachSeverity, notes: notes ?? null, createdBy: createdBy ?? null,
    });
  return getObligation(result.insertId);
}

export async function updateObligation(obligationId, fields) {
  await ensureTables();
  const allowed = ['title','description','obligation_type','category','target_value','target_unit',
                   'due_date','recurrence','breach_severity','notes','license_id'];
  const sets = []; const params = { obligationId };
  for (const [k, v] of Object.entries(fields)) {
    const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowed.includes(col)) { sets.push(`${col} = :${k}`); params[k] = v; }
  }
  if (!sets.length) throw Object.assign(new Error('No valid fields'), { status: 400 });
  await query(`UPDATE license_obligations SET ${sets.join(', ')}, updated_at = NOW()
               WHERE obligation_id = :obligationId`, params);
  return getObligation(obligationId);
}

export async function updateStatus(obligationId, { status, userId, waiverReason, currentValue }) {
  await ensureTables();
  const allowed = ['PENDING','ON_TRACK','AT_RISK','BREACHED','FULFILLED','WAIVED'];
  if (!allowed.includes(status))
    throw Object.assign(new Error(`Invalid status: ${status}`), { status: 400 });

  const extra = {};
  if (status === 'FULFILLED') { extra.fulfilled_at = 'NOW()'; extra.fulfilled_by = userId; }
  if (status === 'WAIVED')    { extra.waived_at = 'NOW()'; extra.waived_by = userId; extra.waiver_reason = waiverReason ?? null; }

  const extraSql = Object.entries(extra)
    .map(([k]) => k.endsWith('_at') ? `${k} = NOW()` : `${k} = :${k}`)
    .join(', ');

  const params = { obligationId, status, userId: userId ?? null, waiverReason: waiverReason ?? null };
  if (currentValue !== undefined) params.currentValue = currentValue;

  await query(`UPDATE license_obligations
               SET status = :status${extraSql ? ', ' + extraSql : ''}
                   ${currentValue !== undefined ? ', current_value = :currentValue' : ''},
                   updated_at = NOW()
               WHERE obligation_id = :obligationId`, params);
  return getObligation(obligationId);
}

export async function recordProgress(obligationId, { measuredValue, measurementDate, notes, recordedBy }) {
  await ensureTables();
  await query(`INSERT INTO obligation_progress (obligation_id, measured_value, measurement_date, notes, recorded_by)
               VALUES (:obligationId, :measuredValue, :measurementDate, :notes, :recordedBy)`,
    { obligationId, measuredValue: measuredValue ?? null,
      measurementDate: measurementDate ?? new Date().toISOString().slice(0, 10),
      notes: notes ?? null, recordedBy: recordedBy ?? null });

  if (measuredValue !== null && measuredValue !== undefined) {
    await query(`UPDATE license_obligations SET current_value = :measuredValue, updated_at = NOW()
                 WHERE obligation_id = :obligationId`, { measuredValue, obligationId });
  }
  return getObligation(obligationId);
}

/* ── Auto-detect breaches and at-risk ───────────────────────────────────── */
export async function autoUpdateStatuses() {
  await ensureTables();
  const today = new Date().toISOString().slice(0, 10);

  /* Breached: due date passed and not yet fulfilled/waived */
  const breached = await query(`
    UPDATE license_obligations
       SET status = 'BREACHED', updated_at = NOW()
     WHERE due_date < :today
       AND status NOT IN ('FULFILLED','WAIVED','BREACHED')`, { today });

  /* At-risk: due within 30 days and still PENDING */
  const atRisk = await query(`
    UPDATE license_obligations
       SET status = 'AT_RISK', updated_at = NOW()
     WHERE due_date BETWEEN :today AND DATE_ADD(:today, INTERVAL 30 DAY)
       AND status = 'PENDING'`, { today });

  return { breached: breached.affectedRows, atRisk: atRisk.affectedRows };
}

/* ── Summary ─────────────────────────────────────────────────────────────── */
export async function obligationSummary(operatorId) {
  await ensureTables();
  const params = {};
  const opWhere = operatorId ? 'WHERE lo.operator_id = :operatorId' : '';
  if (operatorId) params.operatorId = operatorId;

  const [statusCounts, typeCounts, upcoming] = await Promise.all([
    query(`SELECT status, COUNT(*) AS count FROM license_obligations lo ${opWhere} GROUP BY status`, params),
    query(`SELECT obligation_type, COUNT(*) AS count FROM license_obligations lo ${opWhere} GROUP BY obligation_type`, params),
    query(`SELECT lo.*, o.operator_name, DATEDIFF(lo.due_date, CURDATE()) AS days_until_due
             FROM license_obligations lo
             JOIN operators o ON o.operator_id = lo.operator_id
            ${opWhere ? opWhere + ' AND' : 'WHERE'} lo.status IN ('PENDING','ON_TRACK','AT_RISK')
              AND lo.due_date IS NOT NULL
            ORDER BY lo.due_date ASC LIMIT 10`,
      params),
  ]);
  return { statusCounts, typeCounts, upcoming };
}
