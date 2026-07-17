/**
 * Seeds synthetic Africell + Qcell drive test data.
 * Run from the backend directory:  node sql/seed_multioperator_drivetests.js
 *
 * Africell: Western Area / Freetown  (8 tests, urban)
 * Qcell:    Eastern Province / Kenema (5 tests, suburban/rural)
 */

import { createPool } from 'mysql2/promise';

const pool = createPool({ host: 'localhost', user: 'root', password: 'root123', database: 'tnipr' });

// ── Helpers ──────────────────────────────────────────────────────────────────
function rnd(min, max) { return Math.random() * (max - min) + min; }
function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/** Route: random walk from a starting point */
function makeRoute(startLat, startLon, n, stepSize = 0.002) {
  const pts = [];
  let lat = startLat, lon = startLon;
  let dlat = rnd(-stepSize, stepSize), dlon = rnd(-stepSize, stepSize);
  for (let i = 0; i < n; i++) {
    dlat = clamp(dlat + rnd(-0.0003, 0.0003), -stepSize, stepSize);
    dlon = clamp(dlon + rnd(-0.0003, 0.0003), -stepSize, stepSize);
    lat += dlat; lon += dlon;
    pts.push({ lat, lon });
  }
  return pts;
}

/** Build a realistic sample at a route point */
function makeSample(dtId, seqMs, pt, rsrpBase, pciPool, earfcn, band) {
  const ts = new Date('2026-01-19T08:00:00Z');
  ts.setMilliseconds(ts.getMilliseconds() + seqMs);

  const rsrp  = clamp(rnd(rsrpBase - 12, rsrpBase + 8), -130, -60);
  const rsrq  = clamp(rnd(-14, -6), -20, -3);
  const sinr  = clamp(rnd(-2, 20), -5, 30);
  const dl    = rsrp > -100 ? rnd(3000, 40000) : rnd(500, 5000);
  const ul    = dl * rnd(0.15, 0.35);
  const pci   = pciPool[rndInt(0, pciPool.length - 1)];

  return [
    dtId,
    ts,
    parseFloat(pt.lat.toFixed(7)),
    parseFloat(pt.lon.toFixed(7)),
    parseFloat(rsrp.toFixed(2)),
    parseFloat(rsrq.toFixed(2)),
    parseFloat(sinr.toFixed(2)),
    null,                          // rssi
    parseFloat(dl.toFixed(2)),
    parseFloat(ul.toFixed(2)),
    pci,
    earfcn,
    band,
    null, null, null,
  ];
}

/** Score formula (matches backend scoring) */
function computeScore(samples) {
  const rsrps   = samples.filter((s) => s[4] != null).map((s) => s[4]);
  const sinrs   = samples.filter((s) => s[6] != null).map((s) => s[6]);
  const dls     = samples.filter((s) => s[9] != null).map((s) => s[9]);
  const avg     = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const avgRsrp = avg(rsrps);
  const avgSinr = avg(sinrs);
  const avgDl   = avg(dls);
  const cov     = rsrps.filter((r) => r >= -100).length / rsrps.length * 100;

  const sRsrp = clamp((avgRsrp + 130) / 40 * 100, 0, 100);
  const sSinr = clamp((avgSinr + 5)   / 30 * 100, 0, 100);
  const sDl   = clamp(avgDl / 25000   * 100, 0, 100);
  const sCov  = clamp(cov, 0, 100);
  return parseFloat((sRsrp * 0.35 + sSinr * 0.2 + sDl * 0.25 + sCov * 0.2).toFixed(2));
}

