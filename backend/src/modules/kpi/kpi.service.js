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
  // 1. Fetch cell-level statistics for distribution (min/max/stddev)
  const cellStats = await query(
    `SELECT o.operator_id, o.operator_name,
            k.kpi_id, k.kpi_key, k.name AS kpi_name, k.unit, k.category, k.direction,
            t.tech_key,
            COUNT(*) AS cell_count,
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
               k.kpi_id, k.kpi_key, k.name, k.unit, k.category, k.direction,
               t.tech_key, cr.status, cr.required_value, qt.comparator
      ORDER BY o.operator_name, k.category, k.kpi_key`
  );

  // 2. Fetch network-level raw counters dynamically to replace "average of averages"
  const formulas = await query(
    `SELECT f.formula_id, f.kpi_id, f.expression, k.kpi_key
       FROM kpi_formulas f
       JOIN kpi_definitions k ON k.kpi_id = f.kpi_id
      WHERE f.is_active = 1`
  );
  const { extractCounterKeys, evaluateFormula } = await import('./formulaEvaluator.js');
  formulas.forEach((f) => { f.counterKeys = extractCounterKeys(f.expression); });
  const neededKeys = [...new Set(formulas.flatMap(f => f.counterKeys))];

  let rawOpMap = new Map();
  if (neededKeys.length > 0) {
    const rawCounters = await query(
      `SELECT o.operator_id, cd.counter_key, SUM(cv.value) AS sum_val
         FROM counter_values cv
         JOIN pm_files p ON p.pm_file_id = cv.pm_file_id
         JOIN operators o ON o.operator_id = p.operator_id
         JOIN counter_definitions cd ON cd.counter_id = cv.counter_id
        WHERE cd.counter_key IN (:keys)
        GROUP BY o.operator_id, cd.counter_key`,
      { keys: neededKeys }
    );
    for (const row of rawCounters) {
      if (!rawOpMap.has(row.operator_id)) rawOpMap.set(row.operator_id, new Map());
      rawOpMap.get(row.operator_id).set(row.counter_key, Number(row.sum_val));
    }
  }

  // 3. Patch cellStats with true avg_value
  for (const stat of cellStats) {
    const f = formulas.find(f => f.kpi_id === stat.kpi_id);
    let avg_value = null;
    if (f && rawOpMap.has(stat.operator_id)) {
      const counters = rawOpMap.get(stat.operator_id);
      if (f.counterKeys.every(k => counters.has(k))) {
        try {
          const val = evaluateFormula(f.expression, counters);
          if (val != null && !isNaN(val)) avg_value = Number(val.toFixed(4));
        } catch (e) {}
      }
    }
    // Fallback to 0 if we couldn't evaluate it
    stat.avg_value = avg_value ?? 0;
  }

  return cellStats;
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
  const opFilter = operatorId ? 'AND p.operator_id = :op' : '';
  const techFilter = technologyId ? 'AND p.technology_id = :tid' : '';
  const fromFilter = from ? 'AND cv.ts >= :from' : '';
  const toFilter = to ? 'AND cv.ts <= :to' : '';

  const formulas = await query(
    `SELECT f.formula_id, f.kpi_id, f.expression, k.kpi_key, k.name AS kpi_name, k.unit, k.category, k.direction
       FROM kpi_formulas f
       JOIN kpi_definitions k ON k.kpi_id = f.kpi_id
      WHERE f.is_active = 1
        ${technologyId ? 'AND (f.technology_id = :tid OR f.technology_id IS NULL)' : ''}
        ${operatorId ? 'AND (f.operator_id = :op OR f.operator_id IS NULL)' : ''}`,
    {
      ...(operatorId ? { op: operatorId } : {}),
      ...(technologyId ? { tid: technologyId } : {}),
    }
  );

  if (!formulas.length) return [];
  const { extractCounterKeys, evaluateFormula } = await import('./formulaEvaluator.js');
  formulas.forEach((f) => { f.counterKeys = extractCounterKeys(f.expression); });

  const neededKeys = [...new Set(formulas.flatMap(f => f.counterKeys))];
  if (!neededKeys.length) return [];

  const rawCounters = await query(
    `SELECT DATE(cv.ts) AS day, o.operator_id, o.operator_name, cd.counter_key, SUM(cv.value) AS sum_val
       FROM counter_values cv
       JOIN pm_files p ON p.pm_file_id = cv.pm_file_id
       JOIN operators o ON o.operator_id = p.operator_id
       JOIN counter_definitions cd ON cd.counter_id = cv.counter_id
      WHERE cd.counter_key IN (:keys)
        ${opFilter} ${techFilter} ${fromFilter} ${toFilter}
      GROUP BY DATE(cv.ts), o.operator_id, o.operator_name, cd.counter_key
      ORDER BY day`,
    {
      keys: neededKeys,
      ...(operatorId ? { op: operatorId } : {}),
      ...(technologyId ? { tid: technologyId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }
  );

  const dayOpMap = new Map();
  for (const row of rawCounters) {
    const k = `${row.day}|${row.operator_id}|${row.operator_name}`;
    if (!dayOpMap.has(k)) dayOpMap.set(k, new Map());
    dayOpMap.get(k).set(row.counter_key, Number(row.sum_val));
  }

  const series = [];
  for (const [keyStr, counters] of dayOpMap.entries()) {
    const [day, opIdStr, opName] = keyStr.split('|');
    const opId = Number(opIdStr);
    for (const f of formulas) {
      if (f.counterKeys.every((k) => counters.has(k))) {
        try {
          const value = evaluateFormula(f.expression, counters);
          if (value != null && !isNaN(value)) {
            series.push({
              operator_id: opId, operator_name: opName,
              kpi_key: f.kpi_key, kpi_name: f.kpi_name, unit: f.unit, category: f.category, direction: f.direction,
              day, value: Number(value.toFixed(4))
            });
          }
        } catch (e) {}
      }
    }
  }

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
      kpiMap[row.kpi_key] = {
        kpi_key: row.kpi_key, kpi_name: row.kpi_name, unit: row.unit,
        category: row.category || 'General', direction: row.direction || 'HIGHER_BETTER',
        operators: {},
      };
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

/** PASS/WARN/FAIL for a value against a qos_thresholds row (comparator is GTE/LTE/GT/LT). */
function statusFor(value, threshold) {
  if (!threshold || value == null) return 'N/A';
  const req = Number(threshold.required_value);
  const higherBetter = threshold.comparator === 'GTE' || threshold.comparator === 'GT';
  if (higherBetter) {
    if (value >= req) return 'PASS';
    if (value >= req * 0.95) return 'WARN';
    return 'FAIL';
  }
  if (value <= req) return 'PASS';
  if (value <= req * 1.1) return 'WARN';
  return 'FAIL';
}

/**
 * Cross-technology health summary: for each technology (2G/3G/4G/5G), the latest
 * value of every KPI vs its threshold, rolled up into a PASS/WARN/FAIL compliance
 * score overall and per operator. Powers technology/operator comparison views.
 */
export async function technologyHealthSummary({ operatorId, from, to }) {
  const techs = Object.keys(TECH_ID);
  const emptyCounts = () => ({ PASS: 0, WARN: 0, FAIL: 0, 'N/A': 0 });
  const scoreOf = (c) => {
    const total = c.PASS + c.WARN + c.FAIL;
    return total ? Math.round((c.PASS / total) * 1000) / 10 : null;
  };

  const result = {};
  for (const tech of techs) {
    const kpis = await pmKpiTimeSeries({ operatorId, technology: tech, from, to });
    const counts = emptyCounts();
    const byOperator = {};
    for (const kpi of kpis) {
      for (const op of kpi.operators) {
        const last = op.series.length ? op.series[op.series.length - 1].value : null;
        const status = statusFor(last, kpi.threshold);
        counts[status]++;
        if (!byOperator[op.operator_id]) {
          byOperator[op.operator_id] = { operator_id: op.operator_id, operator_name: op.operator_name, counts: emptyCounts() };
        }
        byOperator[op.operator_id].counts[status]++;
      }
    }
    result[tech] = {
      score: scoreOf(counts),
      counts,
      operators: Object.values(byOperator).map((o) => ({ ...o, score: scoreOf(o.counts) })),
    };
  }
  return result;
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
