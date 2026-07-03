import { query } from '../../config/db.js';

/* ── Template catalogue ──────────────────────────────────────────────────── */
export const TEMPLATES = [
  {
    id:          'monthly-qos',
    title:       'Monthly QoS Compliance Report',
    description: 'KPI compliance rates per operator and technology against licensed thresholds. Suitable for monthly submission to senior management and public disclosure.',
    sections:    ['Executive Summary', 'KPI Compliance Matrix', 'Operator Scorecards', 'Threshold Violations', 'Recommendations'],
    icon:        'BarChart',
    category:    'QoS',
  },
  {
    id:          'quarterly-spectrum',
    title:       'Quarterly Spectrum Utilization Report',
    description: 'Spectrum assignment inventory, bandwidth utilization, interference incidents, and expiry watchlist. Required for ITU and ECOWAS spectrum filing.',
    sections:    ['Spectrum Overview', 'Band Summary', 'Operator Assignments', 'Interference Incidents', 'Expiry Watchlist'],
    icon:        'SignalCellularAlt',
    category:    'Spectrum',
  },
  {
    id:          'annual-compliance',
    title:       'Annual Regulatory Compliance Summary',
    description: 'Holistic compliance picture: license obligations, penalty assessments, enforcement actions, and dispute outcomes across all operators for the year.',
    sections:    ['Overview', 'License Obligations Status', 'Penalty Assessments', 'Enforcement Actions', 'Dispute Resolution', 'Recommendations'],
    icon:        'Gavel',
    category:    'Compliance',
  },
  {
    id:          'consumer-qoe',
    title:       'Consumer Quality of Experience Report',
    description: 'Crowdsourced complaint analysis: issue types, district hotspots, resolution rates, and operator comparison. For consumer protection filings.',
    sections:    ['QoE Summary', 'Complaint Trends', 'Issue Type Analysis', 'Operator Comparison', 'Geographic Distribution', 'Open Issues'],
    icon:        'SentimentVeryDissatisfied',
    category:    'Consumer',
  },
  {
    id:          'drive-test-summary',
    title:       'Drive Test Campaign Report',
    description: 'Aggregated field measurement results from drive test campaigns: signal quality, coverage compliance, throughput benchmarks, and route breakdown.',
    sections:    ['Campaign Overview', 'Signal Quality Summary', 'Coverage Compliance', 'Throughput Analysis', 'Per-Test Breakdown'],
    icon:        'Route',
    category:    'Drive Test',
  },
];

/* ── Data fetchers per template ──────────────────────────────────────────── */
export async function fetchTemplateData(templateId, { from, to, operatorId } = {}) {
  const dateFrom = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const dateTo   = to   || new Date().toISOString().slice(0, 10);
  const p        = { from: dateFrom, to: dateTo, operatorId: operatorId || null };

  switch (templateId) {
    case 'monthly-qos':      return fetchMonthlyQoS(p);
    case 'quarterly-spectrum': return fetchSpectrum(p);
    case 'annual-compliance': return fetchAnnualCompliance(p);
    case 'consumer-qoe':     return fetchConsumerQoE(p);
    case 'drive-test-summary': return fetchDriveTest(p);
    default: throw new Error(`Unknown template: ${templateId}`);
  }
}

