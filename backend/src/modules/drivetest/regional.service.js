import { query } from '../../config/db.js';
import { loadConfig } from './scoring.service.js';

// ─── Coordinate-based region detection for Sierra Leone ─────────────────────
const REGION_BOUNDS = {
  1: { name: 'Western Area', sql: 's.latitude >= 8.3 AND s.latitude <= 8.6 AND s.longitude >= -13.4 AND s.longitude <= -13.0' },
  2: { name: 'Northern', sql: 's.latitude > 8.6' },
  3: { name: 'Southern', sql: 's.latitude < 8.3 AND s.longitude > -12.5' },
  4: { name: 'Eastern', sql: 's.latitude < 9.0 AND s.longitude > -11.5' },
};

function detectRegionFromCoords(lat, lon) {
  if (lat >= 8.3 && lat <= 8.6 && lon >= -13.4 && lon <= -13.0) return 'Western Area';
  if (lat > 8.6) return 'Northern';
  if (lat < 9.0 && lon > -11.5) return 'Eastern';
  if (lat < 8.3 && lon > -12.5) return 'Southern';
  return null;
}

function regionSqlFilter(regionId) {
  const r = REGION_BOUNDS[regionId];
  return r ? r.sql : '1=0';
}

// ─── Major Sierra Leone towns for reverse-geocoding problem areas ───────────
const SL_TOWNS = [
  { name: 'Freetown', lat: 8.4657, lon: -13.2317 },
  { name: 'Waterloo', lat: 8.3378, lon: -13.0700 },
  { name: 'Tombo', lat: 8.2833, lon: -13.0500 },
  { name: 'Port Loko', lat: 8.7667, lon: -12.7833 },
  { name: 'Lunsar', lat: 8.6833, lon: -12.5333 },
  { name: 'Rokupr', lat: 8.6833, lon: -12.3833 },
  { name: 'Kambia', lat: 9.1256, lon: -12.9178 },
  { name: 'Makeni', lat: 8.8833, lon: -12.0500 },
  { name: 'Magburaka', lat: 8.7167, lon: -11.9500 },
  { name: 'Bumbuna', lat: 9.0500, lon: -11.7333 },
  { name: 'Kabala', lat: 9.5833, lon: -11.5500 },
  { name: 'Bo', lat: 7.9647, lon: -11.7383 },
  { name: 'Moyamba', lat: 8.1594, lon: -12.4283 },
  { name: 'Bonthe', lat: 7.5264, lon: -12.5050 },
  { name: 'Pujehun', lat: 7.3583, lon: -11.7208 },
  { name: 'Kenema', lat: 7.8767, lon: -11.1875 },
  { name: 'Segbwema', lat: 8.0000, lon: -10.9667 },
  { name: 'Kailahun', lat: 8.2833, lon: -10.5667 },
  { name: 'Koidu', lat: 8.6439, lon: -10.9714 },
  { name: 'Yengema', lat: 8.6333, lon: -11.0333 },
];

// Return the nearest town name; append a bearing when it's not right on top of it.
function nearestTown(lat, lon) {
  let best = null;
  let bestD = Infinity;
  for (const t of SL_TOWNS) {
    const dLat = (lat - t.lat) * 111;                          // km per degree lat
    const dLon = (lon - t.lon) * 111 * Math.cos(lat * Math.PI / 180);
    const d = Math.sqrt(dLat * dLat + dLon * dLon);
    if (d < bestD) { bestD = d; best = t; }
  }
  if (!best) return `Area ${lat}, ${lon}`;
  if (bestD <= 3) return best.name;                            // within ~3 km → in town
  const bearing = compassBearing(best.lat, best.lon, lat, lon);
  return `${Math.round(bestD)} km ${bearing} of ${best.name}`;
}

