import { query } from '../../config/db.js';

/** National Executive Dashboard payload. */
export async function nationalExecutive() {
  const [counts] = await query(
    `SELECT
       (SELECT COUNT(*) FROM operators WHERE deleted_at IS NULL AND status='ACTIVE') AS operators,
       (SELECT COUNT(*) FROM sites WHERE deleted_at IS NULL) AS sites,
       (SELECT COUNT(*) FROM cells WHERE deleted_at IS NULL) AS cells`
  );

  const [avail] = await query(
    `SELECT AVG(ck.value) AS national_availability
       FROM calculated_kpis ck JOIN kpi_definitions k ON k.kpi_id=ck.kpi_id
      WHERE k.kpi_key='CELL_AVAILABILITY' AND ck.granularity='DAY'`
  );

  const complianceByOperator = await query(
    `SELECT o.operator_id, o.operator_name, cr.status, COUNT(*) AS count
       FROM operators o LEFT JOIN compliance_results cr ON cr.operator_id=o.operator_id
      WHERE o.deleted_at IS NULL
      GROUP BY o.operator_id, o.operator_name, cr.status`
  );

  const recentUploads = await query(
    `SELECT pf.pm_file_id, o.operator_name, pf.file_name, pf.status, pf.upload_date
       FROM pm_files pf JOIN operators o ON o.operator_id=pf.operator_id
      ORDER BY pf.upload_date DESC LIMIT 8`
  );

  const ranking = await query(
    `SELECT o.operator_name, r.qos_score, r.rank_position, r.trend, r.period
       FROM operator_rankings r JOIN operators o ON o.operator_id=r.operator_id
      WHERE r.period = (SELECT MAX(period) FROM operator_rankings)
      ORDER BY r.rank_position`
  );

  const techDistribution = await query(
    `SELECT t.tech_key, COUNT(*) AS cells
       FROM cells c JOIN technologies t ON t.technology_id=c.technology_id
      WHERE c.deleted_at IS NULL GROUP BY t.tech_key`
  );

  const recommendations = await query(
    `SELECT title, body, severity, created_at FROM ai_recommendations
      ORDER BY created_at DESC LIMIT 5`
  );

  // National QoS score = average of operator composite scores (fallback: compliance pass rate).
  const nationalQos = ranking.length
    ? ranking.reduce((s, r) => s + (r.qos_score || 0), 0) / ranking.length
    : null;

  return {
    counts,
    nationalAvailability: avail.national_availability,
    nationalQosScore: nationalQos,
    complianceByOperator,
    ranking,
    recentUploads,
    techDistribution,
    recommendations,
  };
}

/** Recent audit activity for the activity feed. */
export async function recentActivity() {
  return query(
    `SELECT al.audit_id, al.action, al.entity_type, al.entity_id, al.ip_address, al.created_at,
            u.full_name, u.email, o.operator_name
       FROM audit_logs al
       LEFT JOIN users u ON u.user_id = al.user_id
       LEFT JOIN operators o ON o.operator_id = al.operator_id
      ORDER BY al.created_at DESC LIMIT 20`
  );
}

/** Notifications: recent compliance violations + failed ingestions. */
export async function notifications() {
  const violations = await query(
    `SELECT ca.alert_id, ca.message, ca.severity, ca.created_at,
            o.operator_name, k.kpi_key
       FROM compliance_alerts ca
       JOIN operators o ON o.operator_id = ca.operator_id
       LEFT JOIN compliance_results cr ON cr.compliance_id = ca.compliance_id
       LEFT JOIN kpi_definitions k ON k.kpi_id = cr.kpi_id
      WHERE ca.severity = 'VIOLATION'
      ORDER BY ca.created_at DESC LIMIT 10`
  );

  const failedIngestions = await query(
    `SELECT pf.pm_file_id, pf.file_name, pf.status, pf.upload_date, o.operator_name
       FROM pm_files pf JOIN operators o ON o.operator_id = pf.operator_id
      WHERE pf.status IN ('FAILED', 'ERROR')
      ORDER BY pf.upload_date DESC LIMIT 5`
  );

  return { violations, failedIngestions, total: violations.length + failedIngestions.length };
}

/** National QoS monitoring — per-operator latest KPI values for the comparison dashboard. */
export async function nationalQos() {
  return query(
    `SELECT o.operator_id, o.operator_name, k.kpi_key, k.name AS kpi_name, k.unit,
            AVG(ck.value) AS value
       FROM calculated_kpis ck
       JOIN operators o ON o.operator_id=ck.operator_id
       JOIN kpi_definitions k ON k.kpi_id=ck.kpi_id
      WHERE ck.granularity='DAY'
      GROUP BY o.operator_id, o.operator_name, k.kpi_key, k.name, k.unit
      ORDER BY o.operator_name, k.kpi_key`
  );
}
