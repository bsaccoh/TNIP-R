import { query } from '../../config/db.js';

let _configCache = null;
let _configTs = 0;
const CACHE_TTL = 60_000;

// Metric weights per technology — only include metrics that exist for each tech
const TECH_WEIGHTS = {
  '4G': { rsrp: 0.35, sinr: 0.25, dl: 0.25, rsrq: 0.15 },
  '3G': { rsrp: 0.40, rsrq: 0.35, dl: 0.25 },
  '2G': { rsrq: 0.50, dl: 0.30, rsrp: 0.20 },
};

// Field label names for AI summary per technology
const TECH_FIELD_LABELS = {
  '3G': { rsrp: 'RSCP', rsrq: 'Ec/No', sinr: null },
  '4G': { rsrp: 'RSRP', rsrq: 'RSRQ', sinr: 'SINR' },
  '2G': { rsrp: 'RxLevel', rsrq: 'RxQual', sinr: null },
};

export async function loadConfig() {
  if (_configCache && Date.now() - _configTs < CACHE_TTL) return _configCache;
  const rows = await query('SELECT config_key, config_value FROM drive_test_config').catch(() => []);
  const c = {};
  for (const r of rows) {
    try { c[r.config_key] = JSON.parse(r.config_value); } catch { c[r.config_key] = r.config_value; }
  }
  _configCache = {
    rsrp_threshold:    c.rsrp_threshold   ?? -100,
    rsrq_threshold:    c.rsrq_threshold   ?? -12,
    sinr_threshold:    c.sinr_threshold   ?? 5,
    dl_threshold:      c.dl_threshold     ?? 2000,
    ul_threshold:      c.ul_threshold     ?? 500,
    coverage_target:   c.coverage_target  ?? 95,
    rsrp_excellent:    c.rsrp_excellent   ?? -80,
    rsrp_good:         c.rsrp_good        ?? -90,
    rsrp_fair:         c.rsrp_fair        ?? -100,
    rsrp_poor:         c.rsrp_poor        ?? -110,
    sinr_excellent:    c.sinr_excellent   ?? 20,
    sinr_good:         c.sinr_good        ?? 10,
    sinr_fair:         c.sinr_fair        ?? 0,
    score_weight_rsrp: c.score_weight_rsrp ?? 0.35,
    score_weight_sinr: c.score_weight_sinr ?? 0.25,
    score_weight_dl:   c.score_weight_dl   ?? 0.25,
    score_weight_rsrq: c.score_weight_rsrq ?? 0.15,
  };
  _configTs = Date.now();
  return _configCache;
}

export function clearConfigCache() {
  _configCache = null;
  _configTs = 0;
}

// Load pass_value + pass_direction from signal_thresholds for a given technology.
// Returns { rsrp, rsrq, sinr, dl, ul } each as { pass_value, pass_direction }.
async function loadSignalThresholds(technology) {
  const tech = technology || '4G';
  const techRows = await query(
    `SELECT metric, pass_value, pass_direction FROM signal_thresholds WHERE technology = :tech`,
    { tech }
  ).catch(() => []);
  const allRows = await query(
    `SELECT metric, pass_value, pass_direction FROM signal_thresholds WHERE technology = 'ALL'`
  ).catch(() => []);

  const result = {};
  for (const r of [...techRows, ...allRows]) {
    const key = r.metric === 'dl_throughput' ? 'dl'
              : r.metric === 'ul_throughput' ? 'ul'
              : r.metric; // rsrp, rsrq, sinr
    if (!result[key]) {
      result[key] = { pass_value: Number(r.pass_value), pass_direction: r.pass_direction };
    }
  }
  return result;
}

