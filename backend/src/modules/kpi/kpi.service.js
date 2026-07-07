import { pool, query } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { evaluateFormula, extractCounterKeys, validateFormula } from './formulaEvaluator.js';

/** Pick the aggregated value matching a counter's aggregation method. */
function pickAgg(row) {
  switch (row.aggregation) {
    case 'AVG': return row.avg_val;
    case 'MAX': return row.max_val;
    case 'MIN': return row.min_val;
    case 'LAST': return row.last_val ?? row.avg_val;
    default: return row.sum_val; // SUM
  }
}

async function loadActiveFormulas(operatorId, technologyId, vendorId) {
  const rows = await query(
    `SELECT f.formula_id, f.kpi_id, f.expression, k.kpi_key, k.name
       FROM kpi_formulas f JOIN kpi_definitions k ON k.kpi_id = f.kpi_id
      WHERE f.is_active = 1
        AND (f.vendor_id = :v OR f.vendor_id IS NULL)
        AND (f.technology_id = :t OR f.technology_id IS NULL)
        AND (f.operator_id = :op OR f.operator_id IS NULL)`,
    { v: vendorId ?? null, t: technologyId, op: operatorId }
  );
  return rows.map((r) => ({ ...r, counterKeys: extractCounterKeys(r.expression) }));
}

/**
 * Calculate cell-level DAY KPIs for one PM file. Skips KPIs whose counters are
 * unavailable (graceful) and stores results in calculated_kpis.
 */
export async function calculateForFile(pmFileId, operatorId) {
  // Use the file's actual technology and vendor so formulas resolve correctly per vendor.
  const fileRow = (await query('SELECT technology_id, vendor_id FROM pm_files WHERE pm_file_id = :id', { id: pmFileId }))[0];
  const technologyId = fileRow?.technology_id ?? 3;
  const vendorId = fileRow?.vendor_id ?? null;
  const formulas = await loadActiveFormulas(operatorId, technologyId, vendorId);
  if (!formulas.length) return { kpisCalculated: 0, message: 'No active formulas for technology' };

  // Aggregate counter values per cell per day.
  const agg = await query(
    `SELECT cv.cell_id, DATE(cv.ts) AS day, cd.counter_key, cd.aggregation,
            SUM(cv.value) AS sum_val, AVG(cv.value) AS avg_val,
            MAX(cv.value) AS max_val, MIN(cv.value) AS min_val
       FROM counter_values cv
       JOIN counter_definitions cd ON cd.counter_id = cv.counter_id
      WHERE cv.pm_file_id = :id
      GROUP BY cv.cell_id, DATE(cv.ts), cd.counter_key, cd.aggregation`,
    { id: pmFileId }
  );

  // group -> Map<`cell|day`, Map<counter_key, value>>
  const groups = new Map();
  for (const row of agg) {
    const key = `${row.cell_id}|${row.day}`;
    if (!groups.has(key)) groups.set(key, { cellId: row.cell_id, day: row.day, counters: new Map() });
    groups.get(key).counters.set(row.counter_key, pickAgg(row));
  }

  const inserts = [];
  let calculated = 0;
  let skipped = 0;
  for (const { cellId, day, counters } of groups.values()) {
    for (const f of formulas) {
      const hasAll = f.counterKeys.every((k) => counters.has(k));
      if (!hasAll) { skipped++; continue; }
      let value;
      try {
        value = evaluateFormula(f.expression, counters);
      } catch (err) {
        logger.warn(`Formula ${f.kpi_key} eval failed: ${err.message}`);
        continue;
      }
      if (value == null) { skipped++; continue; }
      inserts.push([operatorId, f.kpi_id, cellId, technologyId, `${day} 00:00:00`, 'DAY', value]);
      calculated++;
    }
  }

  // Replace existing DAY rows for these cells to keep re-calc idempotent.
  if (inserts.length) {
    const cellIds = [...new Set(inserts.map((r) => r[2]))];
    const days = [...new Set(inserts.map((r) => r[4]))];
    await query(
      `DELETE FROM calculated_kpis
        WHERE operator_id = :op AND granularity = 'DAY'
          AND cell_id IN (${cellIds.map((_, i) => `:c${i}`).join(',')})
          AND ts IN (${days.map((_, i) => `:d${i}`).join(',')})`,
      { op: operatorId, ...Object.fromEntries(cellIds.map((c, i) => [`c${i}`, c])), ...Object.fromEntries(days.map((d, i) => [`d${i}`, d])) }
    );
    const CHUNK = 500;
    for (let i = 0; i < inserts.length; i += CHUNK) {
      const chunk = inserts.slice(i, i + CHUNK);
      const placeholders = chunk.map(() => '(?,?,?,?,?,?,?)').join(',');
      await pool.query(
        `INSERT INTO calculated_kpis (operator_id, kpi_id, cell_id, technology_id, ts, granularity, value)
         VALUES ${placeholders}`,
        chunk.flat()
      );
    }
  }

  await query(`UPDATE pm_files SET status='CALCULATED' WHERE pm_file_id=:id`, { id: pmFileId });
  return { kpisCalculated: calculated, kpisSkipped: skipped, cellDays: groups.size };
}

