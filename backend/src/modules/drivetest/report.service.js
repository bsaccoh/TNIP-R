import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';
import { query } from '../../config/db.js';
import { loadConfig } from './scoring.service.js';

const REGION_BOUNDS = {
  1: { name: 'Western Area', sql: 's.latitude >= 8.3 AND s.latitude <= 8.6 AND s.longitude >= -13.4 AND s.longitude <= -13.0' },
  2: { name: 'Northern', sql: 's.latitude > 8.6' },
  3: { name: 'Southern', sql: 's.latitude < 8.3 AND s.longitude > -12.5' },
  4: { name: 'Eastern', sql: 's.latitude < 9.0 AND s.longitude > -11.5' },
};

function regionSqlFilter(regionId) {
  const r = REGION_BOUNDS[regionId];
  return r ? r.sql : '1=0';
}

function detectRegionFromCoords(lat, lon) {
  if (lat >= 8.3 && lat <= 8.6 && lon >= -13.4 && lon <= -13.0) return 1; // Western
  if (lat > 8.6) return 2;                                                  // Northern
  if (lat < 8.3 && lon > -12.5 && lon <= -11.5) return 3;                  // Southern (check before Eastern to resolve overlap)
  if (lat < 9.0 && lon > -11.5) return 4;                                   // Eastern
  if (lat < 8.3 && lon <= -12.5) return 3;                                  // Southern (western part)
  return null;
}

// Nearest cell site to a coordinate (closest of any operator).
function nearestSite(lat, lon, sites) {
  const cosLat = Math.cos(lat * Math.PI / 180);
  let best = null, bestD = Infinity;
  for (const t of sites) {
    const dLat = (lat - t.lat) * 111;
    const dLon = (lon - t.lon) * 111 * cosLat;
    const d = Math.sqrt(dLat * dLat + dLon * dLon);
    if (d < bestD) { bestD = d; best = t; }
  }
  if (!best) return null;
  return { siteName: best.siteName, distanceKm: bestD };
}

// ─── Shared data fetcher ────────────────────────────────────────────────────

