import { query } from '../../config/db.js';
import { loadConfig } from './scoring.service.js';

export async function getOperatorExecutiveSummary(operatorIdStr) {
  const isAll = operatorIdStr === 'all';
  const operatorId = isAll ? null : (Number(operatorIdStr) || 1);
  const c = await loadConfig();

  let operatorName = 'All Operators';
  if (!isAll) {
    const [operator] = await query('SELECT operator_name FROM operators WHERE operator_id = ?', [operatorId]);
    operatorName = operator?.operator_name || 'Unknown';
  }

  const opFilter = isAll ? '' : 'AND operator_id = ?';
  const opArgs  = isAll ? [] : [operatorId];

  const [overview] = await query(
    `SELECT COUNT(*) AS totalTests,
            COALESCE(SUM(total_samples), 0) AS totalSamples,
            ROUND(COALESCE(SUM(distance_km), 0), 1) AS totalDistance,
            ROUND(AVG(overall_score), 1) AS avgScore
     FROM drive_tests WHERE status = 'COMPLETED' ${opFilter}`, opArgs);

  const opJoinFilter = isAll ? '' : 'AND dt.operator_id = ?';

  const [kpi] = await query(
    `SELECT ROUND(AVG(rsrp), 1) AS avgRsrp, ROUND(MIN(rsrp), 1) AS minRsrp, ROUND(MAX(rsrp), 1) AS maxRsrp,
            ROUND(AVG(rsrq), 1) AS avgRsrq, ROUND(MIN(rsrq), 1) AS minRsrq, ROUND(MAX(rsrq), 1) AS maxRsrq,
            ROUND(AVG(sinr), 1) AS avgSinr, ROUND(MIN(sinr), 1) AS minSinr, ROUND(MAX(sinr), 1) AS maxSinr,
            ROUND(AVG(dl_throughput)/1000, 1) AS avgDlMbps, ROUND(MAX(dl_throughput)/1000, 1) AS maxDlMbps,
            ROUND(AVG(ul_throughput)/1000, 1) AS avgUlMbps, ROUND(MAX(ul_throughput)/1000, 1) AS maxUlMbps,
            COUNT(*) AS totalSamples,
            SUM(CASE WHEN rsrp >= ? THEN 1 ELSE 0 END) AS excellent,
            SUM(CASE WHEN rsrp >= ? AND rsrp < ? THEN 1 ELSE 0 END) AS good,
            SUM(CASE WHEN rsrp >= ? AND rsrp < ? THEN 1 ELSE 0 END) AS fair,
            SUM(CASE WHEN rsrp >= ? AND rsrp < ? THEN 1 ELSE 0 END) AS poor,
            SUM(CASE WHEN rsrp < ? THEN 1 ELSE 0 END) AS noSignal,
            SUM(CASE WHEN rsrp >= ? THEN 1 ELSE 0 END) AS rsrpPass,
            SUM(CASE WHEN sinr >= ? THEN 1 ELSE 0 END) AS sinrPass,
            SUM(CASE WHEN dl_throughput >= ? THEN 1 ELSE 0 END) AS dlPass,
            SUM(CASE WHEN event_type = 'CALL_DROP' THEN 1 ELSE 0 END) AS callDrops,
            SUM(CASE WHEN event_type = 'HANDOVER' THEN 1 ELSE 0 END) AS handovers
     FROM drive_test_samples s
     JOIN drive_tests dt ON dt.drive_test_id = s.drive_test_id
     WHERE dt.status = 'COMPLETED' ${opJoinFilter}`,
    [c.rsrp_excellent,
     c.rsrp_good, c.rsrp_excellent,
     c.rsrp_fair, c.rsrp_good,
     c.rsrp_poor, c.rsrp_fair,
     c.rsrp_poor,
     c.rsrp_threshold, c.sinr_threshold, c.dl_threshold,
     ...opArgs]);

  const total = kpi?.totalSamples || 1;
  const fmt = v => v != null ? Number(v) : 0;
  const pct = (n, d) => d > 0 ? Number(((n / d) * 100).toFixed(1)) : 0;
  const status = (val, target, higher = true) =>
    higher ? (val >= target ? 'Pass' : 'Fail') : (val <= target ? 'Pass' : 'Fail');

  const coveragePct = pct(fmt(kpi?.rsrpPass), total);
  const noSignalPct = pct(fmt(kpi?.noSignal), total);
  const finalScore = fmt(overview?.avgScore);
  const rating = finalScore >= 90 ? 'Excellent' : finalScore >= 75 ? 'Good' : finalScore >= 60 ? 'Fair' : 'Poor';

  const coverageScore = Math.round((coveragePct / 100) * 30);
  const sinrPct = pct(fmt(kpi?.sinrPass), total);
  const qualityScore = Math.round((sinrPct / 100) * 25);
  const dlPct = pct(fmt(kpi?.dlPass), total);
  const throughputScore = Math.round((dlPct / 100) * 20);
  const reliabilityScore = Math.round(Math.min(15, 15 * (1 - fmt(kpi?.callDrops) / Math.max(total, 1) * 100)));
  const eventsScore = Math.max(0, 10 - Math.round(fmt(kpi?.callDrops) * 0.5));

  const dlTargetMbps = c.dl_threshold / 1000;
  const ulTargetMbps = c.ul_threshold / 1000;

  const routeScores = await query(
    `SELECT overall_score FROM drive_tests WHERE status = 'COMPLETED' AND overall_score IS NOT NULL ${opFilter}`, opArgs);
  const routePerf = { excellent: 0, good: 0, fair: 0, poor: 0, failed: 0 };
  for (const r of routeScores) {
    const s = Number(r.overall_score);
    if (s >= 90) routePerf.excellent++;
    else if (s >= 75) routePerf.good++;
    else if (s >= 60) routePerf.fair++;
    else if (s >= 40) routePerf.poor++;
    else routePerf.failed++;
  }

  return {
    operatorName,
    executiveSummary: {
      totalDriveTests: fmt(overview?.totalTests),
      totalRoutes: fmt(overview?.totalTests),
      totalDistance: `${fmt(overview?.totalDistance)} km`,
      totalSamples: fmt(overview?.totalSamples).toLocaleString(),
      avgRsrp: { value: `${fmt(kpi?.avgRsrp)} dBm`, target: `>= ${c.rsrp_threshold} dBm`, status: status(fmt(kpi?.avgRsrp), c.rsrp_threshold) },
      avgRsrq: { value: `${fmt(kpi?.avgRsrq)} dB`, target: `>= ${c.rsrq_threshold} dB`, status: status(fmt(kpi?.avgRsrq), c.rsrq_threshold) },
      avgSinr: { value: `${fmt(kpi?.avgSinr)} dB`, target: `>= ${c.sinr_threshold} dB`, status: status(fmt(kpi?.avgSinr), c.sinr_threshold) },
      avgDl: { value: `${fmt(kpi?.avgDlMbps)} Mbps`, target: `>= ${dlTargetMbps} Mbps`, status: status(fmt(kpi?.avgDlMbps), dlTargetMbps) },
      avgUl: { value: `${fmt(kpi?.avgUlMbps)} Mbps`, target: `>= ${ulTargetMbps} Mbps`, status: status(fmt(kpi?.avgUlMbps), ulTargetMbps) },
      avgLatency: { value: 'N/A', target: '<= 80 ms', status: 'N/A' },
      coverageAvailability: { value: `${coveragePct}%`, target: `>= ${c.coverage_target}%`, status: status(coveragePct, c.coverage_target) },
      noSignalSamples: { value: `${noSignalPct}%`, target: '<= 2%', status: status(noSignalPct, 2, false) },
      overallQosScore: { value: `${finalScore}/100`, target: '>= 85', status: rating },
    },
    kpiSummary: [
      { kpi: 'RSRP', avg: `${fmt(kpi?.avgRsrp)} dBm`, best: `${fmt(kpi?.maxRsrp)}`, worst: `${fmt(kpi?.minRsrp)}` },
      { kpi: 'RSRQ', avg: `${fmt(kpi?.avgRsrq)} dB`, best: `${fmt(kpi?.maxRsrq)}`, worst: `${fmt(kpi?.minRsrq)}` },
      { kpi: 'SINR', avg: `${fmt(kpi?.avgSinr)} dB`, best: `${fmt(kpi?.maxSinr)}`, worst: `${fmt(kpi?.minSinr)}` },
      { kpi: 'DL Speed', avg: `${fmt(kpi?.avgDlMbps)} Mbps`, best: `${fmt(kpi?.maxDlMbps)} Mbps`, worst: '0 Mbps' },
      { kpi: 'UL Speed', avg: `${fmt(kpi?.avgUlMbps)} Mbps`, best: `${fmt(kpi?.maxUlMbps)} Mbps`, worst: '0 Mbps' },
    ],
    coverageSummary: [
      { class: 'Excellent', samples: fmt(kpi?.excellent), percentage: pct(fmt(kpi?.excellent), total) },
      { class: 'Good', samples: fmt(kpi?.good), percentage: pct(fmt(kpi?.good), total) },
      { class: 'Fair', samples: fmt(kpi?.fair), percentage: pct(fmt(kpi?.fair), total) },
      { class: 'Poor', samples: fmt(kpi?.poor), percentage: pct(fmt(kpi?.poor), total) },
      { class: 'No Signal', samples: fmt(kpi?.noSignal), percentage: pct(fmt(kpi?.noSignal), total) },
    ],
    signalQualitySummary: [
      { quality: `Excellent (SINR>=${c.sinr_excellent})`, percentage: pct(await countSinrRange(operatorId, c.sinr_excellent, 999), total) },
      { quality: `Good (SINR ${c.sinr_good}-${c.sinr_excellent})`, percentage: pct(await countSinrRange(operatorId, c.sinr_good, c.sinr_excellent), total) },
      { quality: `Fair (SINR ${c.sinr_fair}-${c.sinr_good})`, percentage: pct(await countSinrRange(operatorId, c.sinr_fair, c.sinr_good), total) },
      { quality: `Poor (SINR<${c.sinr_fair})`, percentage: pct(await countSinrRange(operatorId, -999, c.sinr_fair), total) },
    ],
    throughputSummary: [
      { kpi: 'Average DL', value: `${fmt(kpi?.avgDlMbps)} Mbps` },
      { kpi: 'Peak DL', value: `${fmt(kpi?.maxDlMbps)} Mbps` },
      { kpi: 'Average UL', value: `${fmt(kpi?.avgUlMbps)} Mbps` },
      { kpi: 'Peak UL', value: `${fmt(kpi?.maxUlMbps)} Mbps` },
    ],
    routePerformanceSummary: [
      { result: 'Excellent', count: routePerf.excellent },
      { result: 'Good', count: routePerf.good },
      { result: 'Fair', count: routePerf.fair },
      { result: 'Poor', count: routePerf.poor },
      { result: 'Failed', count: routePerf.failed },
    ],
    geographicSummary: await getGeographicSummary(operatorId),
    problemAreas: await getProblemAreas(operatorId, c),
    eventSummary: [
      { event: 'Call Drops', count: fmt(kpi?.callDrops) },
      { event: 'Handovers', count: fmt(kpi?.handovers) },
      { event: 'No Signal Events', count: fmt(kpi?.noSignal) },
    ],
    complianceSummary: [
      { kpi: `Coverage (RSRP>=${c.rsrp_threshold})`, pass: `${coveragePct}%`, warning: `${pct(fmt(kpi?.poor), total)}%`, fail: `${noSignalPct}%` },
      { kpi: `Signal Quality (SINR>=${c.sinr_threshold})`, pass: `${sinrPct}%`, warning: '-', fail: `${(100 - sinrPct).toFixed(1)}%` },
      { kpi: `Throughput (DL>=${dlTargetMbps}Mbps)`, pass: `${dlPct}%`, warning: '-', fail: `${(100 - dlPct).toFixed(1)}%` },
    ],
    overallScore: {
      breakdown: [
        { category: 'Coverage', weight: '30%', score: coverageScore },
        { category: 'Signal Quality', weight: '25%', score: qualityScore },
        { category: 'Throughput', weight: '20%', score: throughputScore },
        { category: 'Reliability', weight: '15%', score: reliabilityScore },
        { category: 'Events', weight: '10%', score: eventsScore },
      ],
      finalScore,
      rating: `${finalScore >= 90 ? '★★★★★' : finalScore >= 75 ? '★★★★' : finalScore >= 60 ? '★★★' : finalScore >= 40 ? '★★' : '★'} ${rating}`,
    },
    aiSummary: buildAiSummary(operatorName, overview, kpi, total, coveragePct, finalScore, rating, c),
  };
}

