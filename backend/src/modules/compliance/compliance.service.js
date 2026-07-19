import { query } from '../../config/db.js';

/** Decide PASS / WARNING / FAIL given a value, comparator, required and warning margin. */
export function classify(value, comparator, required, margin = 0) {
  if (value == null) return null;
  const meets =
    comparator === 'GTE' ? value >= required :
    comparator === 'LTE' ? value <= required :
    comparator === 'GT'  ? value >  required :
    /* LT */               value <  required;
  if (meets) return 'PASS';

  // Within warning margin of the threshold?
  const within =
    (comparator === 'GTE' || comparator === 'GT') ? value >= required - margin :
    value <= required + margin;
  return within ? 'WARNING' : 'FAIL';
}

async function activeThresholds() {
  return query(
    `SELECT t.threshold_id, t.kpi_id, t.comparator, t.required_value, t.warning_margin,
            t.technology_id, t.operator_id, k.kpi_key
       FROM qos_thresholds t JOIN kpi_definitions k ON k.kpi_id = t.kpi_id
      WHERE t.is_active = 1 AND t.effective_from <= CURDATE()
        AND (t.effective_to IS NULL OR t.effective_to >= CURDATE())`
  );
}

/** Pick the most specific threshold for a kpi/operator/technology (operator-specific > global). */
function selectThreshold(thresholds, kpiId, operatorId, technologyId) {
  const candidates = thresholds.filter((t) => t.kpi_id === kpiId &&
    (t.operator_id == null || t.operator_id === operatorId) &&
    (t.technology_id == null || t.technology_id === technologyId));
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const opDiff = (b.operator_id ? 1 : 0) - (a.operator_id ? 1 : 0);
    if (opDiff !== 0) return opDiff;
    return (b.technology_id ? 1 : 0) - (a.technology_id ? 1 : 0);
  });
  return candidates[0];
}

/**
 * Evaluate compliance for one operator across all monthly periods present in
 * calculated_kpis. Upserts compliance_results and raises alerts on WARNING/FAIL.
 */
export async function evaluateOperatorPeriod(operatorId) {
  const thresholds = await activeThresholds();
  const aggregates = await query(
    `SELECT DATE_FORMAT(ts, '%Y-%m') AS period, kpi_id, technology_id, AVG(value) AS value
       FROM calculated_kpis
      WHERE operator_id = :op AND granularity = 'DAY'
      GROUP BY period, kpi_id, technology_id`,
    { op: operatorId }
  );

  let evaluated = 0;
  const summary = { PASS: 0, WARNING: 0, FAIL: 0 };
  for (const row of aggregates) {
    const th = selectThreshold(thresholds, row.kpi_id, operatorId, row.technology_id);
    if (!th) continue;
    const status = classify(row.value, th.comparator, th.required_value, th.warning_margin);
    if (!status) continue;

    await query(
      `INSERT INTO compliance_results
         (operator_id, kpi_id, threshold_id, technology_id, period, granularity, value, required_value, status)
       VALUES (:op, :kpi, :th, :tech, :period, 'MONTH', :value, :req, :status)
       ON DUPLICATE KEY UPDATE value=:value, required_value=:req, status=:status,
         threshold_id=:th, evaluated_at=NOW()`,
      { op: operatorId, kpi: row.kpi_id, th: th.threshold_id, tech: row.technology_id,
        period: row.period, value: row.value, req: th.required_value, status }
    );
    evaluated++;
    summary[status]++;

    if (status !== 'PASS') {
      const rows = await query(
        `SELECT compliance_id FROM compliance_results
          WHERE operator_id=:op AND kpi_id=:kpi AND technology_id=:tech AND period=:period`,
        { op: operatorId, kpi: row.kpi_id, tech: row.technology_id, period: row.period }
      );
      if (rows[0]) {
        await query(
          `INSERT INTO compliance_alerts (compliance_id, operator_id, severity, message)
           VALUES (:cid, :op, :sev, :msg)`,
          { cid: rows[0].compliance_id, op: operatorId,
            sev: status === 'FAIL' ? 'VIOLATION' : 'WARNING',
            msg: `${th.kpi_key} ${status} for ${row.period}: ${row.value?.toFixed(2)} vs required ${th.required_value}` }
        );
      }
    }
  }
  return { evaluated, ...summary };
}

/** Compliance matrix: operators × KPIs for a period (default latest). */
export async function complianceMatrix(period) {
  const periodClause = period
    ? 'AND cr.period = :period'
    : `AND cr.period = (SELECT MAX(period) FROM compliance_results)`;
  return query(
    `SELECT cr.operator_id, o.operator_name, k.kpi_key, k.name AS kpi_name, k.unit,
            cr.period, cr.value, cr.required_value, cr.status
       FROM compliance_results cr
       JOIN operators o ON o.operator_id = cr.operator_id
       JOIN kpi_definitions k ON k.kpi_id = cr.kpi_id
      WHERE 1=1 ${periodClause}
      ORDER BY o.operator_name, k.kpi_key`,
    period ? { period } : {}
  );
}

export async function complianceSummary(operatorId) {
  const where = operatorId != null ? 'WHERE operator_id = :op' : '';
  return query(
    `SELECT status, COUNT(*) AS count FROM compliance_results ${where} GROUP BY status`,
    operatorId != null ? { op: operatorId } : {}
  );
}

export async function listAlerts({ operatorId, limit = 50 }) {
  const where = operatorId != null ? 'WHERE a.operator_id = :op' : '';
  return query(
    `SELECT a.alert_id, a.operator_id, o.operator_name, a.severity, a.message, a.acknowledged, a.created_at
       FROM compliance_alerts a JOIN operators o ON o.operator_id = a.operator_id
       ${where} ORDER BY a.created_at DESC LIMIT :limit`,
    operatorId != null ? { op: operatorId, limit } : { limit }
  );
}
