import { query } from '../../config/db.js';

async function ensureTables() {
  await query(`CREATE TABLE IF NOT EXISTS enforcement_cases (
    case_id        INT AUTO_INCREMENT PRIMARY KEY,
    case_ref       VARCHAR(40)  NOT NULL UNIQUE,
    operator_id    INT          NOT NULL,
    compliance_id  INT          NULL,
    kpi_id         INT          NULL,
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    severity       ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
    status         ENUM('OPEN','NOTIFIED','RESPONDED','ESCALATED','RESOLVED','CLOSED') DEFAULT 'OPEN',
    deadline       DATE         NULL,
    operator_response TEXT      NULL,
    resolved_notes TEXT         NULL,
    created_by     INT          NULL,
    resolved_by    INT          NULL,
    resolved_at    DATETIME     NULL,
    created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id)
  ) ENGINE=InnoDB`);

  await query(`CREATE TABLE IF NOT EXISTS enforcement_actions (
    action_id   INT AUTO_INCREMENT PRIMARY KEY,
    case_id     INT         NOT NULL,
    action_type ENUM('CASE_OPENED','NOTIFICATION_SENT','RESPONSE_RECEIVED',
                     'ESCALATED','RESOLVED','CLOSED','NOTE_ADDED','STATUS_CHANGED') NOT NULL,
    performed_by INT        NULL,
    notes       TEXT,
    created_at  DATETIME    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES enforcement_cases(case_id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);
}

function generateRef() {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ENF-${y}${m}-${rand}`;
}

/* ── List cases with optional filters ───────────────────────────────────── */
export async function listCases({ operatorId, status, severity, from, to, limit = 50, offset = 0 } = {}) {
  await ensureTables();

  const conds  = [];
  const params = {};

  if (operatorId) { conds.push('ec.operator_id = :operatorId'); params.operatorId = operatorId; }
  if (status)     { conds.push('ec.status = :status');          params.status     = status;     }
  if (severity)   { conds.push('ec.severity = :severity');      params.severity   = severity;   }
  if (from)       { conds.push('DATE(ec.created_at) >= :from'); params.from       = from;       }
  if (to)         { conds.push('DATE(ec.created_at) <= :to');   params.to         = to;         }

  const where  = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  params.limit  = Number(limit);
  params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(`
      SELECT ec.case_id, ec.case_ref, ec.title, ec.severity, ec.status,
             ec.deadline, ec.created_at, ec.updated_at,
             o.operator_name, o.operator_id,
             k.kpi_key, k.name AS kpi_name,
             u.full_name AS created_by_name
        FROM enforcement_cases ec
        JOIN operators o ON o.operator_id = ec.operator_id
        LEFT JOIN kpi_definitions k ON k.kpi_id = ec.kpi_id
        LEFT JOIN users u ON u.user_id = ec.created_by
       ${where}
       ORDER BY
         FIELD(ec.severity,'CRITICAL','HIGH','MEDIUM','LOW'),
         ec.created_at DESC
       LIMIT :limit OFFSET :offset`, params),
    query(`SELECT COUNT(*) AS total FROM enforcement_cases ec ${where}`, params),
  ]);

  return { rows, total, limit: params.limit, offset: params.offset };
}

/* ── Case stats summary ─────────────────────────────────────────────────── */
export async function caseSummary(operatorId) {
  await ensureTables();
  const where  = operatorId ? 'WHERE operator_id = :op' : '';
  const params = operatorId ? { op: operatorId } : {};
  const rows = await query(
    `SELECT status, severity, COUNT(*) AS count
       FROM enforcement_cases ${where}
      GROUP BY status, severity`, params
  );
  return rows;
}

/* ── Single case with full timeline ────────────────────────────────────── */
export async function getCase(caseId) {
  await ensureTables();
  const [ec] = await query(`
    SELECT ec.*, o.operator_name, k.kpi_key, k.name AS kpi_name,
           ub.full_name AS created_by_name, ur.full_name AS resolved_by_name
      FROM enforcement_cases ec
      JOIN operators o ON o.operator_id = ec.operator_id
      LEFT JOIN kpi_definitions k ON k.kpi_id = ec.kpi_id
      LEFT JOIN users ub ON ub.user_id = ec.created_by
      LEFT JOIN users ur ON ur.user_id = ec.resolved_by
     WHERE ec.case_id = :caseId`, { caseId });

  if (!ec) return null;

  const timeline = await query(`
    SELECT ea.action_id, ea.action_type, ea.notes, ea.created_at,
           u.full_name AS performed_by_name
      FROM enforcement_actions ea
      LEFT JOIN users u ON u.user_id = ea.performed_by
     WHERE ea.case_id = :caseId
     ORDER BY ea.created_at ASC`, { caseId });

  return { ...ec, timeline };
}