async function countSinrRange(operatorId, min, max) {
  const opFilter = operatorId != null ? 'AND dt.operator_id = ?' : '';
  const opArgs   = operatorId != null ? [operatorId] : [];
  const [r] = await query(
    `SELECT COUNT(*) AS cnt FROM drive_test_samples s
     JOIN drive_tests dt ON dt.drive_test_id = s.drive_test_id
     WHERE dt.status = 'COMPLETED' ${opFilter} AND s.sinr >= ? AND s.sinr < ?`,
    [...opArgs, min, max]);
  return r?.cnt || 0;
}

async function getProblemAreas(operatorId, c) {
  const problemThreshold = Math.min(c.rsrp_threshold, c.rsrp_fair);
  const opFilter = operatorId != null ? 'AND dt.operator_id = ?' : '';
  const opArgs   = operatorId != null ? [operatorId] : [];
  const rows = await query(
    `SELECT ROUND(s.latitude, 3) AS lat, ROUND(s.longitude, 3) AS lon,
            COUNT(*) AS cnt, ROUND(AVG(s.rsrp), 1) AS avgRsrp, ROUND(AVG(s.sinr), 1) AS avgSinr
     FROM drive_test_samples s
     JOIN drive_tests dt ON dt.drive_test_id = s.drive_test_id
     WHERE dt.status = 'COMPLETED' ${opFilter} AND s.rsrp < ?
     GROUP BY ROUND(s.latitude, 3), ROUND(s.longitude, 3)
     HAVING cnt >= 3
     ORDER BY avgRsrp ASC LIMIT 10`, [...opArgs, problemThreshold]);

  const results = [];
  for (const r of rows) {
    const delta = 0.02;
    const [nearest] = await query(
      `SELECT site_name FROM sites
       WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?
       ORDER BY ABS(latitude - ?) + ABS(longitude - ?) LIMIT 1`,
      [r.lat - delta, Number(r.lat) + delta, r.lon - delta, Number(r.lon) + delta, r.lat, r.lon]
    ).catch(() => []);
    results.push({
      locationName: nearest?.site_name || `Area ${r.lat}, ${r.lon}`,
      location: `${r.lat}, ${r.lon}`,
      issue: Number(r.avgRsrp) < c.rsrp_poor ? 'Weak LTE Coverage' : 'Low Signal Strength',
      severity: Number(r.avgRsrp) < c.rsrp_poor ? 'High' : 'Medium',
      occurrences: r.cnt,
    });
  }
  return results;
}

