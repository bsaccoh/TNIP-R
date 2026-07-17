import { query } from '../../config/db.js';

export async function getBlackspots(threshold = -110, operatorId = null) {
  const opFilter = operatorId ? ' AND dt.operator_id = ?' : '';
  const baseParams = operatorId ? [operatorId] : [];

  // Total samples for percentage
  const [totRow] = await query(
    `SELECT COUNT(*) AS total
     FROM drive_test_samples s
     JOIN drive_tests dt ON s.drive_test_id = dt.drive_test_id
     WHERE dt.status = 'COMPLETED'${opFilter}`,
    baseParams,
  );

  // Poor-signal samples
  const rows = await query(
    `SELECT s.latitude, s.longitude, s.rsrp, s.sinr, s.dl_throughput,
            o.operator_name
     FROM drive_test_samples s
     JOIN drive_tests dt ON s.drive_test_id = dt.drive_test_id
     JOIN operators o    ON dt.operator_id  = o.operator_id
     WHERE dt.status = 'COMPLETED'
       AND s.rsrp < ?
       AND s.latitude  IS NOT NULL
       AND s.longitude IS NOT NULL${opFilter}
     ORDER BY s.rsrp ASC`,
    operatorId ? [threshold, operatorId] : [threshold],
  );

  // Grid-cluster at ~100 m resolution (3 decimal places ≈ 111 m)
  const grid = {};
  for (const r of rows) {
    const lat = Math.round(Number(r.latitude)  * 1000) / 1000;
    const lon = Math.round(Number(r.longitude) * 1000) / 1000;
    const key = `${lat},${lon}`;
    if (!grid[key]) grid[key] = { lat, lon, items: [] };
    grid[key].items.push(r);
  }

  const clusters = Object.values(grid)
    .map((cell) => {
      const rsrps = cell.items.map((s) => Number(s.rsrp));
      const avg   = rsrps.reduce((a, b) => a + b, 0) / rsrps.length;
      const min   = Math.min(...rsrps);
      return {
        lat:       cell.lat,
        lon:       cell.lon,
        count:     cell.items.length,
        avgRsrp:   Number(avg.toFixed(1)),
        minRsrp:   Number(min.toFixed(1)),
        severity:  min < -120 ? 'critical' : min < -115 ? 'severe' : 'poor',
        operators: [...new Set(cell.items.map((s) => s.operator_name))],
      };
    })
    .sort((a, b) => a.avgRsrp - b.avgRsrp);

  const allRsrps = rows.map((r) => Number(r.rsrp));

  return {
    threshold,
    blackspotCount:   clusters.length,
    totalPoorSamples: rows.length,
    totalSamples:     Number(totRow.total),
    pctPoor:          Number((rows.length / totRow.total * 100).toFixed(1)),
    worstRsrp:        allRsrps.length ? Number(Math.min(...allRsrps).toFixed(1)) : null,
    clusters:         clusters.slice(0, 600),
    rawSamples:       rows.slice(0, 2000).map((r) => ({
      lat:  Number(r.latitude),
      lon:  Number(r.longitude),
      rsrp: Number(r.rsrp),
    })),
  };
}
