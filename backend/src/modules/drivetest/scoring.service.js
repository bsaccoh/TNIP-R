import { query } from '../../config/db.js';

let _configCache = null;
let _configTs = 0;
const CACHE_TTL = 60_000;

export async function loadConfig() {
  if (_configCache && Date.now() - _configTs < CACHE_TTL) return _configCache;
  const rows = await query('SELECT config_key, config_value FROM drive_test_config').catch(() => []);
  const c = {};
  for (const r of rows) {
    try { c[r.config_key] = JSON.parse(r.config_value); } catch { c[r.config_key] = r.config_value; }
  }
  _configCache = {
    rsrp_threshold:   c.rsrp_threshold   ?? -100,
    rsrq_threshold:   c.rsrq_threshold   ?? -12,
    sinr_threshold:   c.sinr_threshold   ?? 5,
    dl_threshold:     c.dl_threshold     ?? 2000,
    ul_threshold:     c.ul_threshold     ?? 500,
    coverage_target:  c.coverage_target  ?? 95,
    rsrp_excellent:   c.rsrp_excellent   ?? -80,
    rsrp_good:        c.rsrp_good        ?? -90,
    rsrp_fair:        c.rsrp_fair        ?? -100,
    rsrp_poor:        c.rsrp_poor        ?? -110,
    sinr_excellent:   c.sinr_excellent   ?? 20,
    sinr_good:        c.sinr_good        ?? 10,
    sinr_fair:        c.sinr_fair        ?? 0,
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

export async function calculateOverallScore(samples, cfg) {
  if (!samples || samples.length === 0) return 0;
  const c = cfg || await loadConfig();

  let validRsrp = 0, goodRsrp = 0;
  let validSinr = 0, goodSinr = 0;
  let validDl = 0, goodDl = 0;
  let validRsrq = 0, goodRsrq = 0;

  for (const s of samples) {
    if (s.rsrp != null) { validRsrp++; if (s.rsrp >= c.rsrp_threshold) goodRsrp++; }
    if (s.sinr != null) { validSinr++; if (s.sinr >= c.sinr_threshold) goodSinr++; }
    if (s.dl_throughput != null && s.dl_throughput > 0) { validDl++; if (s.dl_throughput >= c.dl_threshold) goodDl++; }
    if (s.rsrq != null) { validRsrq++; if (s.rsrq >= c.rsrq_threshold) goodRsrq++; }
  }

  const rsrpScore = validRsrp > 0 ? (goodRsrp / validRsrp) * 100 : 0;
  const sinrScore = validSinr > 0 ? (goodSinr / validSinr) * 100 : 0;
  const dlScore = validDl > 0 ? (goodDl / validDl) * 100 : 0;
  const rsrqScore = validRsrq > 0 ? (goodRsrq / validRsrq) * 100 : 0;

  const overall = (rsrpScore * c.score_weight_rsrp)
                + (sinrScore * c.score_weight_sinr)
                + (dlScore * c.score_weight_dl)
                + (rsrqScore * c.score_weight_rsrq);
  return Number(overall.toFixed(2));
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
  };

  return {
    avgRsrp: avg(vals.rsrp), minRsrp: vals.rsrp.length ? Math.min(...vals.rsrp) : null, maxRsrp: vals.rsrp.length ? Math.max(...vals.rsrp) : null,
    avgRsrq: avg(vals.rsrq), minRsrq: vals.rsrq.length ? Math.min(...vals.rsrq) : null,
    avgSinr: avg(vals.sinr), minSinr: vals.sinr.length ? Math.min(...vals.sinr) : null, maxSinr: vals.sinr.length ? Math.max(...vals.sinr) : null,
    avgDl: avg(vals.dl), maxDl: vals.dl.length ? Math.max(...vals.dl) : null, medDl: med(vals.dl),
    avgUl: avg(vals.ul), maxUl: vals.ul.length ? Math.max(...vals.ul) : null, medUl: med(vals.ul),
    distribution: dist,
    totalSamples: samples.length,
    config: c,
  };
}

export async function generateAiSummary(operatorName, score, distance, numSamples, detailedStats) {
  const c = detailedStats?.config || await loadConfig();
  const quality = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : 'Poor';

  let summary = `Drive test for ${operatorName}: ${distance} km covered, ${numSamples} samples collected. Overall score: **${score}/100 (${quality})**.`;

  if (detailedStats) {
    const s = detailedStats;
    if (s.avgRsrp != null) {
      const rsrpQual = s.avgRsrp >= c.rsrp_excellent ? 'strong' : s.avgRsrp >= c.rsrp_good ? 'adequate' : s.avgRsrp >= c.rsrp_fair ? 'marginal' : 'weak';
      summary += ` Average RSRP ${s.avgRsrp.toFixed(1)} dBm (${rsrpQual} coverage).`;
    }
    if (s.avgSinr != null) {
      summary += ` SINR avg ${s.avgSinr.toFixed(1)} dB${s.avgSinr < c.sinr_threshold ? ' — high interference detected' : ''}.`;
    }
    if (s.avgDl != null) {
      const dlMbps = (s.avgDl / 1000).toFixed(1);
      const dlTarget = (c.dl_threshold / 1000).toFixed(0);
      summary += ` DL throughput avg ${dlMbps} Mbps${s.maxDl ? `, peak ${(s.maxDl / 1000).toFixed(1)} Mbps` : ''}.`;
      if (s.avgDl < c.dl_threshold) {
        summary += ` Below the ${dlTarget} Mbps regulatory target.`;
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

  return summary;
}
