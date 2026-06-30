import { query } from '../../config/db.js';

/** Normalize a KPI value to a 0..100 "goodness" score. */
function normalize(value, direction, unit) {
  if (value == null) return null;
  if (direction === 'LOWER_BETTER') {
    // For % rates (drop, util): lower is better. Map to 100 - value, floored at 0.
    return Math.max(0, 100 - value);
  }
  // HIGHER_BETTER: percentages cap at 100; throughput-like units scaled loosely.
  if (unit === '%') return Math.min(100, value);
  return Math.min(100, value); // good enough for slice; tune per-KPI later
}

/**
 * Compute composite QoS rankings for the latest monthly period and store them.
 * Uses the active ranking_configurations weights.
 */
export async function computeRankings(granularity = 'MONTH') {
  const weights = await query(
    `SELECT w.kpi_id, w.weight, k.kpi_key, k.direction, k.unit
       FROM ranking_weights w
       JOIN ranking_configurations rc ON rc.config_id = w.config_id AND rc.is_active = 1
       JOIN kpi_definitions k ON k.kpi_id = w.kpi_id`
  );
  if (!weights.length) return { ranked: 0, message: 'No active ranking config' };

  const periodRow = await query(
    `SELECT MAX(DATE_FORMAT(ts,'%Y-%m')) AS period FROM calculated_kpis WHERE granularity='DAY'`
  );
  const period = periodRow[0]?.period;
  if (!period) return { ranked: 0, message: 'No KPI data' };

  const agg = await query(
    `SELECT operator_id, kpi_id, AVG(value) AS value
       FROM calculated_kpis
      WHERE granularity='DAY' AND DATE_FORMAT(ts,'%Y-%m') = :period
      GROUP BY operator_id, kpi_id`,
    { period }
  );

  // operator -> { kpi_id: value }
  const byOp = new Map();
  for (const r of agg) {
    if (!byOp.has(r.operator_id)) byOp.set(r.operator_id, {});
    byOp.get(r.operator_id)[r.kpi_id] = r.value;
  }

  const scores = [];
  for (const [operatorId, kpis] of byOp.entries()) {
    let weighted = 0;
    let wsum = 0;
    for (const w of weights) {
      const v = kpis[w.kpi_id];
      const norm = normalize(v, w.direction, w.unit);
      if (norm == null) continue;
      weighted += norm * w.weight;
      wsum += w.weight;
    }
    if (wsum === 0) continue;
    scores.push({ operatorId, score: weighted / wsum });
  }

  scores.sort((a, b) => b.score - a.score);

  let ranked = 0;
  for (let i = 0; i < scores.length; i++) {
    const { operatorId, score } = scores[i];
    const position = i + 1;
    // Trend vs previous stored ranking.
    const prev = await query(
      `SELECT rank_position FROM operator_rankings
        WHERE operator_id=:op AND granularity=:g AND period < :period
        ORDER BY period DESC LIMIT 1`,
      { op: operatorId, g: granularity, period }
    );
    let trend = 'FLAT';
    if (prev[0]) {
      if (position < prev[0].rank_position) trend = 'UP';
      else if (position > prev[0].rank_position) trend = 'DOWN';
    }
    await query(
      `INSERT INTO operator_rankings (operator_id, period, granularity, qos_score, rank_position, trend)
       VALUES (:op, :period, :g, :score, :pos, :trend)
       ON DUPLICATE KEY UPDATE qos_score=:score, rank_position=:pos, trend=:trend`,
      { op: operatorId, period, g: granularity, score, pos: position, trend }
    );
    ranked++;
  }
  return { ranked, period };
}

export async function currentRankings() {
  return query(
    `SELECT o.operator_name, r.qos_score, r.rank_position, r.trend, r.period
       FROM operator_rankings r JOIN operators o ON o.operator_id=r.operator_id
      WHERE r.period = (SELECT MAX(period) FROM operator_rankings)
      ORDER BY r.rank_position`
  );
}