async function getGeographicSummary(operatorId) {
  const opFilter = operatorId != null ? 'AND dt.operator_id = ?' : '';
  const opArgs   = operatorId != null ? [operatorId] : [];
  const rows = await query(
    `SELECT r.name AS region, COUNT(DISTINCT dt.drive_test_id) AS tests,
            ROUND(AVG(dt.overall_score), 1) AS avgScore
     FROM drive_tests dt
     JOIN drive_test_samples s ON s.drive_test_id = dt.drive_test_id
     JOIN sites st ON ABS(st.latitude - s.latitude) < 0.05 AND ABS(st.longitude - s.longitude) < 0.05
     JOIN regions r ON r.region_id = st.region_id
     WHERE dt.status = 'COMPLETED' ${opFilter}
     GROUP BY r.region_id, r.name
     ORDER BY avgScore ASC`, opArgs);

  if (!rows.length) {
    const fallback = await query(
      `SELECT dt.test_name AS region, 1 AS tests, ROUND(dt.overall_score, 1) AS avgScore
       FROM drive_tests dt
       WHERE dt.status = 'COMPLETED' ${opFilter} AND dt.overall_score IS NOT NULL
       ORDER BY dt.overall_score ASC LIMIT 10`, opArgs);
    return fallback.map(r => ({
      region: r.region,
      tests: r.tests,
      avgScore: Number(r.avgScore) || 0,
      status: Number(r.avgScore) >= 75 ? 'Pass' : Number(r.avgScore) >= 60 ? 'Warning' : 'Fail',
    }));
  }

  return rows.map(r => ({
    region: r.region,
    tests: r.tests,
    avgScore: Number(r.avgScore) || 0,
    status: Number(r.avgScore) >= 75 ? 'Pass' : Number(r.avgScore) >= 60 ? 'Warning' : 'Fail',
  }));
}

