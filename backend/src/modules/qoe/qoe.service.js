import { query } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

export async function ensureTables() {
  await query(`CREATE TABLE IF NOT EXISTS consumer_complaints (
    complaint_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
    complaint_ref   VARCHAR(40)   NOT NULL UNIQUE,
    operator_id     INT           NULL,
    issue_type      ENUM(
      'NO_COVERAGE','CALL_DROP','POOR_VOICE_QUALITY','SLOW_DATA',
      'NO_DATA','SMS_FAILURE','BILLING_ISSUE','OTHER'
    ) NOT NULL,
    severity        ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
    district        VARCHAR(100)  NULL,
    area_detail     VARCHAR(200)  NULL,
    latitude        DECIMAL(9,6)  NULL,
    longitude       DECIMAL(9,6)  NULL,
    technology      VARCHAR(20)   NULL,
    description     TEXT          NULL,
    reporter_name   VARCHAR(100)  NULL,
    reporter_phone  VARCHAR(30)   NULL,
    reporter_email  VARCHAR(150)  NULL,
    status          ENUM('NEW','UNDER_REVIEW','ESCALATED','RESOLVED','DISMISSED') DEFAULT 'NEW',
    resolution_note TEXT          NULL,
    assigned_to     INT           NULL,
    reviewed_by     INT           NULL,
    reviewed_at     DATETIME      NULL,
    resolved_at     DATETIME      NULL,
    source          VARCHAR(40)   DEFAULT 'PUBLIC_FORM',
    ip_address      VARCHAR(45)   NULL,
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id) ON DELETE SET NULL,
    INDEX idx_status    (status),
    INDEX idx_operator  (operator_id),
    INDEX idx_district  (district),
    INDEX idx_created   (created_at),
    INDEX idx_location  (latitude, longitude)
  ) ENGINE=InnoDB`);
}

function generateRef() {
  const now = new Date();
  const d   = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const r   = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `QOE-${d}-${r}`;
}

/* ── Public submission ───────────────────────────────────────────────────── */
export async function submitComplaint({
  operatorId, issueType, severity = 'MEDIUM', district, areaDetail,
  latitude, longitude, technology, description,
  reporterName, reporterPhone, reporterEmail, ipAddress,
}) {
  await ensureTables();
  if (!issueType) throw ApiError.badRequest('issueType is required');

  const ref = generateRef();
  const result = await query(`
    INSERT INTO consumer_complaints
      (complaint_ref, operator_id, issue_type, severity, district, area_detail,
       latitude, longitude, technology, description,
       reporter_name, reporter_phone, reporter_email, ip_address)
    VALUES
      (:ref, :operatorId, :issueType, :severity, :district, :areaDetail,
       :latitude, :longitude, :technology, :description,
       :reporterName, :reporterPhone, :reporterEmail, :ipAddress)`,
    {
      ref,
      operatorId:    operatorId   ?? null,
      issueType,
      severity,
      district:      district     ?? null,
      areaDetail:    areaDetail   ?? null,
      latitude:      latitude     ?? null,
      longitude:     longitude    ?? null,
      technology:    technology   ?? null,
      description:   description  ?? null,
      reporterName:  reporterName ?? null,
      reporterPhone: reporterPhone ?? null,
      reporterEmail: reporterEmail ?? null,
      ipAddress:     ipAddress    ?? null,
    });

  return { complaint_ref: ref, complaint_id: result.insertId };
}

/* ── Public tracking by ref ──────────────────────────────────────────────── */
export async function trackComplaint(ref) {
  await ensureTables();
  const [row] = await query(`
    SELECT c.complaint_ref, c.issue_type, c.severity, c.status,
           c.district, c.area_detail, c.description,
           c.resolution_note, c.created_at, c.updated_at, c.resolved_at,
           o.operator_name
      FROM consumer_complaints c
      LEFT JOIN operators o ON o.operator_id = c.operator_id
     WHERE c.complaint_ref = :ref`, { ref });
  return row || null;
}

/* ── List / filter ───────────────────────────────────────────────────────── */
export async function listComplaints({
  operatorId, status, issueType, district, severity,
  dateFrom, dateTo, limit = 100, offset = 0,
} = {}) {
  await ensureTables();
  const conds = []; const params = {};
  if (operatorId) { conds.push('c.operator_id = :operatorId'); params.operatorId = operatorId; }
  if (status)     { conds.push('c.status = :status');          params.status = status; }
  if (issueType)  { conds.push('c.issue_type = :issueType');   params.issueType = issueType; }
  if (district)   { conds.push('c.district = :district');      params.district = district; }
  if (severity)   { conds.push('c.severity = :severity');      params.severity = severity; }
  if (dateFrom)   { conds.push('c.created_at >= :dateFrom');   params.dateFrom = dateFrom; }
  if (dateTo)     { conds.push('c.created_at <= :dateTo');     params.dateTo = dateTo; }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  params.limit = Number(limit); params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(`
      SELECT c.*, o.operator_name
        FROM consumer_complaints c
        LEFT JOIN operators o ON o.operator_id = c.operator_id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT :limit OFFSET :offset`, params),
    query(`SELECT COUNT(*) AS total FROM consumer_complaints c ${where}`, params),
  ]);
  return { rows, total };
}

export async function getComplaint(complaintId) {
  await ensureTables();
  const [row] = await query(`
    SELECT c.*, o.operator_name, u.full_name AS reviewed_by_name
      FROM consumer_complaints c
      LEFT JOIN operators o ON o.operator_id = c.operator_id
      LEFT JOIN users u ON u.user_id = c.reviewed_by
     WHERE c.complaint_id = :complaintId`, { complaintId });
  return row || null;
}