/* ── Monthly QoS ─────────────────────────────────────────────────────────── */
async function fetchMonthlyQoS({ from, to, operatorId }) {
  const opFilter = operatorId ? 'AND m.operator_id = :operatorId' : '';

  const kpiRows = await query(`
    SELECT o.operator_name, m.kpi_name, m.technology,
           AVG(m.value) AS avg_val, MIN(m.value) AS min_val, MAX(m.value) AS max_val,
           COUNT(*) AS measurements,
           t.threshold_value, t.direction, t.unit,
           SUM(CASE
             WHEN t.direction='above' AND m.value >= t.threshold_value THEN 1
             WHEN t.direction='below' AND m.value <= t.threshold_value THEN 1
             ELSE 0 END) AS passing,
           COUNT(*) AS total
      FROM kpi_measurements m
      JOIN operators o ON o.operator_id = m.operator_id
      JOIN kpi_thresholds t ON t.kpi_name = m.kpi_name
        AND (t.technology IS NULL OR t.technology = m.technology)
        AND t.active = 1
     WHERE m.period_start BETWEEN :from AND :to ${opFilter}
     GROUP BY o.operator_name, m.kpi_name, m.technology, t.threshold_value, t.direction, t.unit
     ORDER BY o.operator_name, m.kpi_name`, { from, to, operatorId }).catch(() => []);

  const operators = await query(`SELECT operator_name FROM operators WHERE status='ACTIVE' ORDER BY operator_name`).catch(() => []);

  // Summary stats
  const totalMeasurements = kpiRows.reduce((s, r) => s + Number(r.total), 0);
  const totalPassing      = kpiRows.reduce((s, r) => s + Number(r.passing), 0);
  const overallCompliance = totalMeasurements > 0 ? ((totalPassing / totalMeasurements) * 100).toFixed(1) : '—';

  const violations = kpiRows.filter((r) => (Number(r.passing) / Number(r.total)) < 0.8);

  return {
    from, to, operators: operators.map((o) => o.operator_name),
    overallCompliance, totalMeasurements, totalPassing,
    kpiRows: kpiRows.map((r) => ({
      ...r,
      avg_val: +Number(r.avg_val).toFixed(3),
      min_val: +Number(r.min_val).toFixed(3),
      max_val: +Number(r.max_val).toFixed(3),
      compliance_pct: r.total > 0 ? +((r.passing / r.total) * 100).toFixed(1) : 0,
    })),
    violations: violations.map((r) => ({
      operator: r.operator_name, kpi: r.kpi_name, technology: r.technology,
      compliance_pct: +((r.passing / r.total) * 100).toFixed(1),
      threshold: r.threshold_value, unit: r.unit,
    })),
  };
}

/* ── Quarterly Spectrum ──────────────────────────────────────────────────── */
async function fetchSpectrum({ from, to }) {
  const assignments = await query(`
    SELECT sa.*, o.operator_name,
           DATEDIFF(sa.expiry_date, CURDATE()) AS days_to_expiry
      FROM spectrum_assignments sa
      JOIN operators o ON o.operator_id = sa.operator_id
     ORDER BY sa.band_name, sa.frequency_low`).catch(() => []);

  const bands = await query(`
    SELECT band_name,
           COUNT(*) AS total, SUM(status='ACTIVE') AS active,
           SUM(bandwidth_mhz) AS total_bw,
           COUNT(DISTINCT operator_id) AS operators,
           GROUP_CONCAT(DISTINCT technology ORDER BY technology) AS technologies
      FROM spectrum_assignments
     GROUP BY band_name ORDER BY MIN(frequency_low)`).catch(() => []);

  const interference = await query(`
    SELECT si.*, r.operator_name AS reporter_name, a.operator_name AS affected_name
      FROM spectrum_interference si
      LEFT JOIN operators r ON r.operator_id = si.reporter_op_id
      LEFT JOIN operators a ON a.operator_id = si.affected_op_id
     WHERE si.reported_at BETWEEN :from AND :to
     ORDER BY si.severity DESC`, { from, to }).catch(() => []);

  const expiring = assignments.filter((a) => a.status === 'ACTIVE' && a.days_to_expiry != null && a.days_to_expiry <= 180);

  return { from, to, assignments, bands, interference, expiring };
}