// Nearest cell site to a coordinate. Prefers a site owned by the same operator,
// falling back to the closest site of any operator.
function nearestSite(lat, lon, sites, operatorId = null) {
  const cosLat = Math.cos(lat * Math.PI / 180);
  const dist = t => {
    const dLat = (lat - t.lat) * 111;
    const dLon = (lon - t.lon) * 111 * cosLat;
    return Math.sqrt(dLat * dLat + dLon * dLon);
  };
  let bestSame = null, bestSameD = Infinity;
  let bestAny = null, bestAnyD = Infinity;
  for (const t of sites) {
    const d = dist(t);
    if (d < bestAnyD) { bestAnyD = d; bestAny = t; }
    if (operatorId != null && t.operatorId === operatorId && d < bestSameD) { bestSameD = d; bestSame = t; }
  }
  const pick = bestSame || bestAny;
  if (!pick) return null;
  return { siteName: pick.siteName, distanceKm: bestSame ? bestSameD : bestAnyD };
}

function compassBearing(fromLat, fromLon, toLat, toLon) {
  const dLat = toLat - fromLat;
  const dLon = toLon - fromLon;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  let angle = Math.atan2(dLon, dLat) * 180 / Math.PI;          // 0 = north, clockwise
  if (angle < 0) angle += 360;
  return dirs[Math.round(angle / 45) % 8];
}

function rating(score) {
  if (score >= 75) return 'Pass';
  if (score >= 60) return 'Warning';
  return 'Fail';
}

function round2(v) {
  return v != null ? Number(Number(v).toFixed(2)) : null;
}

function pct(num, den) {
  return den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0;
}

