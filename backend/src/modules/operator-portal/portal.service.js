import { query } from '../../config/db.js';

/**
 * Aggregated self-service overview for a single operator.
 * All queries are scoped to operatorId — safe to expose to OPERATOR_USER.
 */
export async function operatorOverview(operatorId) {
  const [
    opRow,
    compliance,
    uploads,
    ranking,
    enforcement,
    kpis,
    disputes,
  ] = await Promise.all([

    // Operator profile
    query(`SELECT operator_id, operator_name, status, contact_email, license_number, created_at
             FROM operators WHERE operator_id = :op`, { op: operatorId }),

    // Compliance summary (latest period)
    query(`SELECT cr.status, COUNT(*) AS count, cr.period
             FROM compliance_results cr
            WHERE cr.operator_id = :op
              AND cr.period = (SELECT MAX(period) FROM compliance_results WHERE operator_id = :op)
            GROUP BY cr.status, cr.period`, { op: operatorId }),

    // Recent PM uploads (last 10)
    query(`SELECT pm_file_id, file_name, status, upload_date, record_count
             FROM pm_files
            WHERE operator_id = :op
            ORDER BY upload_date DESC LIMIT 10`, { op: operatorId }),

    // Latest ranking
    query(`SELECT qos_score, rank_position, trend, period
             FROM operator_rankings
            WHERE operator_id = :op
            ORDER BY period DESC LIMIT 1`, { op: operatorId }),

    // Open enforcement cases
    query(`SELECT case_id, case_ref, title, severity, status, deadline, created_at
             FROM enforcement_cases
            WHERE operator_id = :op
              AND status NOT IN ('RESOLVED','CLOSED')
            ORDER BY FIELD(severity,'CRITICAL','HIGH','MEDIUM','LOW'), created_at DESC
            LIMIT 10`, { op: operatorId }),

    // Top 5 KPI values (latest)
    query(`SELECT k.kpi_key, k.name AS kpi_name, k.unit, k.direction,
                  ck.value, ck.ts,
                  t.required_value, t.comparator,
                  CASE
                    WHEN t.comparator='GTE' AND ck.value >= t.required_value THEN 'PASS'
                    WHEN t.comparator='LTE' AND ck.value <= t.required_value THEN 'PASS'
                    WHEN t.comparator='GTE' AND ck.value >= t.required_value - IFNULL(t.warning_margin,0) THEN 'WARNING'
                    WHEN t.comparator='LTE' AND ck.value <= t.required_value + IFNULL(t.warning_margin,0) THEN 'WARNING'
                    ELSE 'FAIL'
                  END AS status
             FROM calculated_kpis ck
             JOIN kpi_definitions k ON k.kpi_id = ck.kpi_id
             LEFT JOIN qos_thresholds t ON t.kpi_id = ck.kpi_id AND t.is_active = 1
                       AND (t.operator_id IS NULL OR t.operator_id = :op)
            WHERE ck.operator_id = :op
              AND ck.granularity = 'DAY'
              AND ck.ts = (SELECT MAX(ts) FROM calculated_kpis WHERE kpi_id = ck.kpi_id AND operator_id = :op)
            ORDER BY k.kpi_key
            LIMIT 10`, { op: operatorId }),

    // Open disputes raised by this operator
    query(`SELECT dispute_id, title, status, created_at
             FROM operator_disputes
            WHERE operator_id = :op
              AND status NOT IN ('ACCEPTED','REJECTED')
            ORDER BY created_at DESC LIMIT 5`
      , { op: operatorId }).catch(() => []),  // table may not exist yet
  ]);

  const op = opRow[0] ?? null;
  const compliancePeriod = compliance[0]?.period ?? null;
  const complianceMap = { PASS: 0, WARNING: 0, FAIL: 0 };
  for (const r of compliance) complianceMap[r.status] = Number(r.count);
  const total = complianceMap.PASS + complianceMap.WARNING + complianceMap.FAIL;
  const complianceRate = total ? Math.round((complianceMap.PASS / total) * 100) : null;

  return {
    operator: op,
    compliance: { ...complianceMap, total, rate: complianceRate, period: compliancePeriod },
    ranking:    ranking[0] ?? null,
    kpis,
    recentUploads:    uploads,
    enforcementCases: enforcement,
    openDisputes:     disputes,
  };
}
