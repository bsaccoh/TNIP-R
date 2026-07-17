import { query } from '../../config/db.js';

export async function getPciAnalysis(operatorId = null) {
  const opFilter = operatorId ? ' AND dt.operator_id = ?' : '';
  const params   = operatorId ? [operatorId] : [];

  // Per-PCI aggregates
  const rows = await query(
    `SELECT s.pci, s.earfcn, s.band,
            COUNT(*)               AS sample_count,
            AVG(s.rsrp)            AS avg_rsrp,
            MIN(s.rsrp)            AS min_rsrp,
            MAX(s.rsrp)            AS max_rsrp,
            AVG(s.sinr)            AS avg_sinr,
            AVG(s.latitude)        AS center_lat,
            AVG(s.longitude)       AS center_lon,
            STDDEV(s.latitude)     AS std_lat,
            STDDEV(s.longitude)    AS std_lon,
            COUNT(DISTINCT s.drive_test_id) AS test_count
     FROM drive_test_samples s
     JOIN drive_tests dt ON s.drive_test_id = dt.drive_test_id
     WHERE dt.status = 'COMPLETED'
       AND s.pci IS NOT NULL${opFilter}
     GROUP BY s.pci, s.earfcn, s.band
     ORDER BY sample_count DESC`,
    params,
  );

  const pcis = rows.map((r) => {
    const spreadKm = Math.sqrt(
      (Number(r.std_lat  || 0) * 111) ** 2 +
      (Number(r.std_lon  || 0) * 111) ** 2,
    );
    return {
      pci:              r.pci,
      earfcn:           r.earfcn,
      band:             r.band,
      sampleCount:      Number(r.sample_count),
      testCount:        Number(r.test_count),
      avgRsrp:          Number(Number(r.avg_rsrp).toFixed(1)),
      minRsrp:          Number(Number(r.min_rsrp).toFixed(1)),
      maxRsrp:          Number(Number(r.max_rsrp).toFixed(1)),
      avgSinr:          r.avg_sinr != null ? Number(Number(r.avg_sinr).toFixed(1)) : null,
      centerLat:        Number(r.center_lat),
      centerLon:        Number(r.center_lon),
      spreadKm:         Number(spreadKm.toFixed(2)),
      interferenceRisk: spreadKm > 5 ? 'high' : spreadKm > 2 ? 'medium' : 'low',
    };
  });

  // EARFCN breakdown
  const byEarfcn = {};
  for (const p of pcis) {
    const key = p.earfcn ?? 'unknown';
    if (!byEarfcn[key]) byEarfcn[key] = { earfcn: p.earfcn, band: p.band, pciCount: 0, sampleCount: 0 };
    byEarfcn[key].pciCount++;
    byEarfcn[key].sampleCount += p.sampleCount;
  }

  // Sample points with PCI for map (cap at 2000)
  const sampleRows = await query(
    `SELECT s.latitude, s.longitude, s.pci, s.rsrp, s.earfcn
     FROM drive_test_samples s
     JOIN drive_tests dt ON s.drive_test_id = dt.drive_test_id
     WHERE dt.status = 'COMPLETED'
       AND s.pci IS NOT NULL
       AND s.latitude IS NOT NULL${opFilter}
     ORDER BY s.sample_id
     LIMIT 2000`,
    params,
  );

  const highRisk = pcis.filter((p) => p.interferenceRisk === 'high');
  const medRisk  = pcis.filter((p) => p.interferenceRisk === 'medium');

  return {
    pcis,
    earfcnBreakdown: Object.values(byEarfcn).sort((a, b) => b.sampleCount - a.sampleCount),
    summary: {
      totalPcis:     pcis.length,
      highRiskCount: highRisk.length,
      medRiskCount:  medRisk.length,
      totalSamples:  pcis.reduce((a, b) => a + b.sampleCount, 0),
    },
    samplePoints: sampleRows.map((r) => ({
      lat:    Number(r.latitude),
      lon:    Number(r.longitude),
      pci:    r.pci,
      rsrp:   r.rsrp != null ? Number(r.rsrp) : null,
      earfcn: r.earfcn,
    })),
  };
}