// ─── 1. Regional Overview ───────────────────────────────────────────────────
export async function getRegionalOverview() {
  const config = await loadConfig();

  const rows = await query(`
    SELECT
      o.operator_id AS operatorId,
      o.operator_name AS operatorName,
      dt.drive_test_id,
      dt.overall_score,
      dt.total_samples,
      dt.distance_km,
      s.rsrp,
      s.sinr,
      s.dl_throughput,
      s.latitude,
      s.longitude
    FROM drive_test_samples s
    JOIN drive_tests dt ON dt.drive_test_id = s.drive_test_id
    JOIN operators o ON o.operator_id = dt.operator_id
    WHERE dt.status = 'COMPLETED'
  `);

  // Group by region, applying fallback for null regions
  const regionMap = new Map();
  // Pre-load known regions
  const knownRegions = await query('SELECT region_id, name, code FROM regions');
  for (const kr of knownRegions) {
    regionMap.set(kr.region_id, {
      regionId: kr.region_id,
      regionName: kr.name,
      regionCode: kr.code,
      testSet: new Set(),
      samples: 0,
      distanceSet: new Map(),
      rsrpSum: 0, rsrpCount: 0,
      sinrSum: 0, sinrCount: 0,
      dlSum: 0, dlCount: 0,
      coverageGood: 0,
      scoreMap: new Map(),
      operatorMap: new Map(),
    });
  }

  for (const row of rows) {
    const detected = detectRegionFromCoords(Number(row.latitude), Number(row.longitude));
    if (!detected) continue;
    const match = knownRegions.find(kr => kr.name === detected);
    if (!match) continue;
    const regionId = match.region_id;

    if (!regionMap.has(regionId)) continue;
    const reg = regionMap.get(regionId);

    reg.testSet.add(row.drive_test_id);
    reg.samples++;
    if (row.distance_km != null) reg.distanceSet.set(row.drive_test_id, Number(row.distance_km));

    if (row.rsrp != null) { reg.rsrpSum += Number(row.rsrp); reg.rsrpCount++; if (Number(row.rsrp) >= config.rsrp_threshold) reg.coverageGood++; }
    if (row.sinr != null) { reg.sinrSum += Number(row.sinr); reg.sinrCount++; }
    if (row.dl_throughput != null && Number(row.dl_throughput) > 0) { reg.dlSum += Number(row.dl_throughput); reg.dlCount++; }

    if (row.overall_score != null) reg.scoreMap.set(row.drive_test_id, Number(row.overall_score));

    // Operator aggregation
    const opKey = row.operatorId;
    if (!reg.operatorMap.has(opKey)) {
      reg.operatorMap.set(opKey, { operatorId: opKey, operatorName: row.operatorName, testSet: new Set(), scoreSum: 0, scoreCount: 0 });
    }
    const op = reg.operatorMap.get(opKey);
    op.testSet.add(row.drive_test_id);
    if (row.overall_score != null && !op.testSet._scored?.has(row.drive_test_id)) {
      if (!op.testSet._scored) op.testSet._scored = new Set();
      if (!op.testSet._scored.has(row.drive_test_id)) {
        op.testSet._scored.add(row.drive_test_id);
        op.scoreSum += Number(row.overall_score);
        op.scoreCount++;
      }
    }
  }

  let totalTests = 0, totalSamples = 0, scoreSum = 0, scoreCount = 0;
  const regions = [];

  for (const reg of regionMap.values()) {
    const tests = reg.testSet.size;
    const samples = reg.samples;
    const distance = round2([...reg.distanceSet.values()].reduce((a, b) => a + b, 0));
    const scores = [...reg.scoreMap.values()];
    const avgScore = scores.length > 0 ? round2(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const operators = [...reg.operatorMap.values()].map(op => ({
      operatorId: op.operatorId,
      operatorName: op.operatorName,
      tests: op.testSet.size,
      avgScore: round2(op.scoreCount > 0 ? op.scoreSum / op.scoreCount : 0),
    }));

    regions.push({
      regionId: reg.regionId,
      regionName: reg.regionName,
      regionCode: reg.regionCode,
      totalTests: tests,
      totalSamples: samples,
      totalDistance: distance,
      avgScore,
      status: rating(avgScore),
      avgRsrp: round2(reg.rsrpCount > 0 ? reg.rsrpSum / reg.rsrpCount : null),
      avgSinr: round2(reg.sinrCount > 0 ? reg.sinrSum / reg.sinrCount : null),
      avgDl: round2(reg.dlCount > 0 ? reg.dlSum / reg.dlCount / 1000 : null),
      coveragePct: pct(reg.coverageGood, reg.rsrpCount),
      operators,
    });

    totalTests += tests;
    totalSamples += samples;
    if (avgScore > 0) { scoreSum += avgScore; scoreCount++; }
  }

  return {
    regions,
    summary: {
      totalRegions: regions.length,
      totalTests,
      totalSamples,
      overallAvgScore: round2(scoreCount > 0 ? scoreSum / scoreCount : 0),
    },
  };
}

// ─── 2. Regional Detail ─────────────────────────────────────────────────────
export async function getRegionalDetail(regionId) {
  const config = await loadConfig();
  regionId = Number(regionId);

  // Region info
  const [regionRow] = await query('SELECT region_id, name, code FROM regions WHERE region_id = ?', [regionId]);
  if (!regionRow) throw new Error(`Region ${regionId} not found`);

  const region = { regionId: regionRow.region_id, regionName: regionRow.name, regionCode: regionRow.code };

  const rFilter = regionSqlFilter(regionId);

  const opRows = await query(`
    SELECT
      o.operator_id       AS operatorId,
      o.operator_name     AS operatorName,
      COUNT(DISTINCT dt.drive_test_id) AS tests,
      COUNT(s.sample_id)  AS samples,
      ROUND(SUM(DISTINCT dt.distance_km), 2) AS distance,
      AVG(dt.overall_score) AS avgScore,
      AVG(s.rsrp)         AS avgRsrp,
      AVG(s.rsrq)         AS avgRsrq,
      AVG(s.sinr)         AS avgSinr,
      AVG(CASE WHEN s.dl_throughput > 0 THEN s.dl_throughput END) AS avgDl,
      AVG(CASE WHEN s.ul_throughput > 0 THEN s.ul_throughput END) AS avgUl,
      MAX(s.dl_throughput) AS maxDl,
      MAX(s.ul_throughput) AS maxUl,
      SUM(CASE WHEN s.rsrp >= ? THEN 1 ELSE 0 END) AS rsrpExcellent,
      SUM(CASE WHEN s.rsrp >= ? AND s.rsrp < ? THEN 1 ELSE 0 END) AS rsrpGood,
      SUM(CASE WHEN s.rsrp >= ? AND s.rsrp < ? THEN 1 ELSE 0 END) AS rsrpFair,
      SUM(CASE WHEN s.rsrp >= ? AND s.rsrp < ? THEN 1 ELSE 0 END) AS rsrpPoor,
      SUM(CASE WHEN s.rsrp < ? THEN 1 ELSE 0 END) AS rsrpNoSignal,
      SUM(CASE WHEN s.rsrp IS NOT NULL THEN 1 ELSE 0 END) AS rsrpTotal,
      SUM(CASE WHEN s.rsrp >= ? THEN 1 ELSE 0 END) AS rsrpPassCount,
      SUM(CASE WHEN s.sinr >= ? THEN 1 ELSE 0 END) AS sinrPassCount,
      SUM(CASE WHEN s.sinr IS NOT NULL THEN 1 ELSE 0 END) AS sinrTotal,
      SUM(CASE WHEN s.dl_throughput >= ? THEN 1 ELSE 0 END) AS dlPassCount,
      SUM(CASE WHEN s.dl_throughput > 0 THEN 1 ELSE 0 END) AS dlTotal
    FROM drive_test_samples s
    JOIN drive_tests dt ON dt.drive_test_id = s.drive_test_id
    JOIN operators o ON o.operator_id = dt.operator_id
    WHERE dt.status = 'COMPLETED' AND ${rFilter}
    GROUP BY o.operator_id, o.operator_name
    ORDER BY avgScore DESC
  `, [
    config.rsrp_excellent,
    config.rsrp_good, config.rsrp_excellent,
    config.rsrp_fair, config.rsrp_good,
    config.rsrp_poor, config.rsrp_fair,
    config.rsrp_poor,
    config.rsrp_threshold,
    config.sinr_threshold,
    config.dl_threshold,
  ]);

  let totalTests = 0, totalSamples = 0, totalDistance = 0, scoreSum = 0, scoreCount = 0;
  const operators = [];

  for (const r of opRows) {
    const score = round2(r.avgScore) || 0;
    const samples = Number(r.samples);
    const op = {
      operatorId: r.operatorId,
      operatorName: r.operatorName,
      tests: Number(r.tests),
      samples,
      distance: round2(r.distance),
      avgScore: score,
      rating: rating(score),
      kpi: {
        avgRsrp: round2(r.avgRsrp),
        avgRsrq: round2(r.avgRsrq),
        avgSinr: round2(r.avgSinr),
        avgDl: round2(r.avgDl != null ? r.avgDl / 1000 : null),
        avgUl: round2(r.avgUl != null ? r.avgUl / 1000 : null),
        maxDl: round2(r.maxDl != null ? r.maxDl / 1000 : null),
        maxUl: round2(r.maxUl != null ? r.maxUl / 1000 : null),
      },
      coverage: {
        excellent: pct(r.rsrpExcellent, r.rsrpTotal),
        good: pct(r.rsrpGood, r.rsrpTotal),
        fair: pct(r.rsrpFair, r.rsrpTotal),
        poor: pct(r.rsrpPoor, r.rsrpTotal),
        noSignal: pct(r.rsrpNoSignal, r.rsrpTotal),
        coveragePct: pct(r.rsrpPassCount, r.rsrpTotal),
      },
      compliance: {
        rsrpPass: pct(r.rsrpPassCount, r.rsrpTotal),
        sinrPass: pct(r.sinrPassCount, r.sinrTotal),
        dlPass: pct(r.dlPassCount, r.dlTotal),
      },
    };
    operators.push(op);
    totalTests += op.tests;
    totalSamples += samples;
    totalDistance += Number(r.distance) || 0;
    if (score > 0) { scoreSum += score; scoreCount++; }
  }

  const overallScore = round2(scoreCount > 0 ? scoreSum / scoreCount : 0);
  const overview = {
    totalTests,
    totalSamples,
    totalDistance: round2(totalDistance),
    avgScore: overallScore,
    rating: rating(overallScore),
  };

  // Comparison chart data
  const comparisonChart = {
    labels: operators.map(o => o.operatorName),
    datasets: {
      rsrp: operators.map(o => o.kpi.avgRsrp),
      sinr: operators.map(o => o.kpi.avgSinr),
      dl: operators.map(o => o.kpi.avgDl),
      coverage: operators.map(o => o.coverage.coveragePct),
    },
  };

  // Coverage distribution
  const coverageDistribution = [
    { class: 'Excellent', ...Object.fromEntries(operators.map(o => [o.operatorName, o.coverage.excellent])) },
    { class: 'Good', ...Object.fromEntries(operators.map(o => [o.operatorName, o.coverage.good])) },
    { class: 'Fair', ...Object.fromEntries(operators.map(o => [o.operatorName, o.coverage.fair])) },
    { class: 'Poor', ...Object.fromEntries(operators.map(o => [o.operatorName, o.coverage.poor])) },
    { class: 'No Signal', ...Object.fromEntries(operators.map(o => [o.operatorName, o.coverage.noSignal])) },
  ];

  const problemRows = await query(`
    SELECT
      ROUND(s.latitude, 3) AS lat,
      ROUND(s.longitude, 3) AS lon,
      AVG(s.rsrp) AS avgRsrp,
      o.operator_id   AS operatorId,
      o.operator_name AS operatorName
    FROM drive_test_samples s
    JOIN drive_tests dt ON dt.drive_test_id = s.drive_test_id
    JOIN operators o ON o.operator_id = dt.operator_id
    WHERE dt.status = 'COMPLETED' AND ${rFilter}
      AND s.rsrp IS NOT NULL
    GROUP BY ROUND(s.latitude, 3), ROUND(s.longitude, 3), o.operator_id
    HAVING avgRsrp < ?
    ORDER BY avgRsrp ASC
    LIMIT 10
  `, [config.rsrp_fair]);

  // Load geocoded sites once for nearest-site labeling of problem areas.
  const siteRows = await query(`
    SELECT site_name AS siteName, operator_id AS operatorId, latitude AS lat, longitude AS lon
    FROM sites
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND deleted_at IS NULL
  `);
  const sites = siteRows.map(s => ({ siteName: s.siteName, operatorId: s.operatorId, lat: Number(s.lat), lon: Number(s.lon) }));

  const problemAreas = problemRows.map(p => {
    const lat = Number(p.lat), lon = Number(p.lon);
    const site = nearestSite(lat, lon, sites, p.operatorId);
    return {
      lat,
      lon,
      locationName: site ? site.siteName : nearestTown(lat, lon),
      nearestSite: site ? site.siteName : null,
      siteDistanceKm: site ? round2(site.distanceKm) : null,
      avgRsrp: round2(p.avgRsrp),
      severity: Number(p.avgRsrp) < config.rsrp_poor ? 'High' : 'Medium',
      operatorName: p.operatorName,
    };
  });

  const mapRows = await query(`
    SELECT s.latitude AS lat, s.longitude AS lon, s.rsrp, s.sinr, s.dl_throughput AS dl,
           o.operator_id AS operatorId, o.operator_name AS operatorName
    FROM drive_test_samples s
    JOIN drive_tests dt ON dt.drive_test_id = s.drive_test_id
    JOIN operators o ON o.operator_id = dt.operator_id
    WHERE dt.status = 'COMPLETED' AND ${rFilter}
      AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
    ORDER BY RAND()
    LIMIT 2000
  `);

  const mapData = mapRows.map(m => ({
    lat: Number(m.lat),
    lon: Number(m.lon),
    rsrp: round2(m.rsrp),
    sinr: round2(m.sinr),
    dl: m.dl != null ? Number(m.dl) : null,
    operatorId: m.operatorId,
    operatorName: m.operatorName,
  }));

  // AI summary
  const aiSummary = generateRegionalAiSummary(region.regionName, overview, operators, config);

  return {
    region,
    overview,
    operators,
    comparisonChart,
    coverageDistribution,
    problemAreas,
    mapData,
    aiSummary,
  };
}

// ─── 3. Regional Comparison ─────────────────────────────────────────────────
export async function getRegionalComparison() {
  const config = await loadConfig();

  const allSamples = await query(`
    SELECT s.latitude, s.longitude, s.rsrp, s.sinr, s.dl_throughput,
           dt.drive_test_id, dt.overall_score
    FROM drive_test_samples s
    JOIN drive_tests dt ON dt.drive_test_id = s.drive_test_id
    WHERE dt.status = 'COMPLETED'
  `);

  const knownRegions = await query('SELECT region_id, name, code FROM regions');
  const buckets = new Map();
  for (const kr of knownRegions) {
    buckets.set(kr.name, { regionName: kr.name, rsrpSum: 0, rsrpCnt: 0, sinrSum: 0, sinrCnt: 0,
      dlSum: 0, dlCnt: 0, coverageGood: 0, rsrpTotal: 0, testSet: new Set(), samples: 0, scoreMap: new Map() });
  }

  for (const s of allSamples) {
    const rName = detectRegionFromCoords(Number(s.latitude), Number(s.longitude));
    if (!rName || !buckets.has(rName)) continue;
    const b = buckets.get(rName);
    b.samples++;
    b.testSet.add(s.drive_test_id);
    if (s.overall_score != null) b.scoreMap.set(s.drive_test_id, Number(s.overall_score));
    if (s.rsrp != null) { b.rsrpSum += Number(s.rsrp); b.rsrpCnt++; b.rsrpTotal++; if (Number(s.rsrp) >= config.rsrp_threshold) b.coverageGood++; }
    if (s.sinr != null) { b.sinrSum += Number(s.sinr); b.sinrCnt++; }
    if (s.dl_throughput != null && Number(s.dl_throughput) > 0) { b.dlSum += Number(s.dl_throughput); b.dlCnt++; }
  }

  const rows = [...buckets.values()].map(b => {
    const scores = [...b.scoreMap.values()];
    return {
      regionName: b.regionName,
      avgScore: scores.length ? round2(scores.reduce((a, c) => a + c, 0) / scores.length) : 0,
      avgRsrp: b.rsrpCnt > 0 ? round2(b.rsrpSum / b.rsrpCnt) : null,
      avgSinr: b.sinrCnt > 0 ? round2(b.sinrSum / b.sinrCnt) : null,
      avgDl: b.dlCnt > 0 ? round2(b.dlSum / b.dlCnt) : null,
      coverageGood: b.coverageGood,
      rsrpTotal: b.rsrpTotal,
      tests: b.testSet.size,
      samples: b.samples,
    };
  });

  const regions = rows.map(r => ({
    regionName: r.regionName,
    avgScore: r.avgScore || 0,
    avgRsrp: r.avgRsrp,
    avgSinr: r.avgSinr,
    avgDl: r.avgDl != null ? round2(r.avgDl / 1000) : null,
    coveragePct: pct(r.coverageGood, r.rsrpTotal),
    tests: r.tests || 0,
    samples: r.samples || 0,
  }));

  const scored = regions.filter(r => r.avgScore > 0);
  const bestRegion = scored.length > 0 ? scored.reduce((a, b) => a.avgScore >= b.avgScore ? a : b).regionName : null;
  const worstRegion = scored.length > 0 ? scored.reduce((a, b) => a.avgScore <= b.avgScore ? a : b).regionName : null;

  const chartData = regions.map(r => ({
    region: r.regionName,
    score: r.avgScore,
    rsrp: r.avgRsrp,
    sinr: r.avgSinr,
    dl: r.avgDl,
    coverage: r.coveragePct,
  }));

  return { regions, bestRegion, worstRegion, chartData };
}

// ─── 4. District-level Analysis ─────────────────────────────────────────────

// Sierra Leone's 16 districts with approximate centroids (nearest-centroid assignment)
const SL_DISTRICTS = [
  { id: 1,  name: 'Western Urban', region: 'Western Area', lat: 8.490, lon: -13.235 },
  { id: 2,  name: 'Western Rural', region: 'Western Area', lat: 8.340, lon: -13.050 },
  { id: 3,  name: 'Port Loko',     region: 'Northern',     lat: 8.767, lon: -12.783 },
  { id: 4,  name: 'Kambia',        region: 'Northern',     lat: 9.125, lon: -12.917 },
  { id: 5,  name: 'Bombali',       region: 'Northern',     lat: 8.883, lon: -12.050 },
  { id: 6,  name: 'Tonkolili',     region: 'Northern',     lat: 8.717, lon: -11.950 },
  { id: 7,  name: 'Koinadugu',     region: 'Northern',     lat: 9.583, lon: -11.550 },
  { id: 8,  name: 'Falaba',        region: 'Northern',     lat: 9.850, lon: -11.317 },
  { id: 9,  name: 'Bo',            region: 'Southern',     lat: 7.965, lon: -11.738 },
  { id: 10, name: 'Moyamba',       region: 'Southern',     lat: 8.160, lon: -12.428 },
  { id: 11, name: 'Pujehun',       region: 'Southern',     lat: 7.358, lon: -11.721 },
  { id: 12, name: 'Bonthe',        region: 'Southern',     lat: 7.526, lon: -12.505 },
  { id: 13, name: 'Kenema',        region: 'Eastern',      lat: 7.877, lon: -11.188 },
  { id: 14, name: 'Kono',          region: 'Eastern',      lat: 8.644, lon: -10.971 },
  { id: 15, name: 'Kailahun',      region: 'Eastern',      lat: 8.283, lon: -10.567 },
];

function detectDistrict(lat, lon) {
  const cosLat = Math.cos(lat * Math.PI / 180);
  let best = null, bestD = Infinity;
  for (const d of SL_DISTRICTS) {
    const dLat = (lat - d.lat) * 111;
    const dLon = (lon - d.lon) * 111 * cosLat;
    const dist = Math.sqrt(dLat * dLat + dLon * dLon);
    if (dist < bestD) { bestD = dist; best = d; }
  }
  return best;
}

export async function getDistrictData() {
  const config = await loadConfig();

  const rows = await query(`
    SELECT s.latitude, s.longitude, s.rsrp, s.sinr, s.dl_throughput,
           dt.drive_test_id, dt.overall_score,
           o.operator_id AS operatorId, o.operator_name AS operatorName
    FROM drive_test_samples s
    JOIN drive_tests dt ON dt.drive_test_id = s.drive_test_id AND dt.status = 'COMPLETED'
    JOIN operators o ON o.operator_id = dt.operator_id
    WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL
  `);

  // buckets: districtId → operatorId → aggregation
  const distBuckets = new Map();

  for (const row of rows) {
    const dist = detectDistrict(Number(row.latitude), Number(row.longitude));
    if (!dist) continue;

    if (!distBuckets.has(dist.id)) distBuckets.set(dist.id, { meta: dist, ops: new Map() });
    const distEntry = distBuckets.get(dist.id);

    const opId = row.operatorId;
    if (!distEntry.ops.has(opId)) {
      distEntry.ops.set(opId, {
        operatorId: opId, operatorName: row.operatorName,
        testSet: new Set(), samples: 0,
        rsrpSum: 0, rsrpCnt: 0,
        sinrSum: 0, sinrCnt: 0,
        dlSum: 0, dlCnt: 0,
        coverageGood: 0, scoreMap: new Map(),
      });
    }
    const op = distEntry.ops.get(opId);
    op.testSet.add(row.drive_test_id);
    op.samples++;
    if (row.rsrp != null) {
      op.rsrpSum += Number(row.rsrp); op.rsrpCnt++;
      if (Number(row.rsrp) >= config.rsrp_threshold) op.coverageGood++;
    }
    if (row.sinr != null) { op.sinrSum += Number(row.sinr); op.sinrCnt++; }
    if (row.dl_throughput != null && Number(row.dl_throughput) > 0) { op.dlSum += Number(row.dl_throughput); op.dlCnt++; }
    if (row.overall_score != null) op.scoreMap.set(row.drive_test_id, Number(row.overall_score));
  }

  const districts = [];
  for (const { meta, ops } of distBuckets.values()) {
    const opList = [];
    for (const op of ops.values()) {
      const scores = [...op.scoreMap.values()];
      const avgScore = scores.length ? round2(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      opList.push({
        operatorId: op.operatorId,
        operatorName: op.operatorName,
        tests: op.testSet.size,
        samples: op.samples,
        avgRsrp: op.rsrpCnt > 0 ? round2(op.rsrpSum / op.rsrpCnt) : null,
        avgSinr: op.sinrCnt > 0 ? round2(op.sinrSum / op.sinrCnt) : null,
        avgDl: op.dlCnt > 0 ? round2(op.dlSum / op.dlCnt / 1000) : null,
        coveragePct: pct(op.coverageGood, op.rsrpCnt),
        avgScore,
        rating: rating(avgScore),
      });
    }
    opList.sort((a, b) => b.avgScore - a.avgScore);

    // District-level roll-up (across all operators)
    const allScores = opList.flatMap(o => [...(ops.get(o.operatorId)?.scoreMap.values() || [])]);
    const distScore = allScores.length ? round2(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
    const totalSamples = opList.reduce((s, o) => s + o.samples, 0);
    const totalTests = opList.reduce((s, o) => s + o.tests, 0);
    const goodSamples = opList.reduce((s, o) => s + (ops.get(o.operatorId)?.coverageGood || 0), 0);
    const rsrpTotal = opList.reduce((s, o) => s + (ops.get(o.operatorId)?.rsrpCnt || 0), 0);

    districts.push({
      districtId: meta.id,
      districtName: meta.name,
      region: meta.region,
      totalTests,
      totalSamples,
      avgScore: distScore,
      rating: rating(distScore),
      coveragePct: pct(goodSamples, rsrpTotal),
      operators: opList,
    });
  }

  // Order by region then district name
  const REGION_ORDER = { 'Western Area': 0, 'Northern': 1, 'Southern': 2, 'Eastern': 3 };
  districts.sort((a, b) =>
    (REGION_ORDER[a.region] ?? 9) - (REGION_ORDER[b.region] ?? 9) ||
    a.districtName.localeCompare(b.districtName)
  );

  // Collect all unique operator names
  const allOperators = [...new Map(
    districts.flatMap(d => d.operators.map(o => [o.operatorId, o.operatorName]))
  ).entries()].map(([id, name]) => ({ operatorId: id, operatorName: name }));

  return { districts, operators: allOperators };
}

// ─── 4. AI Summary Generator ────────────────────────────────────────────────
export function generateRegionalAiSummary(regionName, overview, operators, config) {
  const { totalTests, totalSamples, totalDistance, avgScore, rating: rat } = overview;

  let summary = `Regional Analysis for ${regionName}: ${totalTests} drive test(s) conducted covering ${totalDistance || 0} km with ${totalSamples} samples collected. The region achieved an overall quality score of ${avgScore}/100 (${rat}).`;

  // Best and worst operators
  if (operators.length > 0) {
    const sorted = [...operators].sort((a, b) => b.avgScore - a.avgScore);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    summary += `\n\n${best.operatorName} leads the region with a score of ${best.avgScore}/100`;
    if (best.kpi.avgDl != null) summary += ` and average download speed of ${best.kpi.avgDl} Mbps`;
    summary += '.';

    if (operators.length > 1 && worst.operatorName !== best.operatorName) {
      summary += ` ${worst.operatorName} trails with a score of ${worst.avgScore}/100`;
      if (worst.kpi.avgDl != null) summary += ` and ${worst.kpi.avgDl} Mbps average download`;
      summary += '.';
    }
  }

  // Key KPI findings
  const avgRsrpAll = operators.length > 0
    ? operators.reduce((s, o) => s + (o.kpi.avgRsrp || 0), 0) / operators.length
    : null;
  const avgCoverage = operators.length > 0
    ? operators.reduce((s, o) => s + (o.coverage?.coveragePct || 0), 0) / operators.length
    : 0;

  if (avgRsrpAll != null) {
    const qual = avgRsrpAll >= config.rsrp_excellent ? 'excellent'
      : avgRsrpAll >= config.rsrp_good ? 'good'
      : avgRsrpAll >= config.rsrp_fair ? 'fair' : 'poor';
    summary += `\n\nSignal strength across the region averages ${avgRsrpAll.toFixed(1)} dBm (${qual}).`;
  }

  if (avgCoverage < config.coverage_target) {
    summary += ` Coverage at ${avgCoverage.toFixed(1)}% is below the ${config.coverage_target}% regulatory target.`;
  } else {
    summary += ` Coverage at ${avgCoverage.toFixed(1)}% meets the ${config.coverage_target}% regulatory target.`;
  }

  // Recommendations
  const failingOps = operators.filter(o => o.compliance && o.compliance.rsrpPass < config.coverage_target);
  if (failingOps.length > 0) {
    summary += `\n\nRecommendations: ${failingOps.map(o => o.operatorName).join(', ')} should prioritize coverage improvements in this region. `;
    summary += 'Focus areas include deploying additional cell sites in underserved corridors and optimizing antenna tilt/power for existing infrastructure.';
  } else if (operators.length > 0) {
    summary += '\n\nAll operators meet basic coverage thresholds. Continued monitoring and capacity upgrades are recommended to maintain quality of service.';
  }

  return summary;
}