// Technology-aware overall score.
// Each metric is scored as % of samples meeting the pass threshold from signal_thresholds.
// Weights are technology-specific. Metrics with no data are excluded and remaining weights normalised.
export async function calculateOverallScore(samples, cfg, technology) {
  if (!samples || samples.length === 0) return 0;

  const tech = technology || '4G';
  const weights = TECH_WEIGHTS[tech] || TECH_WEIGHTS['4G'];
  const thresholds = await loadSignalThresholds(tech);

  let totalScore = 0;
  let totalWeight = 0;

  for (const [metric, weight] of Object.entries(weights)) {
    if (!weight) continue;
    const th = thresholds[metric];
    if (!th) continue;

    let valid = 0, pass = 0;
    for (const s of samples) {
      const val = metric === 'rsrp' ? s.rsrp
                : metric === 'rsrq' ? s.rsrq
                : metric === 'sinr' ? s.sinr
                : metric === 'dl'   ? s.dl_throughput
                : null;

      if (val == null || isNaN(Number(val))) continue;
      if (metric === 'dl' && Number(val) <= 0) continue;

      valid++;
      const n = Number(val);
      const passes = th.pass_direction === 'lte' ? n <= th.pass_value : n >= th.pass_value;
      if (passes) pass++;
    }

    if (valid > 0) {
      totalScore += (pass / valid) * 100 * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;
  // Normalise by actual total weight so missing metrics don't deflate the score
  return Number((totalScore / totalWeight).toFixed(2));
}

export async function computeDetailedStats(samples, cfg) {
  const c = cfg || await loadConfig();
  const vals = { rsrp: [], rsrq: [], sinr: [], dl: [], ul: [] };
  for (const s of samples) {
    if (s.rsrp != null) vals.rsrp.push(Number(s.rsrp));
    if (s.rsrq != null) vals.rsrq.push(Number(s.rsrq));
    if (s.sinr != null) vals.sinr.push(Number(s.sinr));
    if (s.dl_throughput != null && Number(s.dl_throughput) > 0) vals.dl.push(Number(s.dl_throughput));
    if (s.ul_throughput != null && Number(s.ul_throughput) > 0) vals.ul.push(Number(s.ul_throughput));
  }

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const med = arr => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };

  const dist = {
    excellent: vals.rsrp.filter(v => v >= c.rsrp_excellent).length,
    good:      vals.rsrp.filter(v => v >= c.rsrp_good && v < c.rsrp_excellent).length,
    fair:      vals.rsrp.filter(v => v >= c.rsrp_fair && v < c.rsrp_good).length,
    poor:      vals.rsrp.filter(v => v >= c.rsrp_poor && v < c.rsrp_fair).length,
    noSignal:  vals.rsrp.filter(v => v < c.rsrp_poor).length,
    rscpGte70: vals.rsrp.filter(v => v >= -70).length,
    ecnoBetween: vals.rsrq.filter(v => v >= -12 && v <= 15).length,
  };

  return {
    avgRsrp: avg(vals.rsrp),
    minRsrp: vals.rsrp.length ? Math.min(...vals.rsrp) : null,
    maxRsrp: vals.rsrp.length ? Math.max(...vals.rsrp) : null,
    avgRsrq: avg(vals.rsrq),
    minRsrq: vals.rsrq.length ? Math.min(...vals.rsrq) : null,
    avgSinr: avg(vals.sinr),
    minSinr: vals.sinr.length ? Math.min(...vals.sinr) : null,
    maxSinr: vals.sinr.length ? Math.max(...vals.sinr) : null,
    avgDl: avg(vals.dl),
    maxDl: vals.dl.length ? Math.max(...vals.dl) : null,
    medDl: med(vals.dl),
    avgUl: avg(vals.ul),
    maxUl: vals.ul.length ? Math.max(...vals.ul) : null,
    medUl: med(vals.ul),
    distribution: dist,
    totalSamples: samples.length,
    config: c,
  };
}

export async function generateAiSummary(operatorName, score, distance, numSamples, detailedStats, technology) {
  const c = detailedStats?.config || await loadConfig();
  const tech = technology || '4G';
  const labels = TECH_FIELD_LABELS[tech] || TECH_FIELD_LABELS['4G'];
  const quality = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : 'Poor';

  let summary = `Drive test for ${operatorName}: ${distance} km covered, ${numSamples} samples collected. Overall score: **${score}/100 (${quality})**.`;

  if (detailedStats) {
    const s = detailedStats;
    if (s.avgRsrp != null) {
      const rsrpQual = s.avgRsrp >= c.rsrp_excellent ? 'strong'
                     : s.avgRsrp >= c.rsrp_good      ? 'adequate'
                     : s.avgRsrp >= c.rsrp_fair       ? 'marginal' : 'weak';
      summary += ` Average ${labels.rsrp} ${s.avgRsrp.toFixed(1)} dBm (${rsrpQual} coverage).`;
    }
    if (s.avgSinr != null && labels.sinr) {
      summary += ` ${labels.sinr} avg ${s.avgSinr.toFixed(1)} dB${s.avgSinr < c.sinr_threshold ? ' — high interference detected' : ''}.`;
    }
    if (s.avgRsrq != null) {
      const unit = tech === '2G' ? '' : ' dB';
      summary += ` ${labels.rsrq} avg ${s.avgRsrq.toFixed(1)}${unit}.`;
    }
    if (s.avgDl != null) {
      const dlMbps = (s.avgDl / 1000).toFixed(1);
      summary += ` DL throughput avg ${dlMbps} Mbps${s.maxDl ? `, peak ${(s.maxDl / 1000).toFixed(1)} Mbps` : ''}.`;
      if (s.avgDl < c.dl_threshold) {
        summary += ` Below the ${(c.dl_threshold / 1000).toFixed(0)} Mbps regulatory target.`;
      }
    }
    if (s.distribution) {
      const total = numSamples || 1;
      const poorPct = ((s.distribution.poor + s.distribution.noSignal) / total * 100).toFixed(1);
      if (poorPct > 10) {
        summary += ` **${poorPct}% of samples show poor/no signal** — coverage optimization needed.`;
      }
    }
  }

  if (tech === '3G' && detailedStats) {
    const s = detailedStats;
    const rscpPct = ((s.distribution.rscpGte70 / (numSamples || 1)) * 100).toFixed(1);
    const ecnoPct = ((s.distribution.ecnoBetween / (numSamples || 1)) * 100).toFixed(1);
    const shortOfThreshold = rscpPct < 90 ? `${operatorName} short of threshold.` : `${operatorName} meets threshold.`;
    
    return `Remarks: 3G network coverage.
Coverage signal strength (RSCP ≥-70dBm→${rscpPct}%). ${shortOfThreshold} More improvement needs to be done on ECNO as shown on plots in most areas etc. Degraded Signal quality as shown in most areas on ECNO plot also needs improvement. ECNO between -12 dB and 15 dB, accounts only ${ecnoPct}%. -10dB or higher is better`;
  }

  return summary;
}