/** Time-series of a KPI for an operator (cell-averaged per day). */
export async function kpiTimeSeries({ operatorId, kpiKey, from, to }) {
  return query(
    `SELECT DATE(ck.ts) AS day, AVG(ck.value) AS value, COUNT(*) AS samples
       FROM calculated_kpis ck JOIN kpi_definitions k ON k.kpi_id = ck.kpi_id
      WHERE ck.operator_id = :op AND k.kpi_key = :kpi AND ck.granularity = 'DAY'
        ${from ? 'AND ck.ts >= :from' : ''} ${to ? 'AND ck.ts <= :to' : ''}
      GROUP BY DATE(ck.ts) ORDER BY day`,
    { op: operatorId, kpi: kpiKey, ...(from ? { from } : {}), ...(to ? { to } : {}) }
  );
}

/** Cross-operator comparison: latest average per KPI per operator. */
export async function comparisonMatrix() {
  return query(
    `SELECT o.operator_id, o.operator_name, k.kpi_key, k.name AS kpi_name, k.unit,
            AVG(ck.value) AS value
       FROM calculated_kpis ck
       JOIN operators o ON o.operator_id = ck.operator_id
       JOIN kpi_definitions k ON k.kpi_id = ck.kpi_id
      WHERE ck.granularity = 'DAY'
      GROUP BY o.operator_id, o.operator_name, k.kpi_key, k.name, k.unit
      ORDER BY o.operator_name, k.kpi_key`
  );
}

/** Per-operator KPI analytics: average, min, max, cell count, compliance status. */
export async function operatorAnalytics() {
  return query(
    `SELECT o.operator_id, o.operator_name,
            k.kpi_id, k.kpi_key, k.name AS kpi_name, k.unit, k.category,
            t.tech_key,
            COUNT(*) AS cell_count,
            ROUND(AVG(ck.value), 4) AS avg_value,
            ROUND(MIN(ck.value), 4) AS min_value,
            ROUND(MAX(ck.value), 4) AS max_value,
            ROUND(STDDEV(ck.value), 4) AS std_dev,
            cr.status AS compliance_status,
            cr.required_value,
            qt.comparator
       FROM calculated_kpis ck
       JOIN operators o ON o.operator_id = ck.operator_id
       JOIN kpi_definitions k ON k.kpi_id = ck.kpi_id
       LEFT JOIN technologies t ON t.technology_id = ck.technology_id
       LEFT JOIN compliance_results cr ON cr.operator_id = ck.operator_id
         AND cr.kpi_id = ck.kpi_id AND cr.technology_id = ck.technology_id
       LEFT JOIN qos_thresholds qt ON qt.threshold_id = cr.threshold_id
      WHERE ck.granularity = 'DAY'
      GROUP BY o.operator_id, o.operator_name,
               k.kpi_id, k.kpi_key, k.name, k.unit, k.category,
               t.tech_key, cr.status, cr.required_value, qt.comparator
      ORDER BY o.operator_name, k.category, k.kpi_key`
  );
}

/** KPI distribution: value buckets per KPI for histogram. */
export async function kpiDistribution(kpiKey, operatorId) {
  return query(
    `SELECT ck.value
       FROM calculated_kpis ck
       JOIN kpi_definitions k ON k.kpi_id = ck.kpi_id
      WHERE k.kpi_key = :kpi AND ck.operator_id = :op AND ck.granularity = 'DAY'
      ORDER BY ck.value`,
    { kpi: kpiKey, op: operatorId }
  );
}

const TECH_ID = { '2G': 1, '3G': 2, '4G': 3, '5G': 4 };

/**
 * PM KPI time-series for all operators, grouped by KPI key, filtered by technology.
 * Returns one entry per KPI with per-operator series arrays for multi-line charts.
 * Pass operatorId to scope to a single operator (optional).
 */