export async function getReportData(regionId = null) {
  const config = await loadConfig();
  const now = new Date();

  const regionFilter = regionId ? `AND ${regionSqlFilter(regionId)}` : '';

  let regionName = 'National';
  if (regionId && REGION_BOUNDS[regionId]) regionName = REGION_BOUNDS[regionId].name;

  /* ── Overview — two fast queries instead of one expensive join ── */
  const dtFilter = regionId
    ? `AND dt.drive_test_id IN (SELECT DISTINCT s.drive_test_id FROM drive_test_samples s WHERE ${regionSqlFilter(regionId)})`
    : '';
  const [dtOverview = {}] = await query(`
    SELECT COUNT(*) AS totalTests,
           ROUND(SUM(distance_km), 2) AS totalDistance,
           ROUND(AVG(overall_score), 2) AS avgScore
    FROM drive_tests dt
    WHERE status = 'COMPLETED' ${dtFilter}`);
  const [sampleCount = {}] = await query(`
    SELECT COUNT(*) AS totalSamples
    FROM drive_test_samples s
    JOIN drive_tests dt ON dt.drive_test_id = s.drive_test_id AND dt.status = 'COMPLETED'
    WHERE 1=1 ${regionFilter}`);
  const overview = { ...dtOverview, totalSamples: sampleCount.totalSamples || 0 };

  /* ── Per-operator KPI data ── */
  const opSql = `
    SELECT o.operator_name AS name,
           COUNT(DISTINCT dt.drive_test_id) AS tests,
           COUNT(s.sample_id) AS samples,
           ROUND(AVG(s.rsrp), 2) AS avgRsrp,
           ROUND(MIN(s.rsrp), 2) AS minRsrp,
           ROUND(MAX(s.rsrp), 2) AS maxRsrp,
           ROUND(AVG(s.sinr), 2) AS avgSinr,
           ROUND(MIN(s.sinr), 2) AS minSinr,
           ROUND(MAX(s.sinr), 2) AS maxSinr,
           ROUND(AVG(s.dl_throughput), 2) AS avgDl,
           ROUND(MAX(s.dl_throughput), 2) AS maxDl,
           ROUND(AVG(s.ul_throughput), 2) AS avgUl,
           ROUND(MAX(s.ul_throughput), 2) AS maxUl,
           ROUND(AVG(dt.overall_score), 2) AS score,
           SUM(CASE WHEN s.rsrp >= ? THEN 1 ELSE 0 END) AS rsrpPass,
           SUM(CASE WHEN s.sinr >= ? THEN 1 ELSE 0 END) AS sinrPass,
           SUM(CASE WHEN s.dl_throughput >= ? THEN 1 ELSE 0 END) AS dlPass,
           SUM(CASE WHEN s.rsrp >= ? THEN 1 ELSE 0 END) AS excellent,
           SUM(CASE WHEN s.rsrp >= ? AND s.rsrp < ? THEN 1 ELSE 0 END) AS good,
           SUM(CASE WHEN s.rsrp >= ? AND s.rsrp < ? THEN 1 ELSE 0 END) AS fair,
           SUM(CASE WHEN s.rsrp >= ? AND s.rsrp < ? THEN 1 ELSE 0 END) AS poor,
           SUM(CASE WHEN s.rsrp < ? THEN 1 ELSE 0 END) AS noSignal,
           COUNT(s.sample_id) AS totalMeasurements
    FROM drive_tests dt
    JOIN operators o ON o.operator_id = dt.operator_id
    JOIN drive_test_samples s ON s.drive_test_id = dt.drive_test_id
    WHERE dt.status = 'COMPLETED' ${regionFilter}
    GROUP BY o.operator_id, o.operator_name
    ORDER BY score DESC`;

  const opParams = [
    config.rsrp_threshold, config.sinr_threshold, config.dl_threshold,
    config.rsrp_excellent,
    config.rsrp_good, config.rsrp_excellent,
    config.rsrp_fair, config.rsrp_good,
    config.rsrp_poor, config.rsrp_fair,
    config.rsrp_poor,
  ];

  const opRows = await query(opSql, opParams);

  const operators = opRows.map(o => {
    const tm = o.totalMeasurements || 1;
    const coveragePct = Number(((o.rsrpPass || 0) / tm * 100).toFixed(1));
    const rating = o.score >= 90 ? 'Excellent' : o.score >= 75 ? 'Good' : o.score >= 60 ? 'Fair' : 'Poor';
    return {
      name: o.name,
      tests: o.tests || 0,
      samples: o.samples || 0,
      avgRsrp: o.avgRsrp, minRsrp: o.minRsrp, maxRsrp: o.maxRsrp,
      avgSinr: o.avgSinr, minSinr: o.minSinr, maxSinr: o.maxSinr,
      avgDl: o.avgDl, maxDl: o.maxDl,
      avgUl: o.avgUl, maxUl: o.maxUl,
      coveragePct,
      rsrpPassPct: Number(((o.rsrpPass || 0) / tm * 100).toFixed(1)),
      sinrPassPct: Number(((o.sinrPass || 0) / tm * 100).toFixed(1)),
      dlPassPct: Number(((o.dlPass || 0) / tm * 100).toFixed(1)),
      score: o.score || 0,
      rating,
      coverage: {
        excellent: Number(((o.excellent || 0) / tm * 100).toFixed(1)),
        good: Number(((o.good || 0) / tm * 100).toFixed(1)),
        fair: Number(((o.fair || 0) / tm * 100).toFixed(1)),
        poor: Number(((o.poor || 0) / tm * 100).toFixed(1)),
        noSignal: Number(((o.noSignal || 0) / tm * 100).toFixed(1)),
      },
    };
  });

  /* ── Regional summary (national only) — computed in JS from all samples ── */
  let regions = [];
  if (!regionId) {
    const allSql = `
      SELECT s.latitude, s.longitude, s.rsrp, dt.overall_score, dt.drive_test_id, o.operator_name
      FROM drive_test_samples s
      JOIN drive_tests dt ON dt.drive_test_id = s.drive_test_id AND dt.status = 'COMPLETED'
      JOIN operators o ON o.operator_id = dt.operator_id
      WHERE s.latitude IS NOT NULL`;
    const allRows = await query(allSql);
    const buckets = {};
    for (const row of allRows) {
      const rid = detectRegionFromCoords(row.latitude, row.longitude);
      if (!rid) continue;
      if (!buckets[rid]) buckets[rid] = { name: REGION_BOUNDS[rid].name, tests: new Set(), scores: [], rsrpPass: 0, total: 0, opScores: {} };
      const b = buckets[rid];
      const isNewTest = !b.tests.has(row.drive_test_id);
      b.tests.add(row.drive_test_id);
      if (isNewTest && row.overall_score != null) b.scores.push(row.overall_score);
      b.total++;
      if (row.rsrp >= config.rsrp_threshold) b.rsrpPass++;
      if (!b.opScores[row.operator_name]) b.opScores[row.operator_name] = [];
      if (isNewTest && row.overall_score != null) b.opScores[row.operator_name].push(row.overall_score);
    }
    regions = Object.values(buckets).map(b => {
      const avgScore = b.scores.length ? Number((b.scores.reduce((a, c) => a + c, 0) / b.scores.length).toFixed(2)) : 0;
      let bestOperator = 'N/A';
      let bestAvg = -Infinity;
      for (const [op, scores] of Object.entries(b.opScores)) {
        const avg = scores.reduce((a, c) => a + c, 0) / scores.length;
        if (avg > bestAvg) { bestAvg = avg; bestOperator = op; }
      }
      return { name: b.name, tests: b.tests.size, avgScore, bestOperator, coveragePct: b.total ? Number((b.rsrpPass / b.total * 100).toFixed(1)) : 0 };
    }).sort((a, b) => b.avgScore - a.avgScore);
  }

  /* ── Problem areas ── */
  const probSql = `
    SELECT ROUND(s.latitude, 3) AS lat, ROUND(s.longitude, 3) AS lon,
           CASE
             WHEN AVG(s.rsrp) < ? THEN 'No Signal / Very Weak Coverage'
             WHEN AVG(s.rsrp) < ? THEN 'Poor Coverage'
             WHEN AVG(s.sinr) < ? THEN 'High Interference'
             WHEN AVG(s.dl_throughput) < ? THEN 'Low Throughput'
             ELSE 'Marginal'
           END AS issue,
           CASE
             WHEN AVG(s.rsrp) < ? THEN 'Critical'
             WHEN AVG(s.rsrp) < ? THEN 'High'
             WHEN AVG(s.sinr) < ? THEN 'High'
             ELSE 'Medium'
           END AS severity,
           COUNT(*) AS sampleCount
    FROM drive_test_samples s
    JOIN drive_tests dt ON dt.drive_test_id = s.drive_test_id AND dt.status = 'COMPLETED'
    WHERE s.rsrp IS NOT NULL ${regionFilter}
    GROUP BY lat, lon
    HAVING AVG(s.rsrp) < ? OR AVG(s.sinr) < ? OR AVG(s.dl_throughput) < ?
    ORDER BY severity DESC, sampleCount DESC
    LIMIT 10`;

  const probParams = [
    config.rsrp_poor, config.rsrp_fair, config.sinr_threshold, config.dl_threshold,
    config.rsrp_poor, config.rsrp_fair, config.sinr_threshold,
    config.rsrp_fair, config.sinr_threshold, config.dl_threshold,
  ];
  const probRows = await query(probSql, probParams);

  // Label each problem area with its nearest cell site.
  const siteRows = await query(`
    SELECT site_name AS siteName, latitude AS lat, longitude AS lon
    FROM sites
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND deleted_at IS NULL`);
  const sites = siteRows.map(s => ({ siteName: s.siteName, lat: Number(s.lat), lon: Number(s.lon) }));
  const problemAreas = probRows.map(p => {
    const site = nearestSite(Number(p.lat), Number(p.lon), sites);
    return {
      ...p,
      locationName: site ? site.siteName : `${Number(p.lat).toFixed(3)}, ${Number(p.lon).toFixed(3)}`,
      siteDistanceKm: site ? Number(site.distanceKm.toFixed(2)) : null,
    };
  });

  /* ── Raw samples (for Excel, max 5000) ── */
  const sampleSql = `
    SELECT s.ts AS timestamp, s.latitude AS lat, s.longitude AS lon,
           s.rsrp, s.rsrq, s.sinr, s.dl_throughput AS dl, s.ul_throughput AS ul,
           s.pci, s.rtt_ms, s.jitter_ms, s.packet_loss_pct, s.mos,
           s.event_type, s.call_status, o.operator_name AS operator
    FROM drive_test_samples s
    JOIN drive_tests dt ON dt.drive_test_id = s.drive_test_id AND dt.status = 'COMPLETED'
    JOIN operators o ON o.operator_id = dt.operator_id
    WHERE 1=1 ${regionFilter}
    ORDER BY s.ts DESC
    LIMIT 5000`;
  const samples = await query(sampleSql);

  /* ── Per-operator percentiles from sample data ── */
  function pctile(arr, p) {
    const sorted = arr.filter((v) => v != null && !isNaN(v)).map(Number).sort((a, b) => a - b);
    if (!sorted.length) return null;
    const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
    return +sorted[idx].toFixed(2);
  }

  for (const op of operators) {
    const opSamples = samples.filter((s) => s.operator === op.name);
    op.percentiles = {
      rsrp: { p5: pctile(opSamples.map((s) => s.rsrp), 5), p50: pctile(opSamples.map((s) => s.rsrp), 50), p95: pctile(opSamples.map((s) => s.rsrp), 95) },
      sinr: { p5: pctile(opSamples.map((s) => s.sinr), 5), p50: pctile(opSamples.map((s) => s.sinr), 50), p95: pctile(opSamples.map((s) => s.sinr), 95) },
      dl:   { p5: pctile(opSamples.map((s) => s.dl), 5), p50: pctile(opSamples.map((s) => s.dl), 50), p95: pctile(opSamples.map((s) => s.dl), 95) },
      rtt:  { p50: pctile(opSamples.map((s) => s.rtt_ms), 50), p95: pctile(opSamples.map((s) => s.rtt_ms), 95) },
      mos:  { p50: pctile(opSamples.map((s) => s.mos), 50) },
    };
    const attempted = opSamples.filter((s) => s.event_type === 'CALL_ATTEMPT' || s.call_status === 'CONNECTING').length;
    const failed    = opSamples.filter((s) => s.event_type === 'CALL_FAIL'    || s.call_status === 'FAILED').length;
    const established = opSamples.filter((s) => s.call_status === 'CONNECTED'  || s.event_type === 'CALL_ESTABLISH').length;
    const dropped   = opSamples.filter((s) => s.event_type === 'CALL_DROP').length;
    op.callQuality = {
      cssr: attempted ? +((1 - failed / attempted) * 100).toFixed(2) : null,
      cdr:  established ? +((dropped / established) * 100).toFixed(2) : null,
      drops: dropped,
    };
  }

  /* ── AI Summary ── */
  const aiParts = [];
  aiParts.push(`${regionName} Drive Test Report — Generated ${now.toISOString().slice(0, 10)}.`);
  aiParts.push(`${overview.totalTests || 0} tests conducted covering ${overview.totalDistance || 0} km with ${overview.totalSamples || 0} measurement samples.`);
  aiParts.push(`Overall average quality score: ${overview.avgScore || 0}/100.`);

  if (operators.length) {
    const best = operators[0];
    const worst = operators[operators.length - 1];
    aiParts.push(`Best performing operator: ${best.name} (score ${best.score}, coverage ${best.coveragePct}%).`);
    if (operators.length > 1) {
      aiParts.push(`Lowest performing operator: ${worst.name} (score ${worst.score}, coverage ${worst.coveragePct}%).`);
    }
  }

  const criticalAreas = problemAreas.filter(p => p.severity === 'Critical');
  if (criticalAreas.length) {
    aiParts.push(`${criticalAreas.length} critical problem area(s) identified requiring immediate attention.`);
  }

  return {
    reportTitle: `NATCOM/TNIP-R Drive Test Analysis Report — ${regionName}`,
    generatedAt: now.toISOString(),
    regionName,
    overview: {
      totalTests: overview.totalTests || 0,
      totalSamples: overview.totalSamples || 0,
      totalDistance: overview.totalDistance || 0,
      avgScore: overview.avgScore || 0,
    },
    operators,
    regions,
    problemAreas,
    samples,
    config,
    aiSummary: aiParts.join('\n'),
  };
}

