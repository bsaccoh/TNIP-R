import { query } from '../../config/db.js';

export async function ensureTable() {
  await query(`CREATE TABLE IF NOT EXISTS operator_disputes (
    dispute_id      INT AUTO_INCREMENT PRIMARY KEY,
    dispute_ref     VARCHAR(40)  NOT NULL UNIQUE,
    operator_id     INT          NOT NULL,
    case_id         INT          NULL,       -- enforcement_case (optional)
    compliance_id   INT          NULL,       -- compliance_result (optional)
    title           VARCHAR(255) NOT NULL,
    description     TEXT         NOT NULL,
    evidence        TEXT         NULL,       -- URLs, references, free text
    status          ENUM('OPEN','UNDER_REVIEW','ACCEPTED','REJECTED') DEFAULT 'OPEN',
    submitted_by    INT          NULL,
    reviewed_by     INT          NULL,
    review_notes    TEXT         NULL,
    reviewed_at     DATETIME     NULL,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id)
  ) ENGINE=InnoDB`);
}

function generateRef() {
  const now  = new Date();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DSP-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-${rand}`;
}

/* ── List disputes ──────────────────────────────────────────────────────── */
export async function listDisputes({ operatorId, status, from, to, limit = 50, offset = 0 } = {}) {
  await ensureTable();

  const conds  = [];
  const params = {};

  if (operatorId) { conds.push('d.operator_id = :operatorId'); params.operatorId = operatorId; }
  if (status)     { conds.push('d.status = :status');          params.status     = status;     }
  if (from)       { conds.push('DATE(d.created_at) >= :from'); params.from       = from;       }
  if (to)         { conds.push('DATE(d.created_at) <= :to');   params.to         = to;         }

  const where   = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  params.limit  = Number(limit);
  params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(`SELECT d.dispute_id, d.dispute_ref, d.title, d.status, d.created_at, d.updated_at,
                  o.operator_name, ec.case_ref,
                  us.full_name AS submitted_by_name, ur.full_name AS reviewed_by_name
             FROM operator_disputes d
             JOIN operators o ON o.operator_id = d.operator_id
             LEFT JOIN enforcement_cases ec ON ec.case_id = d.case_id
             LEFT JOIN users us ON us.user_id = d.submitted_by
             LEFT JOIN users ur ON ur.user_id = d.reviewed_by
            ${where}
            ORDER BY d.created_at DESC
            LIMIT :limit OFFSET :offset`, params),
    query(`SELECT COUNT(*) AS total FROM operator_disputes d ${where}`, params),
  ]);

  return { rows, total, limit: params.limit, offset: params.offset };
}

/* ── Get single dispute ─────────────────────────────────────────────────── */
export async function getDispute(disputeId) {
  await ensureTable();
  const [d] = await query(`
    SELECT d.*, o.operator_name, ec.case_ref, ec.title AS case_title,
           us.full_name AS submitted_by_name, ur.full_name AS reviewed_by_name
      FROM operator_disputes d
      JOIN operators o ON o.operator_id = d.operator_id
      LEFT JOIN enforcement_cases ec ON ec.case_id = d.case_id
      LEFT JOIN users us ON us.user_id = d.submitted_by
      LEFT JOIN users ur ON ur.user_id = d.reviewed_by
     WHERE d.dispute_id = :disputeId`, { disputeId });
  return d ?? null;
}

/* ── Create a dispute (operator) ────────────────────────────────────────── */
export async function createDispute({ operatorId, caseId, complianceId, title, description, evidence, submittedBy }) {
  await ensureTable();
  const ref    = generateRef();
  const result = await query(`
    INSERT INTO operator_disputes
      (dispute_ref, operator_id, case_id, compliance_id, title, description, evidence, submitted_by)
    VALUES (:ref, :operatorId, :caseId, :complianceId, :title, :description, :evidence, :submittedBy)`,
    { ref, operatorId, caseId: caseId ?? null, complianceId: complianceId ?? null,
      title, description, evidence: evidence ?? null, submittedBy: submittedBy ?? null });
  return getDispute(result.insertId);
}

/* ── Review a dispute (regulator) ───────────────────────────────────────── */
export async function reviewDispute(disputeId, { status, reviewNotes, reviewedBy }) {
  await ensureTable();
  if (!['UNDER_REVIEW', 'ACCEPTED', 'REJECTED'].includes(status)) {
    throw Object.assign(new Error(`Invalid review status: ${status}`), { status: 400 });
  }
  const fields = ['status = :status', 'updated_at = NOW()'];
  const params = { disputeId, status };

  if (reviewNotes) { fields.push('review_notes = :reviewNotes'); params.reviewNotes = reviewNotes; }
  if (status === 'ACCEPTED' || status === 'REJECTED') {
    fields.push('reviewed_by = :reviewedBy', 'reviewed_at = NOW()');
    params.reviewedBy = reviewedBy ?? null;
  }
  await query(`UPDATE operator_disputes SET ${fields.join(', ')} WHERE dispute_id = :disputeId`, params);
  return getDispute(disputeId);
}

/* ── Summary counts ─────────────────────────────────────────────────────── */
export async function disputeSummary(operatorId) {
  await ensureTable();
  const where  = operatorId ? 'WHERE operator_id = :op' : '';
  const params = operatorId ? { op: operatorId } : {};
  return query(`SELECT status, COUNT(*) AS count FROM operator_disputes ${where} GROUP BY status`, params);
}
