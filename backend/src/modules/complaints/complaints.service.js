import { query } from '../../config/db.js';

export async function listComplaints({ operatorId, status, category, severity, from, to }) {
  return query(
    `SELECT c.*, o.operator_name
       FROM complaints c
       JOIN operators o ON o.operator_id = c.operator_id
      WHERE 1=1
        ${operatorId ? 'AND c.operator_id = :op' : ''}
        ${status     ? 'AND c.status = :status' : ''}
        ${category   ? 'AND c.category = :category' : ''}
        ${severity   ? 'AND c.severity = :severity' : ''}
        ${from       ? 'AND c.reported_at >= :from' : ''}
        ${to         ? 'AND c.reported_at <= :to' : ''}
      ORDER BY FIELD(c.status, 'ESCALATED','OPEN','INVESTIGATING','RESOLVED','CLOSED'),
               c.reported_at DESC
      LIMIT 200`,
    {
      ...(operatorId ? { op: operatorId } : {}),
      ...(status     ? { status } : {}),
      ...(category   ? { category } : {}),
      ...(severity   ? { severity } : {}),
      ...(from       ? { from } : {}),
      ...(to         ? { to } : {}),
    }
  );
}

export async function complaintSummary(operatorId) {
  const byStatus = await query(
    `SELECT status, COUNT(*) AS cnt
       FROM complaints
       ${operatorId ? 'WHERE operator_id = :op' : ''}
      GROUP BY status`,
    operatorId ? { op: operatorId } : {}
  );

  const byCategory = await query(
    `SELECT category, COUNT(*) AS cnt
       FROM complaints
      WHERE status NOT IN ('CLOSED','RESOLVED')
        ${operatorId ? 'AND operator_id = :op' : ''}
      GROUP BY category
      ORDER BY cnt DESC`,
    operatorId ? { op: operatorId } : {}
  );

  const byOperator = await query(
    `SELECT o.operator_name, c.status, COUNT(*) AS cnt
       FROM complaints c
       JOIN operators o ON o.operator_id = c.operator_id
       ${operatorId ? 'WHERE c.operator_id = :op' : ''}
      GROUP BY o.operator_name, c.status
      ORDER BY o.operator_name`,
    operatorId ? { op: operatorId } : {}
  );

  const bySeverity = await query(
    `SELECT severity, COUNT(*) AS cnt
       FROM complaints
      WHERE status NOT IN ('CLOSED','RESOLVED')
        ${operatorId ? 'AND operator_id = :op' : ''}
      GROUP BY severity`,
    operatorId ? { op: operatorId } : {}
  );

  const recent = await query(
    `SELECT c.complaint_id, c.reference_no, c.subject, c.category, c.severity,
            c.status, c.city, c.reported_at, o.operator_name
       FROM complaints c
       JOIN operators o ON o.operator_id = c.operator_id
      WHERE 1=1
        ${operatorId ? 'AND c.operator_id = :op' : ''}
      ORDER BY c.reported_at DESC LIMIT 5`,
    operatorId ? { op: operatorId } : {}
  );

  return { byStatus, byCategory, byOperator, bySeverity, recent };
}

export async function updateComplaint(id, { status, resolution }) {
  const sets = [];
  const params = { id };
  if (status) { sets.push('status = :status'); params.status = status; }
  if (resolution) { sets.push('resolution = :resolution'); params.resolution = resolution; }
  if (status === 'RESOLVED' || status === 'CLOSED') {
    sets.push('resolved_at = NOW()');
  }
  if (!sets.length) return { affected: 0 };
  const result = await query(
    `UPDATE complaints SET ${sets.join(', ')} WHERE complaint_id = :id`,
    params
  );
  return { affected: result.affectedRows ?? 1 };
}
