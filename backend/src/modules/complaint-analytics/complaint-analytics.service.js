import { query } from '../../config/db.js';

export async function resolutionMetrics(operatorId) {
  const rows = await query(
    `SELECT
       COUNT(*) AS total,
       SUM(status IN ('RESOLVED','CLOSED')) AS resolved,
       SUM(status IN ('OPEN','INVESTIGATING','ESCALATED')) AS open_cnt,
       SUM(severity = 'CRITICAL') AS critical_cnt,
       ROUND(AVG(CASE WHEN resolved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, reported_at, resolved_at) END), 1) AS avg_resolution_hours,
       ROUND(AVG(CASE WHEN first_response_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, reported_at, first_response_at) END), 0) AS avg_first_response_min,
       SUM(CASE WHEN resolved_at IS NOT NULL AND TIMESTAMPDIFF(HOUR, reported_at, resolved_at) <= sla_hours THEN 1 ELSE 0 END) AS sla_met,
       SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) AS sla_eligible
     FROM complaints
     ${operatorId ? 'WHERE operator_id = :op' : ''}`,
    operatorId ? { op: operatorId } : {}
  );
  const r = rows[0];
  return {
    total: Number(r.total),
    resolved: Number(r.resolved),
    openCount: Number(r.open_cnt),
    criticalCount: Number(r.critical_cnt),
    avgResolutionHours: Number(r.avg_resolution_hours) || 0,
    avgFirstResponseMin: Number(r.avg_first_response_min) || 0,
    slaComplianceRate: r.sla_eligible > 0
      ? Math.round((r.sla_met / r.sla_eligible) * 1000) / 10
      : 100,
  };
}

export async function resolutionTrend(operatorId) {
  return query(
    `SELECT
       DATE_FORMAT(reported_at, '%Y-%m-%d') AS day,
       COUNT(*) AS filed,
       SUM(status IN ('RESOLVED','CLOSED')) AS resolved,
       ROUND(AVG(CASE WHEN resolved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, reported_at, resolved_at) END), 1) AS avg_hours
     FROM complaints
     WHERE reported_at >= DATE_SUB(CURDATE(), INTERVAL 45 DAY)
       ${operatorId ? 'AND operator_id = :op' : ''}
     GROUP BY day ORDER BY day`,
    operatorId ? { op: operatorId } : {}
  );
}

export async function operatorBenchmark(operatorId) {
  return query(
    `SELECT
       o.operator_name,
       COUNT(*) AS total,
       SUM(c.status IN ('RESOLVED','CLOSED')) AS resolved,
       ROUND(AVG(CASE WHEN c.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, c.reported_at, c.resolved_at) END), 1) AS avg_resolution_hours,
       ROUND(AVG(CASE WHEN c.first_response_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, c.reported_at, c.first_response_at) END), 0) AS avg_response_min,
       ROUND(SUM(CASE WHEN c.resolved_at IS NOT NULL AND TIMESTAMPDIFF(HOUR, c.reported_at, c.resolved_at) <= c.sla_hours THEN 1 ELSE 0 END)
             / NULLIF(SUM(CASE WHEN c.resolved_at IS NOT NULL THEN 1 ELSE 0 END), 0) * 100, 1) AS sla_pct,
       SUM(c.severity = 'CRITICAL') AS critical_cnt
     FROM complaints c
     JOIN operators o ON o.operator_id = c.operator_id
     ${operatorId ? 'WHERE c.operator_id = :op' : ''}
     GROUP BY o.operator_name
     ORDER BY sla_pct DESC`,
    operatorId ? { op: operatorId } : {}
  );
}

export async function categoryBreakdown(operatorId) {
  return query(
    `SELECT
       category,
       COUNT(*) AS total,
       SUM(status IN ('RESOLVED','CLOSED')) AS resolved,
       ROUND(AVG(CASE WHEN resolved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, reported_at, resolved_at) END), 1) AS avg_hours
     FROM complaints
     ${operatorId ? 'WHERE operator_id = :op' : ''}
     GROUP BY category
     ORDER BY total DESC`,
    operatorId ? { op: operatorId } : {}
  );
}

export async function slaBreaches(operatorId) {
  return query(
    `SELECT c.complaint_id, c.reference_no, c.subject, c.category, c.severity,
            c.status, c.sla_hours, c.reported_at,
            TIMESTAMPDIFF(HOUR, c.reported_at, NOW()) AS elapsed_hours,
            o.operator_name
     FROM complaints c
     JOIN operators o ON o.operator_id = c.operator_id
     WHERE c.status NOT IN ('RESOLVED','CLOSED')
       AND TIMESTAMPDIFF(HOUR, c.reported_at, NOW()) > c.sla_hours
       ${operatorId ? 'AND c.operator_id = :op' : ''}
     ORDER BY (TIMESTAMPDIFF(HOUR, c.reported_at, NOW()) - c.sla_hours) DESC
     LIMIT 20`,
    operatorId ? { op: operatorId } : {}
  );
}

export async function weeklyTrend(operatorId) {
  return query(
    `SELECT
       YEARWEEK(reported_at, 1) AS yw,
       MIN(DATE(reported_at)) AS week_start,
       o.operator_name,
       COUNT(*) AS cnt,
       SUM(c.status IN ('RESOLVED','CLOSED')) AS resolved
     FROM complaints c
     JOIN operators o ON o.operator_id = c.operator_id
     WHERE c.reported_at >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK)
       ${operatorId ? 'AND c.operator_id = :op' : ''}
     GROUP BY yw, o.operator_name
     ORDER BY yw, o.operator_name`,
    operatorId ? { op: operatorId } : {}
  );
}
