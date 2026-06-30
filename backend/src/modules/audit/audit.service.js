import { query } from '../../config/db.js';

export async function listAuditLogs({ userId, action, entityType, from, to, limit = 50, offset = 0 }) {
  const conds = [];
  const params = {};

  if (userId) { conds.push('a.user_id = :userId'); params.userId = userId; }
  if (action) { conds.push('a.action LIKE :action'); params.action = `%${action}%`; }
  if (entityType) { conds.push('a.entity_type = :entityType'); params.entityType = entityType; }
  if (from) { conds.push('a.created_at >= :from'); params.from = from; }
  if (to)   { conds.push('a.created_at <= :to');   params.to = to; }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  params.limit  = Number(limit);
  params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(`SELECT a.audit_id, a.user_id, u.full_name, a.action, a.entity_type,
                  a.entity_id, a.detail, a.ip_address, a.operator_id,
                  o.operator_name, a.created_at
           FROM audit_logs a
           LEFT JOIN users u ON u.user_id = a.user_id
           LEFT JOIN operators o ON o.operator_id = a.operator_id
           ${where} ORDER BY a.created_at DESC LIMIT :limit OFFSET :offset`, params),
    query(`SELECT COUNT(*) AS total FROM audit_logs a ${where}`, params),
  ]);

  return { rows, total, limit: params.limit, offset: params.offset };
}

export async function getActionTypes() {
  const rows = await query('SELECT DISTINCT action FROM audit_logs ORDER BY action');
  return rows.map((r) => r.action);
}