function buildAiSummary(name, overview, kpi, total, coveragePct, score, rating, c) {
  const tests = overview?.totalTests || 0;
  const dist = overview?.totalDistance || 0;
  const samples = overview?.totalSamples || 0;
  const avgRsrp = Number(kpi?.avgRsrp) || 0;
  const avgSinr = Number(kpi?.avgSinr) || 0;
  const avgDl = Number(kpi?.avgDlMbps) || 0;
  const noSigPct = total > 0 ? ((Number(kpi?.noSignal) || 0) / total * 100).toFixed(1) : '0';
  const dlTargetMbps = c.dl_threshold / 1000;

  let text = `During the reporting period, ${name} completed ${tests} drive test${tests !== 1 ? 's' : ''} covering ${dist} km with ${samples.toLocaleString()} radio samples collected. The network achieved an overall QoS score of ${score}/100 (${rating}).`;

  text += `\n\nThe average RSRP (${avgRsrp} dBm)${avgRsrp >= c.rsrp_good ? ' indicates good coverage' : avgRsrp >= c.rsrp_fair ? ' suggests marginal coverage that needs attention' : ' indicates weak coverage requiring urgent action'}. SINR averaged ${avgSinr} dB${avgSinr >= c.sinr_good ? ', reflecting good radio conditions' : avgSinr >= c.sinr_threshold ? ', indicating moderate interference levels' : ', highlighting significant interference issues'}. Download throughput averaged ${avgDl} Mbps${avgDl >= dlTargetMbps ? ', meeting regulatory benchmarks' : `, falling below the ${dlTargetMbps} Mbps regulatory target`}.`;

  if (coveragePct < c.coverage_target) {
    text += `\n\nCoverage compliance stands at ${coveragePct}%, below the ${c.coverage_target}% regulatory threshold. `;
  }
  if (Number(noSigPct) > 2) {
    text += `${noSigPct}% of samples recorded no signal — these dead zones should be prioritized for new site deployment or coverage extension.`;
  }

  return text;
}