export async function pmKpiTimeSeries({ operatorId, technology, from, to }) {
  const technologyId = TECH_ID[technology?.toUpperCase()] ?? null;
  const opFilter = operatorId ? 'AND ck.operator_id = :op' : '';

  const series = await query(
    `SELECT o.operator_id, o.operator_name,
            k.kpi_key, k.name AS kpi_name, k.unit,
            DATE(ck.ts) AS day, ROUND(AVG(ck.value), 4) AS value
       FROM calculated_kpis ck
       JOIN kpi_definitions k ON k.kpi_id = ck.kpi_id
       JOIN operators o ON o.operator_id = ck.operator_id
      WHERE ck.granularity = 'DAY'
        ${opFilter}
        ${technologyId ? 'AND ck.technology_id = :tid' : ''}
        ${from ? 'AND ck.ts >= :from' : ''}
        ${to ? 'AND ck.ts <= :to' : ''}
      GROUP BY o.operator_id, o.operator_name, k.kpi_key, k.name, k.unit, DATE(ck.ts)
      ORDER BY k.kpi_key, o.operator_name, day`,
    {
      ...(operatorId ? { op: operatorId } : {}),
      ...(technologyId ? { tid: technologyId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }
  );

  const thresholds = await query(
    `SELECT k.kpi_key, qt.required_value, qt.comparator
       FROM qos_thresholds qt
       JOIN kpi_definitions k ON k.kpi_id = qt.kpi_id
      WHERE qt.is_active = 1
        ${technologyId ? 'AND (qt.technology_id = :tid OR qt.technology_id IS NULL)' : ''}
      GROUP BY k.kpi_key, qt.required_value, qt.comparator`,
    { ...(technologyId ? { tid: technologyId } : {}) }
  );

  const threshMap = Object.fromEntries(thresholds.map((t) => [t.kpi_key, t]));

  // Group: kpi_key → { meta, operators: { op_id → { meta, series[] } } }
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

export async function listDefinitions() {
  return query(
    `SELECT kd.*, GROUP_CONCAT(DISTINCT kf.operator_id) AS operator_ids
       FROM kpi_definitions kd
       LEFT JOIN kpi_formulas kf ON kf.kpi_id = kd.kpi_id AND kf.is_active = 1
      GROUP BY kd.kpi_id
      ORDER BY kd.category, kd.name`
  );
}

export async function getFormulasForKpi(kpiId) {
  return query(
    `SELECT f.*, o.operator_name, t.tech_key, v.vendor_name
       FROM kpi_formulas f
       LEFT JOIN operators o ON o.operator_id = f.operator_id
       LEFT JOIN technologies t ON t.technology_id = f.technology_id
       LEFT JOIN vendors v ON v.vendor_id = f.vendor_id
      WHERE f.kpi_id = :kpiId ORDER BY f.is_active DESC, f.created_at DESC`,
    { kpiId }
  );
}

export async function createKpiDefinition({ kpiKey, name, unit, category, description }) {
  const existing = await query('SELECT kpi_id FROM kpi_definitions WHERE kpi_key = :k', { k: kpiKey });
  if (existing.length) throw new Error(`KPI key "${kpiKey}" already exists`);
  const res = await query(
    `INSERT INTO kpi_definitions (kpi_key, name, unit, category, description)
     VALUES (:kpiKey, :name, :unit, :category, :desc)`,
    { kpiKey, name, unit: unit || '%', category: category || 'Custom', desc: description || null }
  );
  return (await query('SELECT * FROM kpi_definitions WHERE kpi_id = :id', { id: res.insertId }))[0];
}

export async function saveFormula({ kpiId, expression, operatorId, technologyId, vendorId }) {
  validateFormula(expression);
  await query(
    `UPDATE kpi_formulas SET is_active = 0
      WHERE kpi_id = :kpiId AND (operator_id = :op OR (:op IS NULL AND operator_id IS NULL))
        AND (technology_id = :tech OR (:tech IS NULL AND technology_id IS NULL))`,
    { kpiId, op: operatorId || null, tech: technologyId || null }
  );
  const res = await query(
    `INSERT INTO kpi_formulas (kpi_id, expression, operator_id, technology_id, vendor_id, is_active)
     VALUES (:kpiId, :expr, :op, :tech, :vendor, 1)`,
    { kpiId, expr: expression, op: operatorId || null, tech: technologyId || null, vendor: vendorId || null }
  );
  return (await query(
    `SELECT f.*, o.operator_name, t.tech_key
       FROM kpi_formulas f
       LEFT JOIN operators o ON o.operator_id = f.operator_id
       LEFT JOIN technologies t ON t.technology_id = f.technology_id
      WHERE f.formula_id = :id`,
    { id: res.insertId }
  ))[0];
}

export { validateFormula };