// ─── Narrative builders (data-driven prose, shared by PDF & Excel) ──────────

function mean(arr) {
  const f = arr.filter(x => x != null && !Number.isNaN(x));
  return f.length ? f.reduce((a, b) => a + b, 0) / f.length : null;
}
function n(v) { return v == null ? null : Number(v); }

function scoreRating(s) {
  return s >= 90 ? 'excellent' : s >= 75 ? 'good' : s >= 60 ? 'fair' : 'poor / non-compliant';
}
function signalQuality(rsrp, cfg) {
  if (cfg.rsrp_excellent != null && rsrp >= cfg.rsrp_excellent) return 'excellent';
  if (cfg.rsrp_good != null && rsrp >= cfg.rsrp_good) return 'good';
  if (cfg.rsrp_fair != null && rsrp >= cfg.rsrp_fair) return 'fair';
  return 'poor';
}

// Returns { executive, kpi, coverage, compliance, regional, problem, map, recommendations }
function buildNarratives(data, regionId) {
  const ops = data.operators || [];
  const cfg = data.config || {};
  const covTarget = cfg.coverage_target != null ? Number(cfg.coverage_target) : 95;
  const scope = data.regionName === 'National' ? 'the nation' : `the ${data.regionName} region`;

  const best = ops[0];
  const worst = ops.length > 1 ? ops[ops.length - 1] : null;
  const avgRsrp = mean(ops.map(o => n(o.avgRsrp)));
  const avgSinr = mean(ops.map(o => n(o.avgSinr)));
  const avgDl = mean(ops.map(o => n(o.avgDl)));
  const avgCov = mean(ops.map(o => n(o.coveragePct)));
  const goodPlus = mean(ops.map(o => (o.coverage?.excellent || 0) + (o.coverage?.good || 0)));
  const poorPlus = mean(ops.map(o => (o.coverage?.poor || 0) + (o.coverage?.noSignal || 0)));
  const failing = ops.filter(o => (o.rsrpPassPct || 0) < covTarget);

  // Executive
  let executive = `This report presents the drive test measurement results for ${scope}, covering ${data.overview.totalTests} test campaign(s) across ${data.overview.totalDistance} km and ${data.overview.totalSamples.toLocaleString()} signal samples. `;
  executive += `The overall network quality score is ${data.overview.avgScore}/100, rated ${scoreRating(data.overview.avgScore)}. `;
  if (best) {
    executive += `${best.name} delivers the strongest experience at ${best.score}/100 with ${best.coveragePct}% coverage`;
    if (worst && worst.name !== best.name) executive += `, whereas ${worst.name} trails at ${worst.score}/100 with ${worst.coveragePct}% coverage`;
    executive += '.';
  }

  // KPI
  let kpi = '';
  if (avgRsrp != null) kpi += `Average received signal power (RSRP) across operators is ${avgRsrp.toFixed(1)} dBm, indicating ${signalQuality(avgRsrp, cfg)} signal strength. `;
  if (avgSinr != null) kpi += `Signal-to-interference-plus-noise ratio (SINR) averages ${avgSinr.toFixed(1)} dB. `;
  if (avgDl != null) kpi += `Mean downlink throughput measures ${(avgDl / 1000).toFixed(2)} Mbps. `;
  if (best && worst && best.name !== worst.name) {
    const gap = (best.score - worst.score).toFixed(1);
    kpi += `The ${gap}-point score gap between ${best.name} and ${worst.name} reflects a meaningful difference in service quality across operators.`;
  } else if (best) {
    kpi += `${best.name} is the sole/leading operator evaluated in this scope.`;
  }

  // Coverage distribution
  let coverage = '';
  if (goodPlus != null && poorPlus != null) {
    coverage += `On average, ${goodPlus.toFixed(1)}% of samples fall within the Excellent-to-Good coverage bands, while ${poorPlus.toFixed(1)}% register Poor or No-Signal conditions. `;
  }
  if (avgCov != null) {
    coverage += avgCov >= covTarget
      ? `Aggregate coverage of ${avgCov.toFixed(1)}% meets the ${covTarget}% regulatory target.`
      : `Aggregate coverage of ${avgCov.toFixed(1)}% falls short of the ${covTarget}% regulatory target, signalling gaps that warrant network expansion.`;
  }

  // Compliance
  let compliance = failing.length
    ? `${failing.map(o => o.name).join(', ')} ${failing.length > 1 ? 'do' : 'does'} not meet the ${covTarget}% RSRP compliance threshold and require remediation. `
    : `All evaluated operators meet the ${covTarget}% RSRP compliance threshold. `;
  const dlFailing = ops.filter(o => (o.dlPassPct || 0) < 50);
  if (dlFailing.length) compliance += `Downlink throughput compliance is weakest for ${dlFailing.map(o => o.name).join(', ')}, where fewer than half of samples meet the throughput target.`;
  else compliance += 'Downlink throughput compliance is broadly acceptable across operators.';

  // Regional (national only)
  let regional = '';
  if (!regionId && data.regions?.length) {
    const sorted = [...data.regions].sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
    const top = sorted[0], bottom = sorted[sorted.length - 1];
    regional = `Across ${data.regions.length} regions, ${top.name} records the highest quality score (${top.avgScore}/100)`;
    if (bottom && bottom.name !== top.name) regional += ` and ${bottom.name} the lowest (${bottom.avgScore}/100)`;
    regional += '. Regions below target should be prioritised for infrastructure investment.';
  }

  // Problem areas
  let problem;
  if (data.problemAreas?.length) {
    const issueCounts = {};
    data.problemAreas.forEach(p => { issueCounts[p.issue] = (issueCounts[p.issue] || 0) + 1; });
    const topIssue = Object.entries(issueCounts).sort((a, b) => b[1] - a[1])[0];
    const sites = [...new Set(data.problemAreas.map(p => p.locationName))];
    problem = `${data.problemAreas.length} problem location(s) were identified, most frequently exhibiting "${topIssue[0]}". `;
    problem += `Affected zones cluster around ${sites.slice(0, 5).join(', ')}${sites.length > 5 ? ', among others' : ''}. `;
    problem += 'Locations flagged Critical or High severity should receive priority optimisation.';
  } else {
    problem = 'No significant problem areas were detected along the tested routes; coverage and quality remained within acceptable bounds throughout.';
  }

  // Map
  const map = 'The signal coverage map below plots sampled measurement points geographically, colour-coded by RSRP. Green denotes strong coverage; orange and red mark weak or no-signal zones that correspond to the problem locations noted above, helping visualise where field remediation should be concentrated.';

  // Recommendations
  const recs = [];
  if (poorPlus != null && poorPlus > 15) recs.push('densify the network along weak-coverage corridors to reduce the share of Poor and No-Signal samples');
  if (failing.length) recs.push(`prioritise coverage optimisation for ${failing.map(o => o.name).join(', ')}`);
  if (data.problemAreas?.length) recs.push('perform targeted RF optimisation (antenna tilt, transmit power, azimuth) at the identified problem sites');
  recs.push('sustain periodic drive-test monitoring to track quality improvements across successive campaigns');
  const recommendations = `Recommended actions: ${recs.join('; ')}.`;

  return { executive, kpi, coverage, compliance, regional, problem, map, recommendations };
}