/* ── Create a case manually ─────────────────────────────────────────────── */
export async function createCase({ operatorId, title, description, severity = 'MEDIUM',
  kpiId, complianceId, deadline, createdBy }) {
  await ensureTables();

  const ref = generateRef();
  const result = await query(`
    INSERT INTO enforcement_cases
      (case_ref, operator_id, compliance_id, kpi_id, title, description, severity, deadline, created_by)
    VALUES (:ref, :operatorId, :complianceId, :kpiId, :title, :description, :severity, :deadline, :createdBy)`,
    { ref, operatorId, complianceId: complianceId ?? null, kpiId: kpiId ?? null,
      title, description: description ?? null, severity, deadline: deadline ?? null, createdBy: createdBy ?? null });

  const caseId = result.insertId;
  await logAction(caseId, 'CASE_OPENED', createdBy, `Case ${ref} opened.`);
  return getCase(caseId);
}

/* ── Auto-generate cases from unresolved VIOLATION compliance alerts ─────── */
export async function autoGenerateFromViolations(createdBy) {
  await ensureTables();

  // Find VIOLATION alerts that don't already have an open enforcement case
  const violations = await query(`
    SELECT ca.alert_id, ca.compliance_id, ca.operator_id, ca.message,
           cr.kpi_id, cr.period, o.operator_name, k.kpi_key
      FROM compliance_alerts ca
      JOIN operators o ON o.operator_id = ca.operator_id
      LEFT JOIN compliance_results cr ON cr.compliance_id = ca.compliance_id
      LEFT JOIN kpi_definitions k ON k.kpi_id = cr.kpi_id
     WHERE ca.severity = 'VIOLATION'
       AND NOT EXISTS (
         SELECT 1 FROM enforcement_cases ec
          WHERE ec.compliance_id = ca.compliance_id
            AND ec.status NOT IN ('RESOLVED','CLOSED')
       )
     ORDER BY ca.created_at DESC
     LIMIT 100`);

  const created = [];
  for (const v of violations) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    const c = await createCase({
      operatorId:   v.operator_id,
      complianceId: v.compliance_id,
      kpiId:        v.kpi_id,
      title:        `${v.kpi_key ?? 'KPI'} Violation — ${v.operator_name} (${v.period ?? 'latest'})`,
      description:  v.message,
      severity:     'HIGH',
      deadline:     deadline.toISOString().slice(0, 10),
      createdBy,
    });
    created.push(c);
  }
  return { generated: created.length, cases: created };
}

/* ── Status transition ──────────────────────────────────────────────────── */
const VALID_TRANSITIONS = {
  OPEN:      ['NOTIFIED', 'CLOSED'],
  NOTIFIED:  ['RESPONDED', 'ESCALATED', 'CLOSED'],
  RESPONDED: ['RESOLVED', 'ESCALATED', 'CLOSED'],
  ESCALATED: ['RESOLVED', 'CLOSED'],
  RESOLVED:  ['CLOSED'],
  CLOSED:    [],
};

const ACTION_MAP = {
  NOTIFIED:  'NOTIFICATION_SENT',
  RESPONDED: 'RESPONSE_RECEIVED',
  ESCALATED: 'ESCALATED',
  RESOLVED:  'RESOLVED',
  CLOSED:    'CLOSED',
};

export async function transitionCase(caseId, { toStatus, notes, userId, operatorResponse, resolvedNotes }) {
  await ensureTables();
  const [existing] = await query('SELECT status FROM enforcement_cases WHERE case_id = :caseId', { caseId });
  if (!existing) throw Object.assign(new Error('Case not found'), { status: 404 });

  const allowed = VALID_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(toStatus)) {
    throw Object.assign(
      new Error(`Cannot transition from ${existing.status} to ${toStatus}`),
      { status: 400 }
    );
  }

  const fields   = ['status = :toStatus', 'updated_at = NOW()'];
  const params   = { caseId, toStatus };

  if (operatorResponse) { fields.push('operator_response = :operatorResponse'); params.operatorResponse = operatorResponse; }
  if (resolvedNotes)    { fields.push('resolved_notes = :resolvedNotes');       params.resolvedNotes    = resolvedNotes;    }
  if (toStatus === 'RESOLVED' || toStatus === 'CLOSED') {
    fields.push('resolved_by = :userId', 'resolved_at = NOW()');
    params.userId = userId ?? null;
  }

  await query(`UPDATE enforcement_cases SET ${fields.join(', ')} WHERE case_id = :caseId`, params);
  await logAction(caseId, ACTION_MAP[toStatus] ?? 'STATUS_CHANGED', userId, notes);

  return getCase(caseId);
}

/* ── Add a note without status change ──────────────────────────────────── */
export async function addNote(caseId, { notes, userId }) {
  await ensureTables();
  await logAction(caseId, 'NOTE_ADDED', userId, notes);
  return getCase(caseId);
}

/* ── Internal: log a timeline action ───────────────────────────────────── */
async function logAction(caseId, actionType, userId, notes) {
  await query(`
    INSERT INTO enforcement_actions (case_id, action_type, performed_by, notes)
    VALUES (:caseId, :actionType, :userId, :notes)`,
    { caseId, actionType, userId: userId ?? null, notes: notes ?? null });
}