export async function getOperatorComparisonDashboard() {
  const c = await loadConfig();
  const rows = await query(
    `SELECT o.operator_name AS operator,
            dt_agg.tests, dt_agg.distanceKm, dt_agg.qosScore,
            s_agg.avgRsrp, s_agg.avgRsrq, s_agg.avgSinr,
            s_agg.avgDlMbps, s_agg.avgUlMbps,
            s_agg.totalSamples, s_agg.rsrpPass
     FROM operators o
     JOIN (
       SELECT operator_id, COUNT(*) AS tests,
              ROUND(COALESCE(SUM(distance_km), 0), 1) AS distanceKm,
              ROUND(AVG(overall_score), 1) AS qosScore
       FROM drive_tests WHERE status = 'COMPLETED' GROUP BY operator_id
     ) dt_agg ON dt_agg.operator_id = o.operator_id
     LEFT JOIN (
       SELECT dt2.operator_id,
              ROUND(AVG(s.rsrp), 1) AS avgRsrp, ROUND(AVG(s.rsrq), 1) AS avgRsrq,
              ROUND(AVG(s.sinr), 1) AS avgSinr,
              ROUND(AVG(s.dl_throughput)/1000, 1) AS avgDlMbps,
              ROUND(AVG(s.ul_throughput)/1000, 1) AS avgUlMbps,
              COUNT(*) AS totalSamples,
              SUM(CASE WHEN s.rsrp >= ? THEN 1 ELSE 0 END) AS rsrpPass
       FROM drive_test_samples s
       JOIN drive_tests dt2 ON dt2.drive_test_id = s.drive_test_id
       WHERE dt2.status = 'COMPLETED' GROUP BY dt2.operator_id
     ) s_agg ON s_agg.operator_id = o.operator_id
     ORDER BY s_agg.avgRsrp DESC`, [c.rsrp_threshold]);

  return rows.map(r => ({
    operator: r.operator,
    tests: r.tests,
    distance: `${r.distanceKm} km`,
    avgRsrp: Number(r.avgRsrp) || 0,
    avgRsrq: Number(r.avgRsrq) || 0,
    avgSinr: Number(r.avgSinr) || 0,
    avgDl: `${r.avgDlMbps || 0} Mbps`,
    avgUl: `${r.avgUlMbps || 0} Mbps`,
    latency: 'N/A',
    qosScore: Number(r.qosScore) || 0,
    compliance: r.totalSamples > 0 && (r.rsrpPass / r.totalSamples * 100) >= c.coverage_target ? 'Pass' : 'Fail',
  }));
}
