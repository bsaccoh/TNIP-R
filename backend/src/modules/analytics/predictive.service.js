import { query } from '../../config/db.js';

/* ── Linear regression helpers ───────────────────────────────────────────── */
function linReg(points) {
  // points: [{x: number, y: number}]
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, r2: 0 };
  const sumX  = points.reduce((s, p) => s + p.x, 0);
  const sumY  = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  // R²
  const meanY = sumY / n;
  const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

function projectValue(reg, daysAhead, lastX) {
  return reg.slope * (lastX + daysAhead) + reg.intercept;
}

function dayIndex(dateStr, baseDate) {
  return Math.round((new Date(dateStr) - baseDate) / 86400000);
}

/* ── KPI Trend & Breach Prediction ──────────────────────────────────────── */
export async function kpiTrends({ operatorId, days = 90, horizonDays = 90 } = {}) {
  const params = { days, operatorId: operatorId || null };
  const where  = operatorId ? 'AND m.operator_id = :operatorId' : '';

  // Pull KPI time-series for each operator+KPI combo
  const rows = await query(`
    SELECT m.operator_id, o.operator_name,
           m.kpi_name, m.technology,
           DATE(m.period_start) AS day,
           AVG(m.value) AS value,
           m.unit
      FROM kpi_measurements m
      JOIN operators o ON o.operator_id = m.operator_id
     WHERE m.period_start >= DATE_SUB(NOW(), INTERVAL :days DAY)
       ${where}
     GROUP BY m.operator_id, m.kpi_name, m.technology, DATE(m.period_start)
     ORDER BY m.operator_id, m.kpi_name, DATE(m.period_start)`, params)
    .catch(() => []);

  // Get compliance thresholds
  const thresholds = await query(`
    SELECT kpi_name, technology, threshold_value, direction
      FROM kpi_thresholds
     WHERE active = 1`)
    .catch(() => []);

  const threshMap = {};
  for (const t of thresholds) {
    threshMap[`${t.kpi_name}|${t.technology || ''}`] = t;
  }

  // Group by operator+kpi+technology
  const groups = {};
  for (const r of rows) {
    const key = `${r.operator_id}|${r.kpi_name}|${r.technology || ''}`;
    if (!groups[key]) groups[key] = { meta: r, points: [] };
    groups[key].points.push({ dayStr: r.day, value: Number(r.value) });
  }

  const baseDate = new Date(); baseDate.setHours(0,0,0,0);
  baseDate.setDate(baseDate.getDate() - days);

  const results = [];
  for (const { meta, points } of Object.values(groups)) {
    if (points.length < 2) continue;
    const xyPoints = points.map((p) => ({
      x: dayIndex(p.dayStr, baseDate),
      y: p.value,
    }));
    const reg    = linReg(xyPoints);
    const lastX  = xyPoints[xyPoints.length - 1].x;
    const lastY  = points[points.length - 1].value;
    const proj30 = projectValue(reg, 30, lastX);
    const proj60 = projectValue(reg, 60, lastX);
    const proj90 = projectValue(reg, 90, lastX);

    const tkey  = `${meta.kpi_name}|${meta.technology || ''}`;
    const thresh = threshMap[tkey] || threshMap[`${meta.kpi_name}|`];

    let breachRisk = null;
    let daysToBreachEst = null;
    if (thresh) {
      const tv    = Number(thresh.threshold_value);
      const dir   = thresh.direction; // 'above' means value must stay above threshold
      const slope = reg.slope;

      if (dir === 'above' && slope < 0) {
        // trending down — will it fall below threshold?
        const gapToBreachY = lastY - tv;
        if (gapToBreachY > 0 && Math.abs(slope) > 0) {
          daysToBreachEst = Math.ceil(gapToBreachY / Math.abs(slope));
        }
      } else if (dir === 'below' && slope > 0) {
        // trending up — will it exceed threshold?
        const gapToBreachY = tv - lastY;
        if (gapToBreachY > 0 && slope > 0) {
          daysToBreachEst = Math.ceil(gapToBreachY / slope);
        }
      }

      if (daysToBreachEst !== null) {
        breachRisk = daysToBreachEst <= 30  ? 'HIGH'
                   : daysToBreachEst <= 90  ? 'MEDIUM'
                   : 'LOW';
      }
    }

    results.push({
      operatorId:   meta.operator_id,
      operatorName: meta.operator_name,
      kpiName:      meta.kpi_name,
      technology:   meta.technology,
      unit:         meta.unit,
      dataPoints:   points.length,
      lastValue:    +lastY.toFixed(3),
      slope:        +reg.slope.toFixed(4),
      r2:           +reg.r2.toFixed(3),
      trend:        reg.slope > 0.01 ? 'UP' : reg.slope < -0.01 ? 'DOWN' : 'FLAT',
      projections:  {
        days30: +proj30.toFixed(3),
        days60: +proj60.toFixed(3),
        days90: +proj90.toFixed(3),
      },
      threshold:        thresh ? Number(thresh.threshold_value) : null,
      thresholdDir:     thresh?.direction || null,
      breachRisk,
      daysToBreachEst,
      history: points.map((p) => ({ date: p.dayStr, value: +p.value.toFixed(3) })),
    });
  }

  // Sort by breach risk priority
  const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, null: 3 };
  results.sort((a, b) => (riskOrder[a.breachRisk] ?? 3) - (riskOrder[b.breachRisk] ?? 3));
  return results;
}

