import { query } from '../../config/db.js';

export async function listKpiDefinitions() {
  return query(
    `SELECT d.*, t.required_value, t.comparator
       FROM fiber_kpi_definitions d
       LEFT JOIN fiber_qos_thresholds t ON t.kpi_id = d.kpi_id AND t.is_active = 1
      WHERE d.is_active = 1
      ORDER BY d.category, d.name`
  );
}

export async function listNodes(operatorId) {
  return query(
    `SELECT n.*, o.operator_name
       FROM fiber_nodes n
       JOIN operators o ON o.operator_id = n.operator_id
      WHERE n.is_active = 1
        ${operatorId ? 'AND n.operator_id = :op' : ''}
      ORDER BY o.operator_name, n.node_name`,
    operatorId ? { op: operatorId } : {}
  );
}

/**
 * Multi-operator time-series for all fiber KPIs.
 * Returns [{kpi_key, kpi_name, unit, threshold, operators: [{operator_name, series[]}]}]
 */
export async function fiberKpiTimeSeries({ operatorId, from, to }) {
  const series = await query(
    `SELECT o.operator_id, o.operator_name,
            d.kpi_key, d.name AS kpi_name, d.unit,
            DATE(ck.ts) AS day, ROUND(AVG(ck.value), 4) AS value
       FROM fiber_calculated_kpis ck
       JOIN fiber_kpi_definitions d ON d.kpi_id = ck.kpi_id
       JOIN operators o ON o.operator_id = ck.operator_id
      WHERE ck.granularity = 'DAY'
        ${operatorId ? 'AND ck.operator_id = :op' : ''}
        ${from ? 'AND ck.ts >= :from' : ''}
        ${to   ? 'AND ck.ts <= :to'   : ''}
      GROUP BY o.operator_id, o.operator_name, d.kpi_key, d.name, d.unit, DATE(ck.ts)
      ORDER BY d.kpi_key, o.operator_name, day`,
    {
      ...(operatorId ? { op: operatorId } : {}),
      ...(from ? { from } : {}),
      ...(to   ? { to }   : {}),
    }
  );

  const thresholds = await query(
    `SELECT d.kpi_key, t.required_value, t.comparator
       FROM fiber_qos_thresholds t
       JOIN fiber_kpi_definitions d ON d.kpi_id = t.kpi_id
      WHERE t.is_active = 1`
  );
  const threshMap = Object.fromEntries(thresholds.map((t) => [t.kpi_key, t]));

  const kpiMap = {};
  for (const row of series) {
    if (!kpiMap[row.kpi_key]) {
      kpiMap[row.kpi_key] = { kpi_key: row.kpi_key, kpi_name: row.kpi_name, unit: row.unit, operators: {} };
    }
    const ops = kpiMap[row.kpi_key].operators;
    if (!ops[row.operator_id]) {
      ops[row.operator_id] = { operator_id: row.operator_id, operator_name: row.operator_name, series: [] };
    }
    ops[row.operator_id].series.push({ day: String(row.day).slice(0, 10), value: Number(row.value) });
  }

  return Object.values(kpiMap).map((kpi) => ({
    ...kpi,
    operators: Object.values(kpi.operators),
    threshold: threshMap[kpi.kpi_key] ?? null,
  }));
}

/** Topology: all geo-tagged nodes + links for the backbone map. */
export async function fiberTopology(operatorId) {
  const nodes = await query(
    `SELECT n.node_id, n.node_name, n.node_type, n.city, n.location,
            n.lat, n.lng, n.vendor, n.is_active,
            n.operator_id, o.operator_name
       FROM fiber_nodes n
       JOIN operators o ON o.operator_id = n.operator_id
      WHERE n.is_active = 1 AND n.lat IS NOT NULL
        ${operatorId ? 'AND n.operator_id = :op' : ''}
      ORDER BY o.operator_name, n.node_name`,
    operatorId ? { op: operatorId } : {}
  );

  const links = await query(
    `SELECT l.link_id, l.link_type, l.distance_km, l.capacity_gbps,
            l.utilization_pct, l.status, l.operator_id, o.operator_name,
            na.node_id AS node_a_id, na.node_name AS node_a_name,
            na.lat AS lat_a, na.lng AS lng_a, na.city AS city_a,
            nb.node_id AS node_b_id, nb.node_name AS node_b_name,
            nb.lat AS lat_b, nb.lng AS lng_b, nb.city AS city_b
       FROM fiber_links l
       JOIN fiber_nodes na ON na.node_id = l.node_a_id
       JOIN fiber_nodes nb ON nb.node_id = l.node_b_id
       JOIN operators   o  ON o.operator_id = l.operator_id
      WHERE na.lat IS NOT NULL AND nb.lat IS NOT NULL
        ${operatorId ? 'AND l.operator_id = :op' : ''}
      ORDER BY l.link_type, o.operator_name`,
    operatorId ? { op: operatorId } : {}
  );

  return { nodes, links };
}

/** Summary stats: node count, latest avg per KPI per operator. */
export async function fiberSummary(operatorId) {
  const nodeCount = await query(
    `SELECT COUNT(*) AS total, SUM(node_type='OLT') AS olt_count
       FROM fiber_nodes WHERE is_active = 1
       ${operatorId ? 'AND operator_id = :op' : ''}`,
    operatorId ? { op: operatorId } : {}
  );

  const latest = await query(
    `SELECT o.operator_name, d.kpi_key, d.unit,
            ROUND(AVG(ck.value), 4) AS avg_value
       FROM fiber_calculated_kpis ck
       JOIN fiber_kpi_definitions d ON d.kpi_id = ck.kpi_id
       JOIN operators o ON o.operator_id = ck.operator_id
      WHERE ck.granularity = 'DAY'
        AND DATE(ck.ts) = (SELECT MAX(DATE(ts)) FROM fiber_calculated_kpis)
        ${operatorId ? 'AND ck.operator_id = :op' : ''}
      GROUP BY o.operator_name, d.kpi_key, d.unit
      ORDER BY o.operator_name, d.kpi_key`,
    operatorId ? { op: operatorId } : {}
  );

  const linkHealth = await query(
    `SELECT status, COUNT(*) AS cnt,
            ROUND(AVG(utilization_pct), 1) AS avg_util,
            ROUND(SUM(distance_km), 1) AS total_km
       FROM fiber_links
       ${operatorId ? 'WHERE operator_id = :op' : ''}
      GROUP BY status`,
    operatorId ? { op: operatorId } : {}
  );

  return { nodes: nodeCount[0], latest, linkHealth };
}

/** Active + recent outages. */
export async function listOutages(operatorId) {
  return query(
    `SELECT fo.*, o.operator_name
       FROM fiber_outages fo
       JOIN operators o ON o.operator_id = fo.operator_id
      WHERE 1=1
        ${operatorId ? 'AND fo.operator_id = :op' : ''}
      ORDER BY FIELD(fo.status, 'ACTIVE', 'INVESTIGATING', 'RESOLVED'),
               fo.started_at DESC
      LIMIT 20`,
    operatorId ? { op: operatorId } : {}
  );
}