/* ── Annual Compliance ───────────────────────────────────────────────────── */
async function fetchAnnualCompliance({ from, to, operatorId }) {
  const opFilter = operatorId ? 'AND o.operator_id = :operatorId' : '';

  const obligations = await query(`
    SELECT lo.*, op.operator_name
      FROM license_obligations lo
      JOIN operators op ON op.operator_id = lo.operator_id
     WHERE 1=1 ${opFilter.replace('o.', 'lo.')}
     ORDER BY lo.status, op.operator_name`, { operatorId }).catch(() => []);

  const penalties = await query(`
    SELECT pa.*, op.operator_name
      FROM penalty_assessments pa
      JOIN operators op ON op.operator_id = pa.operator_id
     WHERE COALESCE(pa.issued_at, pa.created_at) BETWEEN :from AND :to ${opFilter.replace('o.', 'pa.')}
       AND pa.status <> 'DRAFT'
     ORDER BY COALESCE(pa.issued_at, pa.created_at) DESC`, { from, to, operatorId }).catch(() => []);

  const enforcement = await query(`
    SELECT ec.*, op.operator_name
      FROM enforcement_cases ec
      JOIN operators op ON op.operator_id = ec.operator_id
     WHERE ec.created_at BETWEEN :from AND :to ${opFilter.replace('o.', 'ec.')}
     ORDER BY ec.created_at DESC`, { from, to, operatorId }).catch(() => []);

  const disputes = await query(`
    SELECT d.*, op.operator_name
      FROM operator_disputes d
      JOIN operators op ON op.operator_id = d.operator_id
     WHERE d.created_at BETWEEN :from AND :to ${opFilter.replace('o.', 'd.')}
     ORDER BY d.created_at DESC`, { from, to, operatorId }).catch(() => []);

  const oblSummary = {
    total:      obligations.length,
    compliant:  obligations.filter((o) => o.status === 'FULFILLED').length,
    breached:   obligations.filter((o) => o.status === 'BREACHED').length,
    atRisk:     obligations.filter((o) => o.status === 'AT_RISK').length,
    pending:    obligations.filter((o) => o.status === 'PENDING').length,
  };

  const penSummary = {
    total:       penalties.length,
    totalAmount: penalties.reduce((s, p) => s + Number(p.final_fine || 0), 0),
    paid:        penalties.filter((p) => p.status === 'PAID').length,
    outstanding: penalties.filter((p) => ['ISSUED','ACKNOWLEDGED','DISPUTED'].includes(p.status)).length,
  };

  return { from, to, obligations, penalties, enforcement, disputes, oblSummary, penSummary };
}

/* ── Consumer QoE ────────────────────────────────────────────────────────── */
async function fetchConsumerQoE({ from, to, operatorId }) {
  const opFilter = operatorId ? 'AND cc.operator_id = :operatorId' : '';

  const complaints = await query(`
    SELECT cc.*, o.operator_name
      FROM consumer_complaints cc
      LEFT JOIN operators o ON o.operator_id = cc.operator_id
     WHERE cc.created_at BETWEEN :from AND :to ${opFilter}
     ORDER BY cc.created_at DESC`, { from, to, operatorId }).catch(() => []);

  const byOperator = await query(`
    SELECT o.operator_name,
           COUNT(*) AS total,
           SUM(cc.severity IN ('HIGH','CRITICAL')) AS serious,
           SUM(cc.status = 'RESOLVED') AS resolved,
           SUM(cc.status = 'NEW') AS new_count
      FROM consumer_complaints cc
      LEFT JOIN operators o ON o.operator_id = cc.operator_id
     WHERE cc.created_at BETWEEN :from AND :to ${opFilter}
     GROUP BY o.operator_name ORDER BY total DESC`, { from, to, operatorId }).catch(() => []);

  const byIssueType = await query(`
    SELECT issue_type, COUNT(*) AS total,
           SUM(severity IN ('HIGH','CRITICAL')) AS serious
      FROM consumer_complaints
     WHERE created_at BETWEEN :from AND :to ${opFilter.replace('cc.', '')}
     GROUP BY issue_type ORDER BY total DESC`, { from, to, operatorId }).catch(() => []);

  const byDistrict = await query(`
    SELECT district, COUNT(*) AS total
      FROM consumer_complaints
     WHERE created_at BETWEEN :from AND :to AND district IS NOT NULL ${opFilter.replace('cc.', '')}
     GROUP BY district ORDER BY total DESC LIMIT 10`, { from, to, operatorId }).catch(() => []);

  const trend = await query(`
    SELECT DATE(created_at) AS day, COUNT(*) AS total
      FROM consumer_complaints
     WHERE created_at BETWEEN :from AND :to ${opFilter.replace('cc.', '')}
     GROUP BY DATE(created_at) ORDER BY day`, { from, to, operatorId }).catch(() => []);

  return {
    from, to,
    total:       complaints.length,
    resolved:    complaints.filter((c) => c.status === 'RESOLVED').length,
    serious:     complaints.filter((c) => ['HIGH','CRITICAL'].includes(c.severity)).length,
    complaints,  byOperator, byIssueType, byDistrict, trend,
  };
}

