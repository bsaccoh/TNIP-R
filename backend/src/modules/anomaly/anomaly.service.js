import { query } from '../../config/db.js';

// Compare last 2 days of calculated KPIs; flag drops >= minPct %
export async function detectAnomalies(minPct = 10) {
  const rows = await query(`
    SELECT a.operator_id, o.operator_name, a.kpi_id, kd.kpi_key, kd.name AS kpi_name, kd.unit,
           a.value AS today_value,
           b.value AS prev_value,
           ABS(a.value - b.value) AS abs_change,
           ROUND(ABS(a.value - b.value) / NULLIF(b.value,0) * 100, 2) AS pct_change,
           CASE WHEN a.value < b.value THEN 'DROP' ELSE 'SPIKE' END AS direction,
           a.calculated_at AS ts
    FROM calculated_kpis a
    JOIN calculated_kpis b
      ON b.kpi_id = a.kpi_id AND b.operator_id = a.operator_id
      AND DATE(b.calculated_at) = DATE(a.calculated_at) - INTERVAL 1 DAY
    JOIN operators o ON o.operator_id = a.operator_id
    JOIN kpi_definitions kd ON kd.kpi_id = a.kpi_id
    WHERE DATE(a.calculated_at) = CURDATE()
      AND ABS(a.value - b.value) / NULLIF(b.value,0) * 100 >= :minPct
    ORDER BY pct_change DESC
    LIMIT 200
  `, { minPct });

  // Upsert into anomaly_detections
  for (const r of rows) {
    const [{ cnt }] = await query(
      `SELECT COUNT(*) AS cnt FROM anomaly_detections
       WHERE operator_id=:op AND kpi_id=:kpi AND DATE(ts)=CURDATE()`,
      { op: r.operator_id, kpi: r.kpi_id });
    if (Number(cnt) === 0) {
      const sev = r.pct_change >= 30 ? 'HIGH' : r.pct_change >= 15 ? 'MEDIUM' : 'LOW';
      await query(
        `INSERT INTO anomaly_detections (operator_id,kpi_id,ts,value,expected,deviation,method,severity)
         VALUES (:op,:kpi,:ts,:val,:exp,:dev,'pct_change',:sev)`,
        { op: r.operator_id, kpi: r.kpi_id, ts: r.ts, val: r.today_value,
          exp: r.prev_value, dev: r.pct_change, sev });
    }
  }

  return rows;
}

export async function listAnomalies({ operatorId, severity, from, to, limit = 100, offset = 0 }) {
  const conds = ['1=1'];
  const params = { limit: Number(limit), offset: Number(offset) };
  if (operatorId) { conds.push('a.operator_id = :operatorId'); params.operatorId = operatorId; }
  if (severity)   { conds.push('a.severity = :severity');     params.severity = severity; }
  if (from)       { conds.push('a.ts >= :from');              params.from = from; }
  if (to)         { conds.push('a.ts <= :to');                params.to = to; }

  const where = `WHERE ${conds.join(' AND ')}`;
  const [rows, [{ total }]] = await Promise.all([
    query(`SELECT a.*, o.operator_name, kd.kpi_key, kd.name AS kpi_name, kd.unit
           FROM anomaly_detections a
           JOIN operators o ON o.operator_id = a.operator_id
           JOIN kpi_definitions kd ON kd.kpi_id = a.kpi_id
           ${where} ORDER BY a.created_at DESC LIMIT :limit OFFSET :offset`, params),
    query(`SELECT COUNT(*) AS total FROM anomaly_detections a ${where}`, params),
  ]);
  return { rows, total };
}
