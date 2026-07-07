import { query } from '../../config/db.js';

export async function fiveDomainOverview(operatorId) {
  // 1. RAN — site/cell counts + avg availability
  const ran = await query(
    `SELECT COUNT(DISTINCT s.site_id) AS sites,
            COUNT(DISTINCT c.cell_id) AS cells,
            ROUND(AVG(CASE WHEN c.status = 'ACTIVE' THEN 100 ELSE 0 END), 1) AS availability
       FROM cells c
       JOIN sites s ON s.site_id = c.site_id
       ${operatorId ? 'WHERE s.operator_id = :op' : ''}`,
    operatorId ? { op: operatorId } : {}
  );

  // 2. Fiber — link health
  const fiber = await query(
    `SELECT COUNT(*) AS total_links,
            SUM(status = 'ACTIVE') AS active_links,
            SUM(status = 'DEGRADED') AS degraded_links,
            SUM(status = 'DOWN') AS down_links,
            ROUND(AVG(utilization_pct), 1) AS avg_util,
            ROUND(SUM(distance_km), 0) AS total_km
       FROM fiber_links
       ${operatorId ? 'WHERE operator_id = :op' : ''}`,
    operatorId ? { op: operatorId } : {}
  );

  // 3. Core — element status + load
  const core = await query(
    `SELECT COUNT(*) AS total,
            SUM(status = 'ACTIVE') AS active,
            SUM(status = 'DEGRADED') AS degraded,
            SUM(status = 'DOWN') AS down_cnt,
            ROUND(AVG(cpu_pct), 1) AS avg_cpu,
            ROUND(AVG(memory_pct), 1) AS avg_mem
       FROM core_elements WHERE is_active = 1
       ${operatorId ? 'AND operator_id = :op' : ''}`,
    operatorId ? { op: operatorId } : {}
  );

  const coreAlarms = await query(
    `SELECT COUNT(*) AS cnt FROM core_alarms
      WHERE status = 'ACTIVE'
      ${operatorId ? 'AND operator_id = :op' : ''}`,
    operatorId ? { op: operatorId } : {}
  );

  // 4. Consumer — complaint stats
  const consumer = await query(
    `SELECT COUNT(*) AS total,
            SUM(status IN ('OPEN','INVESTIGATING','ESCALATED')) AS open_cnt,
            SUM(status IN ('RESOLVED','CLOSED')) AS resolved_cnt,
            SUM(severity = 'CRITICAL') AS critical_cnt
       FROM complaints
       ${operatorId ? 'WHERE operator_id = :op' : ''}`,
    operatorId ? { op: operatorId } : {}
  );

  // 5. Compliance — latest overall scores
  const compliancePeriod = await query(`SELECT MAX(period) AS latest FROM compliance_scores`);
  const period = compliancePeriod[0]?.latest;
  let compliance = [];
  if (period) {
    compliance = await query(
      `SELECT cs.score, cs.kpi_pass, cs.kpi_total, o.operator_name
         FROM compliance_scores cs
         JOIN operators o ON o.operator_id = cs.operator_id
        WHERE cs.period = :period AND cs.domain = 'OVERALL'
          ${operatorId ? 'AND cs.operator_id = :op' : ''}
        ORDER BY cs.score DESC`,
      { period, ...(operatorId ? { op: operatorId } : {}) }
    );
  }

  // Fiber outages
  const fiberOutages = await query(
    `SELECT COUNT(*) AS cnt FROM fiber_outages
      WHERE status IN ('ACTIVE','INVESTIGATING')
      ${operatorId ? 'AND operator_id = :op' : ''}`,
    operatorId ? { op: operatorId } : {}
  );

  return {
    ran: ran[0],
    fiber: { ...fiber[0], active_outages: fiberOutages[0]?.cnt ?? 0 },
    core: { ...core[0], active_alarms: coreAlarms[0]?.cnt ?? 0 },
    consumer: consumer[0],
    compliance: { period: period ? String(period).slice(0, 10) : null, operators: compliance },
  };
}
