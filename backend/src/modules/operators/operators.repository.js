import { query } from '../../config/db.js';

export async function listOperators({ status, scopeOperatorId, limit, offset }) {
  const where = ['deleted_at IS NULL'];
  const params = { limit, offset };
  if (status) { where.push('status = :status'); params.status = status; }
  if (scopeOperatorId != null) { where.push('operator_id = :scopeId'); params.scopeId = scopeOperatorId; }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const rows = await query(
    `SELECT operator_id, operator_name, license_number, license_type, status,
            country, contact_email, logo_url, created_at
       FROM operators ${whereSql}
      ORDER BY operator_name LIMIT :limit OFFSET :offset`,
    params
  );
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM operators ${whereSql}`, params);
  return { rows, total };
}

export async function getOperator(id) {
  const rows = await query(
    `SELECT * FROM operators WHERE operator_id = :id AND deleted_at IS NULL`,
    { id }
  );
  return rows[0] || null;
}

export async function createOperator(data) {
  const result = await query(
    `INSERT INTO operators (operator_name, license_number, license_type, status, country, contact_email, logo_url)
     VALUES (:operator_name, :license_number, :license_type, :status, :country, :contact_email, :logo_url)`,
    data
  );
  return getOperator(result.insertId);
}

export async function updateOperator(id, data) {
  await query(
    `UPDATE operators SET operator_name=:operator_name, license_number=:license_number,
       license_type=:license_type, status=:status, country=:country,
       contact_email=:contact_email, logo_url=:logo_url
     WHERE operator_id=:id AND deleted_at IS NULL`,
    { ...data, id }
  );
  return getOperator(id);
}

export async function softDeleteOperator(id) {
  await query('UPDATE operators SET deleted_at = NOW() WHERE operator_id = :id', { id });
}

/** Summary KPIs + compliance counts for an operator profile page. */
export async function operatorSummary(id) {
  const [sites] = await query('SELECT COUNT(*) AS c FROM sites WHERE operator_id=:id AND deleted_at IS NULL', { id });
  const [cells] = await query('SELECT COUNT(*) AS c FROM cells WHERE operator_id=:id AND deleted_at IS NULL', { id });
  const [uploads] = await query('SELECT COUNT(*) AS c FROM pm_files WHERE operator_id=:id', { id });
  const compliance = await query(
    `SELECT status, COUNT(*) AS c FROM compliance_results
      WHERE operator_id=:id GROUP BY status`, { id }
  );
  const complianceCounts = { PASS: 0, WARNING: 0, FAIL: 0 };
  for (const r of compliance) complianceCounts[r.status] = r.c;
  return { sites: sites.c, cells: cells.c, uploads: uploads.c, compliance: complianceCounts };
}