/* ── Drive Test ──────────────────────────────────────────────────────────── */
async function fetchDriveTest({ from, to, operatorId }) {
  const opFilter = operatorId ? 'AND dt.operator_id = :operatorId' : '';

  const campaigns = await query(`
    SELECT c.campaign_ref, c.campaign_name, c.status,
           c.planned_start, c.planned_end, c.actual_start, c.actual_end,
           o.operator_name,
           COUNT(DISTINCT ct.drive_test_id) AS test_count,
           COUNT(s.sample_id)  AS sample_count,
           AVG(s.rsrp)         AS avg_rsrp,
           AVG(s.sinr)         AS avg_sinr,
           AVG(s.dl_throughput) AS avg_dl,
           SUM(CASE WHEN s.rsrp >= -100 THEN 1 ELSE 0 END) AS rsrp_pass,
           SUM(CASE WHEN s.dl_throughput >= 1000 THEN 1 ELSE 0 END) AS dl_pass
      FROM dt_campaigns c
      JOIN operators o ON o.operator_id = c.operator_id
      LEFT JOIN dt_campaign_tests ct ON ct.campaign_id = c.campaign_id
      LEFT JOIN drive_tests dt ON dt.drive_test_id = ct.drive_test_id ${opFilter ? 'AND 1=1' : ''}
      LEFT JOIN drive_test_samples s ON s.drive_test_id = dt.drive_test_id
     WHERE (c.planned_start BETWEEN :from AND :to OR c.actual_start BETWEEN :from AND :to)
     GROUP BY c.campaign_id
     ORDER BY c.planned_start DESC`, { from, to, operatorId }).catch(() => []);

  const overallStats = await query(`
    SELECT COUNT(DISTINCT dt.drive_test_id) AS total_tests,
           COUNT(s.sample_id)  AS total_samples,
           AVG(s.rsrp)         AS avg_rsrp,
           AVG(s.sinr)         AS avg_sinr,
           AVG(s.dl_throughput) AS avg_dl,
           SUM(CASE WHEN s.rsrp >= -100 THEN 1 ELSE 0 END) AS rsrp_pass,
           SUM(CASE WHEN s.dl_throughput >= 1000 THEN 1 ELSE 0 END) AS dl_pass,
           COUNT(s.sample_id) AS total
      FROM drive_tests dt
      JOIN operators o ON o.operator_id = dt.operator_id
      LEFT JOIN drive_test_samples s ON s.drive_test_id = dt.drive_test_id
     WHERE dt.test_date BETWEEN :from AND :to ${opFilter}`, { from, to, operatorId })
    .catch(() => [{}]).then((r) => r[0]);

  return {
    from, to,
    campaigns: campaigns.map((c) => ({
      ...c,
      avg_rsrp: c.avg_rsrp ? +Number(c.avg_rsrp).toFixed(2) : null,
      avg_sinr: c.avg_sinr ? +Number(c.avg_sinr).toFixed(2) : null,
      avg_dl:   c.avg_dl   ? +Number(c.avg_dl).toFixed(2)   : null,
      rsrp_compliance: c.sample_count > 0 ? +((c.rsrp_pass / c.sample_count) * 100).toFixed(1) : null,
      dl_compliance:   c.sample_count > 0 ? +((c.dl_pass   / c.sample_count) * 100).toFixed(1) : null,
    })),
    overall: {
      totalTests:   Number(overallStats?.total_tests || 0),
      totalSamples: Number(overallStats?.total_samples || 0),
      avgRsrp:  overallStats?.avg_rsrp ? +Number(overallStats.avg_rsrp).toFixed(2) : null,
      avgSinr:  overallStats?.avg_sinr ? +Number(overallStats.avg_sinr).toFixed(2) : null,
      avgDl:    overallStats?.avg_dl   ? +Number(overallStats.avg_dl).toFixed(2)   : null,
      rsrpCompliance: overallStats?.total > 0
        ? +((overallStats.rsrp_pass / overallStats.total) * 100).toFixed(1) : null,
    },
  };
}
