import { query } from '../../config/db.js';

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toR = (d) => d * Math.PI / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

export async function listTestsForCorridor() {
  return query(
    `SELECT dt.drive_test_id, dt.test_name, DATE_FORMAT(dt.test_date,'%Y-%m-%d') AS test_date,
            dt.overall_score, o.operator_name,
            COUNT(s.sample_id) AS sample_count
     FROM drive_tests dt
     JOIN operators o ON dt.operator_id = o.operator_id
     LEFT JOIN drive_test_samples s ON dt.drive_test_id = s.drive_test_id
     WHERE dt.status = 'COMPLETED'
     GROUP BY dt.drive_test_id, dt.test_name, dt.test_date, dt.overall_score, o.operator_name
     ORDER BY dt.test_date, dt.drive_test_id`,
  );
}

// Technology-aware coverage and quality thresholds
const TECH_THRESHOLDS = {
  '2G': { coverage: -85,  good: -85,  fair: -95,  poor: -105 },
  '3G': { coverage: -90,  good: -90,  fair: -100, poor: -110 },
  '4G': { coverage: -100, good: -90,  fair: -100, poor: -110 },
};

export async function getCorridorAnalysis(driveTestId, numSegments = 20) {
  const [testRow] = await query('SELECT technology FROM drive_tests WHERE drive_test_id = ?', [driveTestId]);
  const tech = testRow?.technology || '4G';
  const thr = TECH_THRESHOLDS[tech] || TECH_THRESHOLDS['4G'];

  const rows = await query(
    `SELECT s.latitude, s.longitude, s.ts, s.rsrp, s.rsrq, s.sinr,
            s.dl_throughput, s.ul_throughput
     FROM drive_test_samples s
     WHERE s.drive_test_id = ?
       AND s.latitude  IS NOT NULL
       AND s.longitude IS NOT NULL
     ORDER BY s.ts, s.sample_id`,
    [driveTestId],
  );

  if (!rows.length) return { segments: [], routePoints: [], stats: null };

  // Build points with cumulative distance
  let cumDist = 0;
  const points = rows.map((r, i) => {
    if (i > 0) {
      cumDist += haversineM(
        Number(rows[i - 1].latitude), Number(rows[i - 1].longitude),
        Number(r.latitude),           Number(r.longitude),
      );
    }
    return {
      lat:      Number(r.latitude),
      lon:      Number(r.longitude),
      rsrp:     r.rsrp != null ? Number(r.rsrp) : null,
      sinr:     r.sinr != null ? Number(r.sinr) : null,
      dl:       r.dl_throughput != null ? Number(r.dl_throughput) : null,
      ul:       r.ul_throughput != null ? Number(r.ul_throughput) : null,
      cumDistM: Math.round(cumDist),
    };
  });

  const totalDistM = cumDist;
  const segLenM   = totalDistM / numSegments;

  const segments = [];
  for (let i = 0; i < numSegments; i++) {
    const fromM = i * segLenM;
    const toM   = (i + 1) * segLenM;
    const seg   = points.filter((p) => p.cumDistM >= fromM && p.cumDistM < toM);
    if (!seg.length) continue;

    const rsrps = seg.map((p) => p.rsrp).filter((v) => v != null);
    const sinrs = seg.map((p) => p.sinr).filter((v) => v != null);
    const dls   = seg.map((p) => p.dl).filter((v) => v != null);
    const avgRsrp = avg(rsrps);

    segments.push({
      segIndex:   i + 1,
      fromKm:     Number((fromM / 1000).toFixed(2)),
      toKm:       Number((toM   / 1000).toFixed(2)),
      midKm:      Number(((fromM + toM) / 2 / 1000).toFixed(2)),
      lat:        avg(seg.map((p) => p.lat)),
      lon:        avg(seg.map((p) => p.lon)),
      sampleCount: seg.length,
      avgRsrp:    avgRsrp != null ? Number(avgRsrp.toFixed(1)) : null,
      avgSinr:    avg(sinrs) != null ? Number(avg(sinrs).toFixed(1)) : null,
      avgDl:      avg(dls)   != null ? Math.round(avg(dls)) : null,
      minRsrp:    rsrps.length ? Number(Math.min(...rsrps).toFixed(1)) : null,
      coveragePct: rsrps.length
        ? Number((rsrps.filter((v) => v >= thr.coverage).length / rsrps.length * 100).toFixed(1))
        : null,
      quality: avgRsrp == null ? 'unknown'
        : avgRsrp >= thr.good ? 'good'
        : avgRsrp >= thr.fair ? 'fair'
        : avgRsrp >= thr.poor ? 'poor'
        : 'dead',
      points: seg.map((p) => ({ lat: p.lat, lon: p.lon, rsrp: p.rsrp })),
    });
  }

  const allRsrps = points.map((p) => p.rsrp).filter((v) => v != null);
  const segsWithRsrp = segments.filter((s) => s.avgRsrp != null);
  const bestSeg  = segsWithRsrp.length
    ? segsWithRsrp.reduce((a, b) => (b.avgRsrp > a.avgRsrp ? b : a))
    : null;
  const worstSeg = segsWithRsrp.length
    ? segsWithRsrp.reduce((a, b) => (b.avgRsrp < a.avgRsrp ? b : a))
    : null;

  return {
    driveTestId,
    totalDistKm:  Number((totalDistM / 1000).toFixed(2)),
    totalSamples: points.length,
    segments,
    stats: {
      avgRsrp:    allRsrps.length ? Number((allRsrps.reduce((a, b) => a + b, 0) / allRsrps.length).toFixed(1)) : null,
      bestSegment:  bestSeg  ? { index: bestSeg.segIndex,  fromKm: bestSeg.fromKm,  toKm: bestSeg.toKm,  avgRsrp: bestSeg.avgRsrp  } : null,
      worstSegment: worstSeg ? { index: worstSeg.segIndex, fromKm: worstSeg.fromKm, toKm: worstSeg.toKm, avgRsrp: worstSeg.avgRsrp } : null,
      deadZonePct:  segments.length ? Number((segments.filter((s) => s.quality === 'dead').length / segments.length * 100).toFixed(1)) : 0,
      poorPct:      segments.length ? Number((segments.filter((s) => s.quality === 'poor' || s.quality === 'dead').length / segments.length * 100).toFixed(1)) : 0,
    },
    routePoints: points.map((p) => ({ lat: p.lat, lon: p.lon, rsrp: p.rsrp, cumDistM: p.cumDistM })),
  };
}