// ── Test definitions ─────────────────────────────────────────────────────────
const TESTS = [
  // Africell — Freetown, Western Area  (operator_id = 2)
  { operatorId: 2, name: 'Africell_LTE_DL_Freetown_Central_20260119T083000Z',  tech: 'LTE', route: 'urban',    startLat:  8.490, startLon: -13.235, n: 180, rsrpBase: -88,  pcis: [10,23,45,67,89],  earfcn: 1800, band: 'B3' },
  { operatorId: 2, name: 'Africell_LTE_DL_Freetown_East_20260119T093000Z',     tech: 'LTE', route: 'urban',    startLat:  8.476, startLon: -13.218, n: 160, rsrpBase: -92,  pcis: [12,34,56,78,90],  earfcn: 1800, band: 'B3' },
  { operatorId: 2, name: 'Africell_LTE_DL_Aberdeen_20260119T103000Z',          tech: 'LTE', route: 'urban',    startLat:  8.468, startLon: -13.256, n: 150, rsrpBase: -85,  pcis: [20,41,63,85,107], earfcn: 1800, band: 'B3' },
  { operatorId: 2, name: 'Africell_LTE_DL_Lumley_20260119T113000Z',            tech: 'LTE', route: 'suburban', startLat:  8.452, startLon: -13.252, n: 140, rsrpBase: -95,  pcis: [22,44,66,88,110], earfcn: 900,  band: 'B8' },
  { operatorId: 2, name: 'Africell_LTE_DL_Waterloo_20260119T133000Z',          tech: 'LTE', route: 'rural',    startLat:  8.340, startLon: -13.076, n: 200, rsrpBase: -105, pcis: [15,37,59,81,103], earfcn: 900,  band: 'B8' },
  { operatorId: 2, name: 'Africell_LTE_DL_Freetown_North_20260119T143000Z',    tech: 'LTE', route: 'urban',    startLat:  8.502, startLon: -13.228, n: 170, rsrpBase: -90,  pcis: [11,33,55,77,99],  earfcn: 1800, band: 'B3' },
  { operatorId: 2, name: 'Africell_LTE_DL_Wellington_20260119T153000Z',        tech: 'LTE', route: 'suburban', startLat:  8.456, startLon: -13.190, n: 155, rsrpBase: -98,  pcis: [18,40,62,84,106], earfcn: 900,  band: 'B8' },
  { operatorId: 2, name: 'Africell_LTE_DL_Kissy_20260119T163000Z',             tech: 'LTE', route: 'urban',    startLat:  8.465, startLon: -13.202, n: 145, rsrpBase: -87,  pcis: [14,36,58,80,102], earfcn: 1800, band: 'B3' },

  // Qcell — Kenema, Eastern Province  (operator_id = 3)
  { operatorId: 3, name: 'Qcell_LTE_DL_Kenema_Central_20260119T090000Z',       tech: 'LTE', route: 'urban',    startLat:  7.879, startLon: -11.189, n: 130, rsrpBase: -93,  pcis: [200,212,224,236], earfcn: 1900, band: 'B3' },
  { operatorId: 3, name: 'Qcell_LTE_DL_Kenema_South_20260119T100000Z',         tech: 'LTE', route: 'urban',    startLat:  7.864, startLon: -11.185, n: 120, rsrpBase: -97,  pcis: [201,213,225,237], earfcn: 1900, band: 'B3' },
  { operatorId: 3, name: 'Qcell_LTE_DL_Kenema_Road_20260119T110000Z',          tech: 'LTE', route: 'highway',  startLat:  7.890, startLon: -11.180, n: 180, rsrpBase: -102, pcis: [202,214,226,238], earfcn: 850,  band: 'B5' },
  { operatorId: 3, name: 'Qcell_LTE_DL_Kenema_North_20260119T120000Z',         tech: 'LTE', route: 'suburban', startLat:  7.895, startLon: -11.195, n: 110, rsrpBase: -99,  pcis: [203,215,227,239], earfcn: 1900, band: 'B3' },
  { operatorId: 3, name: 'Qcell_LTE_DL_Kenema_Rural_20260119T130000Z',         tech: 'LTE', route: 'rural',    startLat:  7.840, startLon: -11.170, n: 150, rsrpBase: -110, pcis: [204,216,228,240], earfcn: 850,  band: 'B5' },
];

// ── Run ───────────────────────────────────────────────────────────────────────
(async () => {
  const conn = await pool.getConnection();
  try {
    console.log('Seeding multi-operator drive tests...');

    for (const t of TESTS) {
      const route   = makeRoute(t.startLat, t.startLon, t.n, t.route === 'highway' ? 0.004 : 0.002);
      const samples = route.map((pt, i) =>
        makeSample(0, i * 1500, pt, t.rsrpBase, t.pcis, t.earfcn, t.band),
      );
      const score   = computeScore(samples);

      const rsrps  = samples.map((s) => s[4]);
      const avgRsrp = rsrps.reduce((a, b) => a + b, 0) / rsrps.length;
      const dls     = samples.map((s) => s[9]);
      const avgDl   = dls.reduce((a, b) => a + b, 0) / dls.length;

      console.log(`  ${t.name}  score=${score}  avgRsrp=${avgRsrp.toFixed(1)}`);

      const [dtRes] = await conn.query(
        `INSERT INTO drive_tests
           (operator_id, test_name, test_date, route_type, technology,
            device_model, tester_name, status, total_samples,
            distance_km, duration_min, overall_score)
         VALUES (?, ?, '2026-01-19', ?, ?, 'NEMO Handy', 'NTNIP Seed', 'COMPLETED', ?, ?, ?, ?)`,
        [
          t.operatorId, t.name, t.route, t.tech,
          t.n,
          parseFloat((t.n * 20 / 1000).toFixed(2)),
          Math.round(t.n * 1500 / 60000),
          score,
        ],
      );
      const dtId = dtRes.insertId;

      for (const s of samples) { s[0] = dtId; }

      // Batch insert samples in chunks of 200
      for (let i = 0; i < samples.length; i += 200) {
        const chunk = samples.slice(i, i + 200);
        await conn.query(
          `INSERT INTO drive_test_samples
             (drive_test_id, ts, latitude, longitude, rsrp, rsrq, sinr, rssi,
              dl_throughput, ul_throughput, pci, earfcn, band,
              event_type, call_status, serving_cell)
           VALUES ?`,
          [chunk],
        );
      }
      console.log(`    → inserted drive_test_id=${dtId}, ${samples.length} samples`);
    }

    console.log('\nDone. 13 drive tests seeded (8 Africell + 5 Qcell).');
  } finally {
    conn.release();
    await pool.end();
  }
})();
