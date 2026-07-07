import { query } from '../../config/db.js';

export async function listElements(operatorId) {
  return query(
    `SELECT ce.*, o.operator_name
       FROM core_elements ce
       JOIN operators o ON o.operator_id = ce.operator_id
      WHERE ce.is_active = 1
        ${operatorId ? 'AND ce.operator_id = :op' : ''}
      ORDER BY FIELD(ce.status, 'DOWN','DEGRADED','MAINTENANCE','ACTIVE'),
               o.operator_name, ce.element_type`,
    operatorId ? { op: operatorId } : {}
  );
}

export async function coreSummary(operatorId) {
  const elements = await query(
    `SELECT status, COUNT(*) AS cnt
       FROM core_elements WHERE is_active = 1
       ${operatorId ? 'AND operator_id = :op' : ''}
      GROUP BY status`,
    operatorId ? { op: operatorId } : {}
  );

  const byType = await query(
    `SELECT element_type, COUNT(*) AS cnt
       FROM core_elements WHERE is_active = 1
       ${operatorId ? 'AND operator_id = :op' : ''}
      GROUP BY element_type ORDER BY cnt DESC`,
    operatorId ? { op: operatorId } : {}
  );

  const avgLoad = await query(
    `SELECT ROUND(AVG(cpu_pct), 1) AS avg_cpu,
            ROUND(AVG(memory_pct), 1) AS avg_mem,
            ROUND(AVG(CASE WHEN max_sessions > 0 THEN sessions * 100.0 / max_sessions END), 1) AS avg_session_util
       FROM core_elements WHERE is_active = 1 AND status != 'DOWN'
       ${operatorId ? 'AND operator_id = :op' : ''}`,
    operatorId ? { op: operatorId } : {}
  );

  const kpis = await query(
    `SELECT ck.kpi_key, ck.kpi_name, ck.unit,
            o.operator_name, ck.value
       FROM core_kpis ck
       JOIN operators o ON o.operator_id = ck.operator_id
      WHERE ck.ts = (SELECT MAX(ts) FROM core_kpis)
        ${operatorId ? 'AND ck.operator_id = :op' : ''}
      ORDER BY ck.kpi_key, o.operator_name`,
    operatorId ? { op: operatorId } : {}
  );

  const activeAlarms = await query(
    `SELECT severity, COUNT(*) AS cnt
       FROM core_alarms WHERE status IN ('ACTIVE','ACKNOWLEDGED')
       ${operatorId ? 'AND operator_id = :op' : ''}
      GROUP BY severity`,
    operatorId ? { op: operatorId } : {}
  );

  return { elements, byType, avgLoad: avgLoad[0], kpis, activeAlarms };
}

export async function listAlarms(operatorId) {
  return query(
    `SELECT ca.*, ce.element_name, ce.element_type, o.operator_name
       FROM core_alarms ca
       LEFT JOIN core_elements ce ON ce.element_id = ca.element_id
       JOIN operators o ON o.operator_id = ca.operator_id
      WHERE 1=1
        ${operatorId ? 'AND ca.operator_id = :op' : ''}
      ORDER BY FIELD(ca.status, 'ACTIVE','ACKNOWLEDGED','CLEARED'),
               FIELD(ca.severity, 'CRITICAL','MAJOR','MINOR','WARNING','INFO'),
               ca.raised_at DESC
      LIMIT 50`,
    operatorId ? { op: operatorId } : {}
  );
}

export async function elementDetail(elementId) {
  const el = await query(
    `SELECT ce.*, o.operator_name
       FROM core_elements ce
       JOIN operators o ON o.operator_id = ce.operator_id
      WHERE ce.element_id = :id`,
    { id: elementId }
  );
  const alarms = await query(
    `SELECT * FROM core_alarms WHERE element_id = :id
      ORDER BY raised_at DESC LIMIT 10`,
    { id: elementId }
  );
  return { element: el[0] || null, alarms };
}