// ─── PDF Generation ─────────────────────────────────────────────────────────

export async function generatePdfReport(regionId = null) {
  const data = await getReportData(regionId);
  const narr = buildNarratives(data, regionId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 }, bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100;
    const HEADER_BG = '#1a237e';
    const HEADER_FG = '#ffffff';
    const ALT_ROW = '#f5f5f5';
    const PASS_CLR = '#2e7d32';
    const WARN_CLR = '#f57f17';
    const FAIL_CLR = '#c62828';
    const dateStr = new Date(data.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    // ── Helper: narrative paragraph ──
    function narPara(text) {
      if (!text) return;
      if (doc.y + 30 > doc.page.height - 60) doc.addPage();
      doc.fontSize(9).font('Helvetica').fillColor('#424242').text(text, 60, doc.y, { width: W - 20 });
      doc.moveDown(0.6);
    }

    // ── Helper: draw table with repeating column headers across page breaks ──
    function drawTable(headers, rows, colWidths, opts = {}) {
      const rowH = 18;
      const startX = 50;

      function drawHeaderRow(yPos) {
        let x = startX;
        doc.save();
        doc.rect(x, yPos, W, rowH).fill(HEADER_BG);
        doc.fillColor(HEADER_FG).fontSize(8).font('Helvetica-Bold');
        for (let i = 0; i < headers.length; i++) {
          doc.text(headers[i], x + 3, yPos + 4, { width: colWidths[i] - 6, height: rowH - 4, ellipsis: true, lineBreak: false });
          x += colWidths[i];
        }
        doc.restore();
        doc.y = yPos + rowH;
      }

      if (doc.y + rowH * 2 > doc.page.height - 60) doc.addPage();
      drawHeaderRow(doc.y);

      for (let ri = 0; ri < rows.length; ri++) {
        if (doc.y + rowH > doc.page.height - 60) {
          doc.addPage();
          drawHeaderRow(doc.y);
        }

        const yPos = doc.y;
        let x = startX;
        const bg = ri % 2 === 1 ? ALT_ROW : '#ffffff';
        doc.save();
        doc.rect(x, yPos, W, rowH).fill(bg);
        doc.fillColor('#212121').fontSize(7.5).font('Helvetica');

        for (let ci = 0; ci < rows[ri].length; ci++) {
          let val = rows[ri][ci];
          let color = '#212121';

          if (opts.colorCol && opts.colorCol.includes(ci)) {
            const v = String(val);
            if (['Excellent', 'Good', 'Pass'].some(k => v.includes(k))) color = PASS_CLR;
            else if (['Fair', 'Warning', 'Medium'].some(k => v.includes(k))) color = WARN_CLR;
            else if (['Poor', 'Fail', 'Critical', 'High'].some(k => v.includes(k))) color = FAIL_CLR;
          }

          doc.fillColor(color);
          doc.text(String(val ?? ''), x + 3, yPos + 4, { width: colWidths[ci] - 6, height: rowH - 4, ellipsis: true, lineBreak: false });
          x += colWidths[ci];
        }
        doc.restore();
        doc.y = yPos + rowH;
      }
      doc.y += 8;
    }

    // ── Helper: section title ──
    function sectionTitle(title) {
      if (doc.y + 40 > doc.page.height - 60) doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').fillColor(HEADER_BG).text(title, 50, doc.y + 10);
      doc.moveDown(0.3);
      doc.save();
      doc.strokeColor(HEADER_BG).lineWidth(1.5)
        .moveTo(50, doc.y).lineTo(50 + W, doc.y).stroke();
      doc.restore();
      doc.moveDown(0.5);
    }

    // ══════════════ COVER PAGE ══════════════
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#1a237e');

    doc.save();
    doc.rotate(45, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.fontSize(60).font('Helvetica-Bold').fillColor('#ffffff').opacity(0.08);
    doc.text('CONFIDENTIAL', 80, doc.page.height / 2 - 40, { align: 'center' });
    doc.restore();

    doc.fontSize(28).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('NATCOM / TNIP-R', 50, 200, { align: 'center', width: W });
    doc.moveDown(0.3);
    doc.fontSize(22).text('Drive Test Analysis Report', 50, doc.y, { align: 'center', width: W });
    doc.moveDown(1.5);
    doc.fontSize(16).font('Helvetica').fillColor('#b3b3ff');
    doc.text(data.regionName === 'National' ? 'National Report' : `Region: ${data.regionName}`, 50, doc.y, { align: 'center', width: W });
    doc.moveDown(1);
    doc.fontSize(12).fillColor('#ccccff');
    doc.text(dateStr, 50, doc.y, { align: 'center', width: W });
    doc.moveDown(3);
    doc.fontSize(10).fillColor('#ffffff').opacity(0.6);
    doc.text('CONFIDENTIAL — For authorized use only', 50, doc.y, { align: 'center', width: W });
    doc.opacity(1);

    // ══════════════ EXECUTIVE SUMMARY ══════════════
    doc.addPage();
    doc.fillColor('#212121');
    sectionTitle('Executive Summary');
    narPara(narr.executive);

    const ov = data.overview;
    doc.fontSize(10).font('Helvetica').fillColor('#212121');
    doc.text(`Total Drive Tests: ${ov.totalTests}`, 60, doc.y);
    doc.text(`Total Measurement Samples: ${ov.totalSamples.toLocaleString()}`, 60, doc.y);
    doc.text(`Total Distance Covered: ${ov.totalDistance} km`, 60, doc.y);
    doc.text(`Overall Average Score: ${ov.avgScore}/100`, 60, doc.y);
    doc.moveDown(0.8);

    doc.font('Helvetica-Bold').text('Key Findings:', 60, doc.y);
    doc.font('Helvetica');
    const findings = [];
    if (data.operators.length) {
      findings.push(`${data.operators[0].name} leads performance with a score of ${data.operators[0].score} and ${data.operators[0].coveragePct}% coverage.`);
    }
    const critCount = data.problemAreas.filter(p => p.severity === 'Critical').length;
    if (critCount) findings.push(`${critCount} critical coverage gap(s) identified requiring network optimization.`);
    else findings.push('No critical coverage gaps detected in the tested routes.');
    if (data.operators.length > 1) {
      const scores = data.operators.map(o => o.score);
      const gap = Math.max(...scores) - Math.min(...scores);
      findings.push(`Score gap between best and worst operator: ${gap.toFixed(1)} points.`);
    }
    for (const f of findings) {
      doc.text(`  •  ${f}`, 60, doc.y, { width: W - 20 });
    }
    doc.moveDown(1);

    // ══════════════ KPI SUMMARY TABLE ══════════════
    sectionTitle('KPI Summary by Operator');
    narPara(narr.kpi);
    const kpiHeaders = ['Operator', 'Tests', 'Avg RSRP', 'Avg SINR', 'Avg DL (kbps)', 'Coverage %', 'Score', 'Rating'];
    const kpiCols = [110, 45, 60, 60, 75, 60, 50, 55];
    const kpiRows = data.operators.map(o => [
      o.name, o.tests,
      o.avgRsrp != null ? Number(o.avgRsrp).toFixed(1) : 'N/A',
      o.avgSinr != null ? Number(o.avgSinr).toFixed(1) : 'N/A',
      o.avgDl != null ? Number(o.avgDl).toFixed(0) : 'N/A',
      `${o.coveragePct}%`, o.score, o.rating,
    ]);
    drawTable(kpiHeaders, kpiRows, kpiCols, { colorCol: [7] });

    // ══════════════ COVERAGE DISTRIBUTION ══════════════
    sectionTitle('Coverage Distribution by Operator');
    narPara(narr.coverage);
    const covHeaders = ['Operator', 'Excellent %', 'Good %', 'Fair %', 'Poor %', 'No Signal %'];
    const covCols = [130, 70, 70, 70, 70, 85];
    const covRows = data.operators.map(o => [
      o.name, `${o.coverage.excellent}%`, `${o.coverage.good}%`,
      `${o.coverage.fair}%`, `${o.coverage.poor}%`, `${o.coverage.noSignal}%`,
    ]);
    drawTable(covHeaders, covRows, covCols);

    // ══════════════ COMPLIANCE SUMMARY ══════════════
    sectionTitle('Compliance Summary');
    narPara(narr.compliance);
    const compHeaders = ['Operator', 'RSRP Pass %', 'SINR Pass %', 'DL Pass %'];
    const compCols = [170, 100, 100, 100];
    const compRows = data.operators.map(o => [
      o.name,
      `${o.rsrpPassPct}%`, `${o.sinrPassPct}%`, `${o.dlPassPct}%`,
    ]);
    drawTable(compHeaders, compRows, compCols);

    // ══════════════ PERCENTILE DISTRIBUTION ══════════════
    sectionTitle('Signal Quality Percentiles (ITU-T / ETSI EG 202 057)');
    const pctHeaders = ['Operator', 'RSRP P5', 'RSRP P50', 'RSRP P95', 'SINR P5', 'SINR P50', 'DL P50 (kbps)', 'RTT P50 (ms)', 'MOS P50'];
    const pctCols = [90, 55, 55, 55, 55, 55, 75, 65, 55];
    const pctRows = data.operators.map(o => {
      const p = o.percentiles || {};
      return [
        o.name,
        p.rsrp?.p5 ?? 'N/A', p.rsrp?.p50 ?? 'N/A', p.rsrp?.p95 ?? 'N/A',
        p.sinr?.p5 ?? 'N/A', p.sinr?.p50 ?? 'N/A',
        p.dl?.p50 != null ? Number(p.dl.p50).toFixed(0) : 'N/A',
        p.rtt?.p50 ?? 'N/A',
        p.mos?.p50 ?? 'N/A',
      ];
    });
    drawTable(pctHeaders, pctRows, pctCols);

    // ══════════════ CALL QUALITY (CSSR / CDR) ══════════════
    const hasCallData = data.operators.some(o => o.callQuality?.cssr != null || o.callQuality?.cdr != null || (o.callQuality?.drops ?? 0) > 0);
    if (hasCallData) {
      sectionTitle('Call Quality Indicators (ITU-T E.800)');
      const cqHeaders = ['Operator', 'CSSR (%)', 'CDR (%)', 'Call Drops'];
      const cqCols = [160, 100, 100, 110];
      const cqRows = data.operators.map(o => {
        const cq = o.callQuality || {};
        return [o.name, cq.cssr != null ? cq.cssr : 'N/A', cq.cdr != null ? cq.cdr : 'N/A', cq.drops ?? 0];
      });
      drawTable(cqHeaders, cqRows, cqCols);
    }

    // ══════════════ REGIONAL COMPARISON (national only) ══════════════
    if (!regionId && data.regions.length) {
      sectionTitle('Regional Comparison');
      narPara(narr.regional);
      const regHeaders = ['Region', 'Tests', 'Avg Score', 'Best Operator', 'Coverage %'];
      const regCols = [110, 55, 70, 130, 80];
      const regRows = data.regions.map(r => [
        r.name, r.tests, r.avgScore,
        r.bestOperator || 'N/A', r.coveragePct != null ? `${r.coveragePct}%` : 'N/A',
      ]);
      drawTable(regHeaders, regRows, regCols);
    }

    // ══════════════ SIGNAL COVERAGE MAP ══════════════
    sectionTitle('Signal Coverage Map');
    narPara(narr.map);

    const mapSamples = (data.samples || []).filter(s => s.lat != null && s.lon != null && s.rsrp != null);
    if (mapSamples.length > 0) {
      const step = Math.max(1, Math.ceil(mapSamples.length / 800));
      const plotPts = mapSamples.filter((_, i) => i % step === 0);

      const lats = plotPts.map(s => Number(s.lat));
      const lons = plotPts.map(s => Number(s.lon));
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLon = Math.min(...lons), maxLon = Math.max(...lons);
      const padLat = (maxLat - minLat) * 0.06 || 0.02;
      const padLon = (maxLon - minLon) * 0.06 || 0.02;
      const bMinLat = minLat - padLat, bMaxLat = maxLat + padLat;
      const bMinLon = minLon - padLon, bMaxLon = maxLon + padLon;

      const mapX = 55, mapH = 190, mapW = W - 10;
      if (doc.y + mapH + 30 > doc.page.height - 60) doc.addPage();
      const mapY = doc.y;

      doc.rect(mapX, mapY, mapW, mapH).fill('#dce8f0');

      function toMx(lon) { return mapX + (Number(lon) - bMinLon) / (bMaxLon - bMinLon) * mapW; }
      function toMy(lat) { return mapY + mapH - (Number(lat) - bMinLat) / (bMaxLat - bMinLat) * mapH; }

      function rsrpColor(rsrp) {
        const r = Number(rsrp);
        if (r >= -80) return '#00c853';
        if (r >= -90) return '#aeea00';
        if (r >= -100) return '#ff9100';
        if (r >= -110) return '#dd2c00';
        return '#880e4f';
      }

      for (const s of plotPts) {
        doc.circle(toMx(s.lon), toMy(s.lat), 2).fill(rsrpColor(s.rsrp));
      }

      doc.rect(mapX, mapY, mapW, mapH).stroke('#78909c');

      // Corner coordinate labels
      doc.fontSize(6).font('Helvetica').fillColor('#546e7a');
      doc.text(`${bMaxLat.toFixed(2)}°N`, mapX + 2, mapY + 2, { lineBreak: false });
      doc.text(`${bMinLon.toFixed(2)}°`, mapX + 2, mapY + mapH - 14, { lineBreak: false });
      doc.text(`${bMaxLon.toFixed(2)}°`, mapX + mapW - 34, mapY + mapH - 14, { lineBreak: false });

      // Legend
      const legY = mapY + mapH + 5;
      const legend = [
        { color: '#00c853', label: 'Excellent (≥ -80 dBm)' },
        { color: '#aeea00', label: 'Good (-80 to -90)' },
        { color: '#ff9100', label: 'Fair (-90 to -100)' },
        { color: '#dd2c00', label: 'Poor (-100 to -110)' },
        { color: '#880e4f', label: 'No Signal (< -110)' },
      ];
      const legItemW = Math.floor(mapW / legend.length);
      let legX = mapX;
      for (const l of legend) {
        doc.rect(legX, legY, 8, 8).fill(l.color);
        doc.fillColor('#424242').fontSize(7).text(l.label, legX + 10, legY + 1, { width: legItemW - 12, lineBreak: false });
        legX += legItemW;
      }
      doc.y = legY + 14;
      doc.moveDown(0.5);
    } else {
      doc.fontSize(9).font('Helvetica').fillColor('#757575')
        .text('No geo-tagged samples available for map rendering.', 60, doc.y, { width: W - 20 });
      doc.moveDown(1);
    }

    // ══════════════ PROBLEM AREAS ══════════════
    if (data.problemAreas.length) {
      sectionTitle('Problem Areas');
      narPara(narr.problem);
      const paHeaders = ['Location Name', 'Coordinates', 'Issue', 'Severity', 'Samples'];
      const paCols = [125, 95, 115, 65, 60];
      const paRows = data.problemAreas.map(p => [
        p.siteDistanceKm != null ? `${p.locationName} (~${p.siteDistanceKm} km)` : p.locationName,
        `${Number(p.lat).toFixed(4)}, ${Number(p.lon).toFixed(4)}`,
        p.issue, p.severity, p.sampleCount,
      ]);
      drawTable(paHeaders, paRows, paCols, { colorCol: [3] });
    }

    // ══════════════ CONCLUSIONS & RECOMMENDATIONS ══════════════
    sectionTitle('Conclusions & Recommendations');
    narPara(narr.recommendations);

    // ══════════════ FOOTERS ══════════════
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      if (i === 0) continue;
      doc.save();
      doc.fontSize(7).font('Helvetica').fillColor('#666666');
      const footerY = doc.page.height - 35;
      doc.text(
        `TNIP-R Confidential  |  Page ${i + 1} of ${totalPages}  |  Generated: ${dateStr}`,
        50, footerY, { width: W, align: 'center' },
      );
      doc.restore();
    }

    doc.end();
  });
}

