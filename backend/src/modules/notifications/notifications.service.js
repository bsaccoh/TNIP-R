import { query } from '../../config/db.js';

export async function listNotifications(userId, { unreadOnly = false } = {}) {
  const where = unreadOnly
    ? 'WHERE (n.user_id = :userId OR n.user_id IS NULL) AND n.is_read = 0'
    : 'WHERE (n.user_id = :userId OR n.user_id IS NULL)';
  return query(`SELECT n.*, o.operator_name
                FROM notifications n
                LEFT JOIN operators o ON o.operator_id = n.operator_id
                ${where} ORDER BY n.created_at DESC LIMIT 100`, { userId });
}

export async function markRead(notificationId, userId) {
  await query('UPDATE notifications SET is_read = 1 WHERE notification_id = :notificationId AND (user_id = :userId OR user_id IS NULL)',
    { notificationId, userId });
}

export async function markAllRead(userId) {
  await query('UPDATE notifications SET is_read = 1 WHERE user_id = :userId OR user_id IS NULL', { userId });
}

export async function unreadCount(userId) {
  const [{ cnt }] = await query(
    'SELECT COUNT(*) AS cnt FROM notifications WHERE (user_id = :userId OR user_id IS NULL) AND is_read = 0',
    { userId });
  return Number(cnt);
}

export async function createNotification({ userId = null, operatorId = null, title, body }) {
  const res = await query(
    'INSERT INTO notifications (user_id, operator_id, title, body) VALUES (:userId, :operatorId, :title, :body)',
    { userId, operatorId, title, body });
  return res.insertId;
}

// Scan thresholds vs latest calculated KPIs and create notifications for breaches
export async function scanThresholdBreaches() {
  const rows = await query(`
    SELECT ck.operator_id, o.operator_name, kd.kpi_id, kd.kpi_key, kd.name AS kpi_name, kd.unit,
           ck.value, qt.required_value, qt.comparator, qt.warning_margin, qt.threshold_id
    FROM calculated_kpis ck
    JOIN kpi_definitions kd ON kd.kpi_id = ck.kpi_id
    JOIN operators o ON o.operator_id = ck.operator_id
    JOIN qos_thresholds qt ON qt.kpi_id = ck.kpi_id
      AND (qt.operator_id IS NULL OR qt.operator_id = ck.operator_id)
      AND qt.is_active = 1
      AND (qt.effective_to IS NULL OR qt.effective_to >= CURDATE())
    WHERE ck.calculated_at = (
      SELECT MAX(ck2.calculated_at) FROM calculated_kpis ck2
      WHERE ck2.kpi_id = ck.kpi_id AND ck2.operator_id = ck.operator_id
    )
  `);

  let created = 0;
  for (const r of rows) {
    const val = Number(r.value);
    const req = Number(r.required_value);
    const margin = Number(r.warning_margin) || 0;

    let passes = true;
    if (r.comparator === 'GTE') passes = val >= req;
    else if (r.comparator === 'LTE') passes = val <= req;
    else if (r.comparator === 'GT')  passes = val > req;
    else if (r.comparator === 'LT')  passes = val < req;

    if (!passes) {
      const diff = Math.abs(val - req).toFixed(2);
      const title = `KPI Breach: ${r.kpi_key} — ${r.operator_name}`;
      const body = `${r.kpi_name} is ${val}${r.unit} (threshold: ${r.comparator} ${req}${r.unit}, deviation: ${diff})`;
      // Avoid duplicate notifications (check last 24h)
      const [{ cnt }] = await query(
        `SELECT COUNT(*) AS cnt FROM notifications WHERE title = :title AND created_at > NOW() - INTERVAL 24 HOUR`,
        { title });
      if (Number(cnt) === 0) {
        await createNotification({ operatorId: r.operator_id, title, body });
        created++;
      }
    }
  }
  return created;
}