/* ── Status update ───────────────────────────────────────────────────────── */
export async function updateComplaint(complaintId, { status, resolutionNote, reviewedBy }) {
  await ensureTables();
  const allowed = ['NEW','UNDER_REVIEW','ESCALATED','RESOLVED','DISMISSED'];
  if (status && !allowed.includes(status)) throw ApiError.badRequest('Invalid status');

  const extras = [];
  if (status === 'RESOLVED')  extras.push('resolved_at = NOW()');
  if (status && status !== 'NEW') extras.push(`reviewed_by = ${parseInt(reviewedBy, 10)}`);

  const sets = ['updated_at = NOW()'];
  const params = { complaintId };
  if (status)         { sets.push('status = :status');               params.status = status; }
  if (resolutionNote) { sets.push('resolution_note = :resolutionNote'); params.resolutionNote = resolutionNote; }
  sets.push(...extras);

  await query(`UPDATE consumer_complaints SET ${sets.join(', ')}
               WHERE complaint_id = :complaintId`, params);
  return getComplaint(complaintId);
}

/* ── Analytics ───────────────────────────────────────────────────────────── */
export async function qoeSummary({ days = 30 } = {}) {
  await ensureTables();
  const params = { days };

  const [counts] = await query(`
    SELECT COUNT(*) AS total,
           SUM(status='NEW')          AS new_complaints,
           SUM(status='UNDER_REVIEW') AS under_review,
           SUM(status='ESCALATED')    AS escalated,
           SUM(status='RESOLVED')     AS resolved,
           SUM(severity='CRITICAL')   AS critical,
           SUM(severity='HIGH')       AS high
      FROM consumer_complaints
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)`, params);

  const byOperator = await query(`
    SELECT COALESCE(o.operator_name,'Unknown') AS operator_name,
           c.operator_id,
           COUNT(*) AS total,
           SUM(c.status='NEW') AS new_count,
           SUM(c.severity IN ('HIGH','CRITICAL')) AS high_severity
      FROM consumer_complaints c
      LEFT JOIN operators o ON o.operator_id = c.operator_id
     WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
     GROUP BY c.operator_id
     ORDER BY total DESC`, params);

  const byIssueType = await query(`
    SELECT issue_type, COUNT(*) AS total,
           SUM(severity IN ('HIGH','CRITICAL')) AS high_sev
      FROM consumer_complaints
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
     GROUP BY issue_type ORDER BY total DESC`, params);

  const byDistrict = await query(`
    SELECT COALESCE(district,'Unknown') AS district,
           COUNT(*) AS total,
           SUM(severity IN ('HIGH','CRITICAL')) AS high_sev,
           SUM(status='NEW') AS unresolved
      FROM consumer_complaints
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
     GROUP BY district ORDER BY total DESC`, params);

  const trend = await query(`
    SELECT DATE(created_at) AS day, COUNT(*) AS complaints
      FROM consumer_complaints
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY day ORDER BY day`, {});

  const hotspots = await query(`
    SELECT ANY_VALUE(latitude) AS latitude, ANY_VALUE(longitude) AS longitude,
           district, COUNT(*) AS count,
           GROUP_CONCAT(DISTINCT issue_type ORDER BY issue_type SEPARATOR ', ') AS issues
      FROM consumer_complaints
     WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       AND created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
     GROUP BY ROUND(latitude,3), ROUND(longitude,3), district
     ORDER BY count DESC LIMIT 50`, params);

  return { counts, byOperator, byIssueType, byDistrict, trend, hotspots };
}

export async function askChatbot(question) {
  const q = String(question || '').toLowerCase().trim();
  if (!q) return { answer: 'How can I help you today?' };

  // Rule-based responses for common consumer questions
  if (q.includes('slow') || q.includes('internet') || q.includes('data') || q.includes('speed')) {
    return {
      answer: "If your internet is too slow or dropping, you have the right to complain! NatCA regulations state that operators must maintain a minimum speed. You can run a Speed Test from the home page and submit a complaint directly to us if it fails."
    };
  }
  if (q.includes('tariff') || q.includes('cost') || q.includes('price') || q.includes('expensive')) {
    return {
      answer: "Tariffs are regulated by NatCA. The standard voice rate is 1.86 LE per minute across all networks. If you believe you are being overcharged, please check the 'Tariffs' page or submit a Billing Dispute complaint."
    };
  }
  if (q.includes('sim') || q.includes('nin') || q.includes('register')) {
    return {
      answer: "All SIM cards must be linked to your National Identification Number (NIN). You can verify your status using the 'SIM Check' tool on the dashboard. If unlinked, visit your operator's office with your ID."
    };
  }
  if (q.includes('ussd') || q.includes('code') || q.includes('balance')) {
    return {
      answer: "You can easily access USSD codes for all operators by tapping 'USSD Codes' on the dashboard. For example, Orange balance is *111# and Africell is *123#."
    };
  }

  // LLM option if enabled
  try {
    const { llmEnabled, llmComplete } = await import('../ai/ai.provider.js');
    if (llmEnabled()) {
      const answer = await llmComplete({
        system: "You are the NatCA AI Assistant. Help the consumer with their telecom issue. Keep the answer concise (2-3 sentences max) and friendly.",
        user: question
      });
      return { answer };
    }
  } catch (err) {
    // fallback
  }

  return {
    answer: "I can help you with internet speeds, billing issues, SIM registration, and consumer rights. What would you like to know?"
  };
}