// ─── Excel Generation ───────────────────────────────────────────────────────

export async function generateExcelReport(regionId = null) {
  const data = await getReportData(regionId);
  const wb = XLSX.utils.book_new();
  const dateStr = new Date(data.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── Sheet 1: Summary ──
  const summaryData = [
    ['NATCOM / TNIP-R Drive Test Analysis Report'],
    [],
    ['Report Scope', data.regionName],
    ['Generated', dateStr],
    [],
    ['Key Metrics'],
    ['Total Drive Tests', data.overview.totalTests],
    ['Total Measurement Samples', data.overview.totalSamples],
    ['Total Distance (km)', data.overview.totalDistance],
    ['Overall Average Score', data.overview.avgScore],
    [],
    ['Operators Analyzed', data.operators.length],
    ['Problem Areas Identified', data.problemAreas.length],
    ['Critical Issues', data.problemAreas.filter(p => p.severity === 'Critical').length],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // ── Sheet 2: KPI by Operator ──
  const kpiHeader = [
    'Operator', 'Tests', 'Samples',
    'RSRP Avg (dBm)', 'RSRP Min', 'RSRP Max',
    'SINR Avg (dB)', 'SINR Min', 'SINR Max',
    'DL Avg (kbps)', 'DL Peak (kbps)',
    'UL Avg (kbps)', 'UL Peak (kbps)',
    'Coverage %', 'Score', 'Rating',
  ];
  const kpiRows = data.operators.map(o => [
    o.name, o.tests, o.samples,
    o.avgRsrp, o.minRsrp, o.maxRsrp,
    o.avgSinr, o.minSinr, o.maxSinr,
    o.avgDl, o.maxDl,
    o.avgUl, o.maxUl,
    o.coveragePct, o.score, o.rating,
  ]);
  const wsKpi = XLSX.utils.aoa_to_sheet([kpiHeader, ...kpiRows]);
  wsKpi['!cols'] = kpiHeader.map(() => ({ wch: 15 }));
  wsKpi['!cols'][0] = { wch: 25 };
  XLSX.utils.book_append_sheet(wb, wsKpi, 'KPI by Operator');

  // ── Sheet 3: Coverage Distribution ──
  const covHeader = ['Operator', 'Excellent %', 'Good %', 'Fair %', 'Poor %', 'No Signal %'];
  const covRows = data.operators.map(o => [
    o.name, o.coverage.excellent, o.coverage.good,
    o.coverage.fair, o.coverage.poor, o.coverage.noSignal,
  ]);
  const wsCov = XLSX.utils.aoa_to_sheet([covHeader, ...covRows]);
  wsCov['!cols'] = covHeader.map(() => ({ wch: 15 }));
  wsCov['!cols'][0] = { wch: 25 };
  XLSX.utils.book_append_sheet(wb, wsCov, 'Coverage Distribution');

  // ── Sheet 4: Regional Summary (national only) ──
  if (!regionId && data.regions.length) {
    const regHeader = ['Region', 'Tests', 'Avg Score', 'Best Operator', 'Coverage %'];
    const regRows = data.regions.map(r => [
      r.name, r.tests, r.avgScore, r.bestOperator || 'N/A',
      r.coveragePct != null ? r.coveragePct : 'N/A',
    ]);
    const wsReg = XLSX.utils.aoa_to_sheet([regHeader, ...regRows]);
    wsReg['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 25 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsReg, 'Regional Summary');
  }

  // ── Sheet 5: Percentile Distribution (ETSI EG 202 057) ──
  const pctHeader = [
    'Operator',
    'RSRP P5 (dBm)', 'RSRP P50 (dBm)', 'RSRP P95 (dBm)',
    'SINR P5 (dB)', 'SINR P50 (dB)', 'SINR P95 (dB)',
    'DL P5 (kbps)', 'DL P50 (kbps)', 'DL P95 (kbps)',
    'RTT P50 (ms)', 'RTT P95 (ms)',
    'MOS P50',
  ];
  const pctExcelRows = data.operators.map(o => {
    const p = o.percentiles || {};
    return [
      o.name,
      p.rsrp?.p5 ?? '', p.rsrp?.p50 ?? '', p.rsrp?.p95 ?? '',
      p.sinr?.p5 ?? '', p.sinr?.p50 ?? '', p.sinr?.p95 ?? '',
      p.dl?.p5 ?? '', p.dl?.p50 ?? '', p.dl?.p95 ?? '',
      p.rtt?.p50 ?? '', p.rtt?.p95 ?? '',
      p.mos?.p50 ?? '',
    ];
  });
  const wsPct = XLSX.utils.aoa_to_sheet([pctHeader, ...pctExcelRows]);
  wsPct['!cols'] = pctHeader.map(() => ({ wch: 14 }));
  wsPct['!cols'][0] = { wch: 25 };
  XLSX.utils.book_append_sheet(wb, wsPct, 'Percentile Distribution');

  // ── Sheet 6: Call Quality (ITU-T E.800) ──
  const cqHeader = ['Operator', 'CSSR (%)', 'CDR (%)', 'Call Drops'];
  const cqExcelRows = data.operators.map(o => {
    const cq = o.callQuality || {};
    return [o.name, cq.cssr ?? '', cq.cdr ?? '', cq.drops ?? 0];
  });
  const wsCq = XLSX.utils.aoa_to_sheet([cqHeader, ...cqExcelRows]);
  wsCq['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsCq, 'Call Quality');

  // ── Sheet 7: Problem Areas ──
  const paHeader = ['Location Name', 'Nearest Site (km)', 'Latitude', 'Longitude', 'Issue', 'Severity', 'Sample Count'];
  const paRows = data.problemAreas.map(p => [
    p.locationName, p.siteDistanceKm, Number(p.lat), Number(p.lon),
    p.issue, p.severity, p.sampleCount,
  ]);
  const wsPa = XLSX.utils.aoa_to_sheet([paHeader, ...paRows]);
  wsPa['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsPa, 'Problem Areas');

  // ── Sheet 8: Sample Data ──
  const sHeader = [
    'Timestamp', 'Latitude', 'Longitude', 'RSRP (dBm)', 'RSRQ (dB)', 'SINR (dB)',
    'DL (kbps)', 'UL (kbps)', 'PCI', 'RTT (ms)', 'Jitter (ms)', 'Packet Loss (%)', 'MOS', 'Operator',
  ];
  const sRows = data.samples.map(s => [
    s.timestamp, s.lat, s.lon, s.rsrp, s.rsrq, s.sinr, s.dl, s.ul, s.pci,
    s.rtt_ms, s.jitter_ms, s.packet_loss_pct, s.mos, s.operator,
  ]);
  const wsSamples = XLSX.utils.aoa_to_sheet([sHeader, ...sRows]);
  wsSamples['!cols'] = sHeader.map(() => ({ wch: 14 }));
  wsSamples['!cols'][0] = { wch: 22 };
  wsSamples['!cols'][13] = { wch: 20 };
  XLSX.utils.book_append_sheet(wb, wsSamples, 'Sample Data');

  // ── Sheet 9: Config ──
  const cfgHeader = ['Setting', 'Value'];
  const cfgRows = Object.entries(data.config).map(([k, v]) => [k, v]);
  const wsCfg = XLSX.utils.aoa_to_sheet([cfgHeader, ...cfgRows]);
  wsCfg['!cols'] = [{ wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsCfg, 'Config');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export async function generateClusterPdf(htmlContent) {
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', right: '12mm', bottom: '10mm', left: '12mm' }
  });
  await browser.close();
  return Buffer.from(pdfBuffer);
}
