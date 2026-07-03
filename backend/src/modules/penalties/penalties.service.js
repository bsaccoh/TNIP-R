import { query } from '../../config/db.js';

async function ensureTables() {
  await query(`CREATE TABLE IF NOT EXISTS penalty_rules (
    rule_id         INT AUTO_INCREMENT PRIMARY KEY,
    rule_ref        VARCHAR(40)  NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT         NULL,
    violation_type  ENUM('COVERAGE','ROLLOUT','SLA','REPORTING','FINANCIAL','OTHER','ANY') DEFAULT 'ANY',
    severity        ENUM('LOW','MEDIUM','HIGH','CRITICAL','ANY') DEFAULT 'ANY',
    base_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency        VARCHAR(10)  DEFAULT 'SLL',
    per_day_amount  DECIMAL(15,2) DEFAULT 0,   -- additional fine per day of non-compliance
    max_amount      DECIMAL(15,2) NULL,          -- cap on total fine
    is_active       TINYINT(1)   DEFAULT 1,
    created_by      INT          NULL,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);

  await query(`CREATE TABLE IF NOT EXISTS penalty_assessments (
    assessment_id   INT AUTO_INCREMENT PRIMARY KEY,
    assessment_ref  VARCHAR(40)  NOT NULL UNIQUE,
    operator_id     INT          NOT NULL,
    rule_id         INT          NULL,
    enforcement_id  INT          NULL,          -- link to enforcement_cases
    obligation_id   INT          NULL,          -- link to license_obligations
    title           VARCHAR(255) NOT NULL,
    violation_type  ENUM('COVERAGE','ROLLOUT','SLA','REPORTING','FINANCIAL','OTHER') DEFAULT 'OTHER',
    severity        ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
    violation_start DATE         NULL,
    violation_end   DATE         NULL,
    days_in_breach  INT GENERATED ALWAYS AS (
                      CASE WHEN violation_start IS NOT NULL AND violation_end IS NOT NULL
                           THEN DATEDIFF(violation_end, violation_start) + 1
                           ELSE NULL END
                    ) STORED,
    base_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
    per_day_amount  DECIMAL(15,2) DEFAULT 0,
    calculated_fine DECIMAL(15,2) NOT NULL DEFAULT 0,
    adjustments     DECIMAL(15,2) DEFAULT 0,   -- positive = surcharge, negative = discount
    adjustment_reason TEXT        NULL,
    final_fine      DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency        VARCHAR(10)  DEFAULT 'SLL',
    status          ENUM('DRAFT','ISSUED','ACKNOWLEDGED','PAID','DISPUTED','WAIVED','CANCELLED') DEFAULT 'DRAFT',
    issued_at       DATETIME     NULL,
    due_date        DATE         NULL,
    paid_at         DATETIME     NULL,
    paid_amount     DECIMAL(15,2) NULL,
    notes           TEXT         NULL,
    created_by      INT          NULL,
    reviewed_by     INT          NULL,
    reviewed_at     DATETIME     NULL,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);
}

function generateRuleRef() {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PRU-${rand}`;
}

function generateAssessRef() {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `PEN-${y}${m}-${rand}`;
}

function calcFine({ baseAmount, perDayAmount, days, maxAmount }) {
  const daily    = (perDayAmount ?? 0) * (days ?? 0);
  const raw      = Number(baseAmount ?? 0) + daily;
  return maxAmount ? Math.min(raw, Number(maxAmount)) : raw;
}

/* ── Penalty Rules ───────────────────────────────────────────────────────── */
export async function listRules({ active } = {}) {
  await ensureTables();
  const where = active !== undefined ? `WHERE is_active = ${active ? 1 : 0}` : '';
  return query(`SELECT pr.*, u.full_name AS created_by_name
                  FROM penalty_rules pr
                  LEFT JOIN users u ON u.user_id = pr.created_by
                ${where}
                ORDER BY pr.violation_type, pr.severity`, {});
}

export async function createRule({ name, description, violationType = 'ANY', severity = 'ANY',
  baseAmount, perDayAmount = 0, maxAmount, currency = 'SLL', createdBy }) {
  await ensureTables();
  const ref = generateRuleRef();
  const result = await query(`
    INSERT INTO penalty_rules
      (rule_ref, name, description, violation_type, severity, base_amount, per_day_amount, max_amount, currency, created_by)
    VALUES
      (:ref, :name, :description, :violationType, :severity, :baseAmount, :perDayAmount, :maxAmount, :currency, :createdBy)`,
    { ref, name, description: description ?? null, violationType, severity,
      baseAmount: Number(baseAmount ?? 0), perDayAmount: Number(perDayAmount ?? 0),
      maxAmount: maxAmount ? Number(maxAmount) : null, currency, createdBy: createdBy ?? null });
  const [row] = await query('SELECT * FROM penalty_rules WHERE rule_id = :id', { id: result.insertId });
  return row;
}

export async function updateRule(ruleId, fields) {
  await ensureTables();
  const allowed = ['name','description','violation_type','severity','base_amount',
                   'per_day_amount','max_amount','currency','is_active'];
  const sets = []; const params = { ruleId };
  for (const [k, v] of Object.entries(fields)) {
    const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowed.includes(col)) { sets.push(`${col} = :${k}`); params[k] = v; }
  }
  if (!sets.length) return;
  await query(`UPDATE penalty_rules SET ${sets.join(', ')}, updated_at = NOW() WHERE rule_id = :ruleId`, params);
  const [row] = await query('SELECT * FROM penalty_rules WHERE rule_id = :ruleId', { ruleId });
  return row;
}

/* ── Assessments ─────────────────────────────────────────────────────────── */
export async function listAssessments({ operatorId, status, limit = 50, offset = 0 } = {}) {
  await ensureTables();
  const conds = []; const params = {};
  if (operatorId) { conds.push('pa.operator_id = :operatorId'); params.operatorId = operatorId; }
  if (status)     { conds.push('pa.status = :status');          params.status = status; }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  params.limit = Number(limit); params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(`
      SELECT pa.*, o.operator_name, u.full_name AS created_by_name
        FROM penalty_assessments pa
        JOIN operators o ON o.operator_id = pa.operator_id
        LEFT JOIN users u ON u.user_id = pa.created_by
       ${where}
       ORDER BY pa.created_at DESC
       LIMIT :limit OFFSET :offset`, params),
    query(`SELECT COUNT(*) AS total FROM penalty_assessments pa ${where}`, params),
  ]);
  return { rows, total, limit: params.limit, offset: params.offset };
}

export async function getAssessment(assessmentId) {
  await ensureTables();
  const [row] = await query(`
    SELECT pa.*, o.operator_name, pr.name AS rule_name,
           uc.full_name AS created_by_name, ur.full_name AS reviewed_by_name
      FROM penalty_assessments pa
      JOIN operators o ON o.operator_id = pa.operator_id
      LEFT JOIN penalty_rules pr ON pr.rule_id = pa.rule_id
      LEFT JOIN users uc ON uc.user_id = pa.created_by
      LEFT JOIN users ur ON ur.user_id = pa.reviewed_by
     WHERE pa.assessment_id = :assessmentId`, { assessmentId });
  return row ?? null;
}

export async function createAssessment({
  operatorId, ruleId, enforcementId, obligationId,
  title, violationType = 'OTHER', severity = 'MEDIUM',
  violationStart, violationEnd, baseAmount, perDayAmount = 0,
  adjustments = 0, adjustmentReason, currency = 'SLL',
  dueDate, notes, createdBy,
}) {
  await ensureTables();

  let finalBase = Number(baseAmount ?? 0);
  let finalPerDay = Number(perDayAmount ?? 0);
  let maxAmount = null;

  if (ruleId) {
    const [rule] = await query('SELECT * FROM penalty_rules WHERE rule_id = :ruleId', { ruleId });
    if (rule) {
      finalBase   = Number(rule.base_amount);
      finalPerDay = Number(rule.per_day_amount);
      maxAmount   = rule.max_amount ? Number(rule.max_amount) : null;
      currency    = rule.currency;
    }
  }

  const days = (violationStart && violationEnd)
    ? Math.max(0, Math.ceil((new Date(violationEnd) - new Date(violationStart)) / 86400000) + 1)
    : 0;

  const calculated = calcFine({ baseAmount: finalBase, perDayAmount: finalPerDay, days, maxAmount });
  const final      = Math.max(0, calculated + Number(adjustments ?? 0));

  const ref = generateAssessRef();
  const result = await query(`
    INSERT INTO penalty_assessments
      (assessment_ref, operator_id, rule_id, enforcement_id, obligation_id,
       title, violation_type, severity,
       violation_start, violation_end,
       base_amount, per_day_amount, calculated_fine, adjustments, adjustment_reason,
       final_fine, currency, due_date, notes, created_by)
    VALUES
      (:ref, :operatorId, :ruleId, :enforcementId, :obligationId,
       :title, :violationType, :severity,
       :violationStart, :violationEnd,
       :finalBase, :finalPerDay, :calculated, :adjustments, :adjustmentReason,
       :final, :currency, :dueDate, :notes, :createdBy)`,
    {
      ref, operatorId, ruleId: ruleId ?? null, enforcementId: enforcementId ?? null,
      obligationId: obligationId ?? null, title, violationType, severity,
      violationStart: violationStart ?? null, violationEnd: violationEnd ?? null,
      finalBase, finalPerDay, calculated, adjustments: Number(adjustments ?? 0),
      adjustmentReason: adjustmentReason ?? null, final, currency,
      dueDate: dueDate ?? null, notes: notes ?? null, createdBy: createdBy ?? null,
    });
  return getAssessment(result.insertId);
}

export async function issueAssessment(assessmentId, { userId, dueDate }) {
  await ensureTables();
  await query(`UPDATE penalty_assessments
               SET status = 'ISSUED', issued_at = NOW(), reviewed_by = :userId,
                   reviewed_at = NOW(), due_date = COALESCE(:dueDate, due_date), updated_at = NOW()
               WHERE assessment_id = :assessmentId AND status = 'DRAFT'`,
    { assessmentId, userId: userId ?? null, dueDate: dueDate ?? null });
  return getAssessment(assessmentId);
}

export async function updateAssessmentStatus(assessmentId, { status, paidAmount, notes, userId }) {
  await ensureTables();
  const allowed = ['ACKNOWLEDGED','PAID','DISPUTED','WAIVED','CANCELLED'];
  if (!allowed.includes(status))
    throw Object.assign(new Error(`Invalid status: ${status}`), { status: 400 });

  const extra = status === 'PAID' ? ', paid_at = NOW(), paid_amount = :paidAmount' : '';
  await query(`UPDATE penalty_assessments
               SET status = :status${extra}
                   ${notes ? ', notes = :notes' : ''},
                   reviewed_by = :userId, reviewed_at = NOW(), updated_at = NOW()
               WHERE assessment_id = :assessmentId`,
    { assessmentId, status, paidAmount: paidAmount ?? null, notes: notes ?? null, userId: userId ?? null });
  return getAssessment(assessmentId);
}

/* ── Auto-generate from breached obligations ─────────────────────────────── */
export async function autoGenerateFromObligations(createdBy) {
  await ensureTables();

  const breached = await query(`
    SELECT lo.*, o.operator_id
      FROM license_obligations lo
      JOIN operators o ON o.operator_id = lo.operator_id
     WHERE lo.status = 'BREACHED'
       AND NOT EXISTS (
         SELECT 1 FROM penalty_assessments pa
          WHERE pa.obligation_id = lo.obligation_id
            AND pa.status NOT IN ('CANCELLED','WAIVED')
       )`);

  const created = [];
  for (const obl of breached) {
    const matchRule = await query(`
      SELECT * FROM penalty_rules
       WHERE is_active = 1
         AND (violation_type = :type OR violation_type = 'ANY')
         AND (severity = :severity OR severity = 'ANY')
       ORDER BY CASE violation_type WHEN :type THEN 0 ELSE 1 END,
                CASE severity WHEN :severity THEN 0 ELSE 1 END
       LIMIT 1`,
      { type: obl.obligation_type, severity: obl.breach_severity });

    const rule = matchRule[0] ?? null;
    const violationStart = obl.due_date;
    const violationEnd   = new Date().toISOString().slice(0, 10);

    const assessment = await createAssessment({
      operatorId:   obl.operator_id,
      ruleId:       rule?.rule_id ?? null,
      obligationId: obl.obligation_id,
      title:        `Auto: ${obl.title}`,
      violationType: obl.obligation_type === 'OTHER' ? 'OTHER' : obl.obligation_type,
      severity:     obl.breach_severity,
      violationStart, violationEnd,
      baseAmount:   rule?.base_amount ?? 0,
      perDayAmount: rule?.per_day_amount ?? 0,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      notes: `Auto-generated from breached obligation ${obl.obligation_ref}`,
      createdBy,
    });
    created.push(assessment);
  }
  return { created: created.length, assessments: created };
}

/* ── Summary ─────────────────────────────────────────────────────────────── */
export async function penaltySummary(operatorId) {
  await ensureTables();
  const cond = operatorId ? 'WHERE pa.operator_id = :operatorId' : '';
  const params = operatorId ? { operatorId } : {};

  const [statusCounts, totals, recentIssued] = await Promise.all([
    query(`SELECT status, COUNT(*) AS count FROM penalty_assessments pa ${cond} GROUP BY status`, params),
    query(`SELECT
             SUM(final_fine) AS total_fines,
             SUM(CASE WHEN status = 'PAID' THEN paid_amount ELSE 0 END) AS total_collected,
             SUM(CASE WHEN status IN ('ISSUED','ACKNOWLEDGED') THEN final_fine ELSE 0 END) AS total_outstanding
           FROM penalty_assessments pa ${cond}`, params),
    query(`SELECT pa.assessment_ref, pa.title, pa.final_fine, pa.currency, pa.due_date,
                  pa.status, o.operator_name
             FROM penalty_assessments pa
             JOIN operators o ON o.operator_id = pa.operator_id
            ${cond ? cond + ' AND' : 'WHERE'} pa.status = 'ISSUED'
            ORDER BY pa.due_date ASC LIMIT 5`, params),
  ]);
  return { statusCounts, ...totals[0], recentIssued };
}
