import { query } from '../../config/db.js';
import * as XLSX from 'xlsx';

// Ensure compliance_notices table exists (create on first use)
async function ensureTable() {
  await query(`CREATE TABLE IF NOT EXISTS compliance_notices (
    notice_id    INT AUTO_INCREMENT PRIMARY KEY,
    operator_id  INT NOT NULL,
    notice_ref   VARCHAR(40) NOT NULL UNIQUE,
    period       VARCHAR(20),
    breaches     JSON,
    issued_by    INT,
    status       ENUM('DRAFT','ISSUED','ACKNOWLEDGED','CLOSED') DEFAULT 'ISSUED',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id)
  ) ENGINE=InnoDB`);
}

function generateRef() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TNIPR-CN-${y}${m}-${rand}`;
}

export async function listNotices(operatorId) {
  await ensureTable();
  const where = operatorId ? 'WHERE n.operator_id = :operatorId' : '';
  return query(`SELECT n.*, o.operator_name FROM compliance_notices n
                JOIN operators o ON o.operator_id = n.operator_id
                ${where} ORDER BY n.created_at DESC`, operatorId ? { operatorId } : {});
}

export async function issueNotice(operatorId, issuedBy, period) {
  await ensureTable();

  // Gather breach data for this operator
  const breaches = await query(`
    SELECT kd.kpi_key, kd.name AS kpi_name, kd.unit, ck.value,
           qt.required_value, qt.comparator,
           CASE
             WHEN qt.comparator='GTE' AND ck.value >= qt.required_value THEN 'PASS'
             WHEN qt.comparator='LTE' AND ck.value <= qt.required_value THEN 'PASS'
             ELSE 'FAIL'
           END AS status
    FROM calculated_kpis ck
    JOIN kpi_definitions kd ON kd.kpi_id = ck.kpi_id
    JOIN qos_thresholds qt ON qt.kpi_id = ck.kpi_id
      AND (qt.operator_id IS NULL OR qt.operator_id = ck.operator_id) AND qt.is_active = 1
    WHERE ck.operator_id = :operatorId
      AND ck.calculated_at = (SELECT MAX(c2.calculated_at) FROM calculated_kpis c2
                               WHERE c2.kpi_id=ck.kpi_id AND c2.operator_id=ck.operator_id)
    HAVING status = 'FAIL'
  `, { operatorId });

  const [op] = await query('SELECT operator_name FROM operators WHERE operator_id = :operatorId', { operatorId });
  const ref = generateRef();
  const per = period || new Date().toISOString().slice(0, 7);

  await query(`INSERT INTO compliance_notices (operator_id, notice_ref, period, breaches, issued_by)
               VALUES (:operatorId, :ref, :per, :breaches, :issuedBy)`,
    { operatorId, ref, per, breaches: JSON.stringify(breaches), issuedBy });

  return { notice_ref: ref, operator_name: op?.operator_name, breaches, period: per };
}

export async function generateNoticeExcel(noticeId) {
  await ensureTable();
  const [notice] = await query(`SELECT n.*, o.operator_name FROM compliance_notices n
    JOIN operators o ON o.operator_id = n.operator_id WHERE n.notice_id = :noticeId`, { noticeId });
  if (!notice) throw new Error('Notice not found');

  const breaches = typeof notice.breaches === 'string' ? JSON.parse(notice.breaches) : notice.breaches || [];
  const wb = XLSX.utils.book_new();

  // Cover sheet
  const cover = XLSX.utils.aoa_to_sheet([
    ['COMPLIANCE NOTICE'],
    [],
    ['Reference:',  notice.notice_ref],
    ['Operator:',   notice.operator_name],
    ['Period:',     notice.period],
    ['Issued:',     new Date(notice.created_at).toLocaleString()],
    ['Status:',     notice.status],
    [],
    ['This notice is issued by the Telecommunications National Intelligence Platform (TNIP-R)'],
    ['pursuant to the national QoS regulatory framework. The operator is required to'],
    ['remediate the listed KPI breaches within 30 days of receipt.'],
  ]);
  XLSX.utils.book_append_sheet(wb, cover, 'Notice');

  // Breach detail sheet
  if (breaches.length) {
    const ws = XLSX.utils.json_to_sheet(breaches.map((b) => ({
      'KPI Key':       b.kpi_key,
      'KPI Name':      b.kpi_name,
      'Unit':          b.unit,
      'Measured Value': b.value,
      'Required':      `${b.comparator} ${b.required_value}`,
      'Status':        'FAIL',
    })));
    XLSX.utils.book_append_sheet(wb, ws, 'KPI Breaches');
  }

  return { buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), ref: notice.notice_ref };
}

export async function updateNoticeStatus(noticeId, status) {
  await ensureTable();
  await query('UPDATE compliance_notices SET status = :status WHERE notice_id = :noticeId', { status, noticeId });
}