/* ── Operator Health Score ───────────────────────────────────────────────── */
export async function operatorHealthScores() {
  const operators = await query(
    `SELECT operator_id, operator_name FROM operators WHERE status='ACTIVE'`
  );

  const scores = await Promise.all(operators.map(async (op) => {
    const id = op.operator_id;

    // KPI compliance rate (% passing thresholds, last 30 days)
    const kpiComp = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN t.direction='above' AND m.value >= t.threshold_value THEN 1
                 WHEN t.direction='below' AND m.value <= t.threshold_value THEN 1
                 ELSE 0 END) AS passing
        FROM kpi_measurements m
        JOIN kpi_thresholds t ON t.kpi_name = m.kpi_name
          AND (t.technology IS NULL OR t.technology = m.technology)
          AND t.active = 1
       WHERE m.operator_id = :id
         AND m.period_start >= DATE_SUB(NOW(), INTERVAL 30 DAY)`, { id })
      .then((r) => r[0])
      .catch(() => ({ total: 0, passing: 0 }));

    // Active alarms
    const alarmRow = await query(`
      SELECT COUNT(*) AS total,
             SUM(severity='CRITICAL') AS critical
        FROM network_alarms
       WHERE operator_id = :id AND status='ACTIVE'`, { id })
      .then((r) => r[0])
      .catch(() => ({ total: 0, critical: 0 }));

    // Obligation health (% not breached)
    const oblRow = await query(`
      SELECT COUNT(*) AS total,
             SUM(status='BREACHED') AS breached
        FROM license_obligations
       WHERE operator_id = :id`, { id })
      .then((r) => r[0])
      .catch(() => ({ total: 0, breached: 0 }));

    // Active penalties
    const penRow = await query(`
      SELECT COUNT(*) AS open_fines,
             COALESCE(SUM(final_fine),0) AS outstanding
        FROM penalty_assessments
       WHERE operator_id = :id
         AND status IN ('ISSUED','ACKNOWLEDGED','DISPUTED')`, { id })
      .then((r) => r[0])
      .catch(() => ({ open_fines: 0, outstanding: 0 }));

    // Consumer complaints (last 30d)
    const compRow = await query(`
      SELECT COUNT(*) AS total,
             SUM(severity IN ('HIGH','CRITICAL')) AS serious
        FROM consumer_complaints
       WHERE operator_id = :id
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`, { id })
      .then((r) => r[0])
      .catch(() => ({ total: 0, serious: 0 }));

    // Score calculation (0–100)
    const kpiPct   = kpiComp.total > 0 ? (kpiComp.passing / kpiComp.total) * 100 : 100;
    const oblPct   = oblRow.total  > 0 ? ((oblRow.total - oblRow.breached) / oblRow.total) * 100 : 100;
    const alarmPen = Math.min(30, (alarmRow.critical || 0) * 10 + (alarmRow.total || 0) * 2);
    const compPen  = Math.min(20, (compRow.serious || 0) * 5 + (compRow.total || 0));
    const finePen  = Math.min(10, (penRow.open_fines || 0) * 3);

    const score = Math.max(0, Math.round(
      kpiPct * 0.40 + oblPct * 0.30 - alarmPen - compPen - finePen
    ));

    const grade = score >= 85 ? 'A'
                : score >= 70 ? 'B'
                : score >= 55 ? 'C'
                : score >= 40 ? 'D'
                : 'F';

    return {
      operatorId:       id,
      operatorName:     op.operator_name,
      score,
      grade,
      components: {
        kpiCompliance:     +kpiPct.toFixed(1),
        obligationHealth:  +oblPct.toFixed(1),
        activeAlarms:      Number(alarmRow.total),
        criticalAlarms:    Number(alarmRow.critical || 0),
        openFines:         Number(penRow.open_fines),
        outstandingAmount: Number(penRow.outstanding),
        complaints30d:     Number(compRow.total),
        seriousComplaints: Number(compRow.serious || 0),
      },
    };
  }));

  return scores.sort((a, b) => a.score - b.score); // worst first
}

/* ── Obligation risk watchlist ───────────────────────────────────────────── */
export async function obligationRiskWatchlist() {
  const obligations = await query(`
    SELECT o.obligation_id, o.obligation_ref, o.operator_id, op.operator_name,
           o.title, o.obligation_type AS type, o.status, o.target_value, o.current_value,
           o.target_unit AS unit, o.due_date, o.breach_severity AS severity
      FROM license_obligations o
      JOIN operators op ON op.operator_id = o.operator_id
     WHERE o.status IN ('PENDING','ON_TRACK','AT_RISK')
       AND o.due_date IS NOT NULL
     ORDER BY o.due_date ASC
     LIMIT 50`).catch(() => []);

  return obligations.map((obl) => {
    const daysLeft = obl.due_date
      ? Math.ceil((new Date(obl.due_date) - new Date()) / 86400000)
      : null;
    const progress = obl.target_value > 0 && obl.current_value != null
      ? Math.min(100, (obl.current_value / obl.target_value) * 100)
      : null;

    // Required daily rate to meet target
    const remaining = obl.target_value && obl.current_value != null
      ? obl.target_value - obl.current_value : null;
    const requiredRate = remaining != null && daysLeft > 0
      ? (remaining / daysLeft).toFixed(2) : null;

    const risk = daysLeft !== null && daysLeft <= 14 ? 'CRITICAL'
               : daysLeft !== null && daysLeft <= 30 ? 'HIGH'
               : daysLeft !== null && daysLeft <= 60 ? 'MEDIUM'
               : 'LOW';

    return { ...obl, daysLeft, progress, requiredRate, risk };
  }).sort((a, b) => {
    const rOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (rOrder[a.risk] ?? 4) - (rOrder[b.risk] ?? 4);
  });
}

/* ── Summary for dashboard ───────────────────────────────────────────────── */
export async function predictiveSummary() {
  const [trends, scores, watchlist] = await Promise.all([
    kpiTrends({ days: 90 }),
    operatorHealthScores(),
    obligationRiskWatchlist(),
  ]);

  const highRiskTrends = trends.filter((t) => t.breachRisk === 'HIGH');
  const critObl = watchlist.filter((o) => o.risk === 'CRITICAL');
  const worstOp = scores[0];
  const avgScore = scores.length
    ? Math.round(scores.reduce((s, o) => s + o.score, 0) / scores.length)
    : null;

  return {
    highRiskKpis:    highRiskTrends.length,
    criticalObls:    critObl.length,
    avgHealthScore:  avgScore,
    worstOperator:   worstOp ? { name: worstOp.operatorName, score: worstOp.score, grade: worstOp.grade } : null,
  };
}
