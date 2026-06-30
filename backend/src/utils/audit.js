import { query } from '../config/db.js';
import { logger } from '../config/logger.js';

/** Write an audit log row. Never throws into the request path. */
export async function audit({ userId = null, operatorId = null, action, entityType = null, entityId = null, detail = null, ip = null }) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, operator_id, action, entity_type, entity_id, detail, ip_address)
       VALUES (:userId, :operatorId, :action, :entityType, :entityId, :detail, :ip)`,
      { userId, operatorId, action, entityType, entityId, detail: detail ? JSON.stringify(detail) : null, ip }
    );
  } catch (err) {
    logger.warn(`audit write failed: ${err.message}`);
  }
}
