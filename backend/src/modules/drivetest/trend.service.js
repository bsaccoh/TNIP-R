import { query } from '../../config/db.js';

function parseTestTime(testName) {
  const m = String(testName || '').match(/(\d{8})T(\d{6})Z/);
  if (!m) return null;
  const [, date, time] = m;
  return new Date(
    `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}` +
    `T${time.slice(0,2)}:${time.slice(2,4)}:${time.slice(4,6)}Z`,
  );
}

export async function getCampaignTrend(operatorId = null) {
  const params = [];
  let opWhere = '';
  if (operatorId) {
    opWhere = ' AND dt.operator_id = ?';
    params.push(operatorId);
  }

  const rows = await query(`
    SELECT
      dt.drive_test_id,
      dt.test_name,
      DATE_FORMAT(dt.test_date, '%Y-%m-%d') AS test_date,
      dt.overall_score,
      dt.distance_km,
      o.operator_name AS operator_name,
      o.operator_id,
      COUNT(s.sample_id)     AS sample_count,
      AVG(s.rsrp)            AS avg_rsrp,
      AVG(s.rsrq)            AS avg_rsrq,
      AVG(s.sinr)            AS avg_sinr,
      AVG(s.dl_throughput)   AS avg_dl,
      AVG(s.ul_throughput)   AS avg_ul,
      SUM(CASE
            WHEN dt.technology = '2G' AND s.rsrp >= -85  THEN 1
            WHEN dt.technology = '3G' AND s.rsrp >= -90  THEN 1
            WHEN s.rsrp >= -100 THEN 1
            ELSE 0
          END) * 100.0
        / NULLIF(COUNT(s.sample_id), 0) AS coverage_pct
    FROM drive_tests dt
    JOIN operators o ON dt.operator_id = o.operator_id
    LEFT JOIN drive_test_samples s ON dt.drive_test_id = s.drive_test_id
    WHERE dt.status = 'COMPLETED'${opWhere}
    GROUP BY dt.drive_test_id, dt.test_name, dt.test_date,
             dt.overall_score, dt.distance_km, o.operator_name, o.operator_id
    ORDER BY dt.test_date, dt.drive_test_id
  `, params);

  const campaigns = rows.map((r, i) => {
    const ts = parseTestTime(r.test_name);
    const hhmm = ts
      ? `${String(ts.getUTCHours()).padStart(2, '0')}:${String(ts.getUTCMinutes()).padStart(2, '0')}`
      : null;
    return {
      id:            r.drive_test_id,
      testName:      r.test_name,
      testDate:      r.test_date,
      timestamp:     ts ? ts.toISOString() : null,
      timeLabel:     hhmm || `Run ${i + 1}`,
      campaignIndex: i + 1,
      operator:      r.operator_name,
      operatorId:    r.operator_id,
      score:         r.overall_score != null ? Number(r.overall_score)                : null,
      distanceKm:    r.distance_km   != null ? Number(r.distance_km)                 : null,
      sampleCount:   Number(r.sample_count),
      avgRsrp:       r.avg_rsrp != null ? Number(Number(r.avg_rsrp).toFixed(1))      : null,
      avgRsrq:       r.avg_rsrq != null ? Number(Number(r.avg_rsrq).toFixed(1))      : null,
      avgSinr:       r.avg_sinr != null ? Number(Number(r.avg_sinr).toFixed(1))      : null,
      avgDl:         r.avg_dl != null   ? Math.round(Number(r.avg_dl))               : null,
      avgUl:         r.avg_ul != null   ? Math.round(Number(r.avg_ul))               : null,
      coveragePct:   r.coverage_pct != null ? Number(Number(r.coverage_pct).toFixed(1)) : null,
    };
  });

  // Per-operator summary statistics
  const byOp = {};
  for (const c of campaigns) {
    (byOp[c.operator] = byOp[c.operator] || []).push(c);
  }

  const summary = Object.entries(byOp).map(([name, cams]) => {
    const scores = cams.map((c) => c.score).filter((s) => s != null);
    if (!scores.length) return null;

    const best  = cams.reduce((a, b) => (b.score > a.score  ? b : a), cams[0]);
    const worst = cams.reduce((a, b) => (b.score < a.score  ? b : a), cams[0]);
    const avg   = scores.reduce((a, b) => a + b, 0) / scores.length;
    const rsrps = cams.map((c) => c.avgRsrp).filter((v) => v != null);
    const dls   = cams.map((c) => c.avgDl).filter((v) => v != null);

    let trend = 'stable';
    if (scores.length >= 6) {
      const n     = Math.min(3, Math.floor(scores.length / 2));
      const first = scores.slice(0, n).reduce((a, b) => a + b, 0) / n;
      const last  = scores.slice(-n).reduce((a, b) => a + b, 0) / n;
      if (last > first + 2)       trend = 'improving';
      else if (last < first - 2)  trend = 'declining';
    }

    return {
      operator:      name,
      operatorId:    cams[0].operatorId,
      campaignCount: cams.length,
      avgScore:      Number(avg.toFixed(1)),
      bestScore:     best.score,
      worstScore:    worst.score,
      bestCampaign:  { id: best.id,  label: best.timeLabel,  index: best.campaignIndex  },
      worstCampaign: { id: worst.id, label: worst.timeLabel, index: worst.campaignIndex },
      avgRsrp: rsrps.length
        ? Number((rsrps.reduce((a, b) => a + b, 0) / rsrps.length).toFixed(1))
        : null,
      avgDl: dls.length
        ? Math.round(dls.reduce((a, b) => a + b, 0) / dls.length)
        : null,
      trend,
    };
  }).filter(Boolean);

  return { campaigns, summary };
}
