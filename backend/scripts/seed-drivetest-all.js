import mysql from 'mysql2/promise';

const DB = { host: 'localhost', user: 'root', password: 'root123', database: 'tnipr' };

const WAYPOINTS_FREETOWN = [
  [8.4840, -13.2344], [8.4780, -13.2420], [8.4720, -13.2510], [8.4680, -13.2540],
  [8.4630, -13.2490], [8.4570, -13.2440], [8.4510, -13.2380], [8.4480, -13.2320],
  [8.4460, -13.2250], [8.4420, -13.2170], [8.4380, -13.2100], [8.4350, -13.2020],
  [8.4310, -13.1940], [8.4280, -13.1870], [8.4250, -13.1790],
];

const WAYPOINTS_PENINSULA = [
  [8.4840, -13.2344], [8.4750, -13.2500], [8.4600, -13.2600], [8.4450, -13.2700],
  [8.4300, -13.2750], [8.4150, -13.2800], [8.4000, -13.2850], [8.3850, -13.2900],
];

const WAYPOINTS_EAST = [
  [8.4420, -13.2170], [8.4380, -13.2100], [8.4350, -13.2020], [8.4310, -13.1940],
  [8.4280, -13.1870], [8.4250, -13.1790], [8.4220, -13.1710], [8.4180, -13.1640],
  [8.4130, -13.1560], [8.4070, -13.1470], [8.3980, -13.1350], [8.3880, -13.1200],
];

function lerp(a, b, t) { return a + (b - a) * t; }
function rand(min, max) { return min + Math.random() * (max - min); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateSamples(waypoints, perSeg, rsrpOffset, dlFactor, startDate) {
  const points = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lat1, lon1] = waypoints[i];
    const [lat2, lon2] = waypoints[i + 1];
    for (let j = 0; j < perSeg; j++) {
      const t = j / perSeg;
      const lat = lerp(lat1, lat2, t) + rand(-0.0003, 0.0003);
      const lon = lerp(lon1, lon2, t) + rand(-0.0003, 0.0003);

      const baseRsrp = -82 + (i / waypoints.length) * -25 + rsrpOffset;
      const rsrp = clamp(baseRsrp + rand(-8, 8), -120, -60);
      const rsrq = clamp(-5 + (rsrp + 80) * 0.15 + rand(-3, 3), -20, 0);
      const sinr = clamp(10 + (rsrp + 80) * 0.3 + rand(-5, 5), -5, 30);
      const dl = clamp(Math.round((5000 + (rsrp + 120) * 200 + rand(-2000, 2000)) * dlFactor), 100, 80000);
      const ul = clamp(Math.round(dl * rand(0.15, 0.35)), 50, 20000);

      let eventType = null;
      if (Math.random() < 0.02) eventType = 'HANDOVER';
      if (Math.random() < 0.005 && rsrp < -105) eventType = 'CALL_DROP';

      points.push({
        lat: Number(lat.toFixed(7)), lon: Number(lon.toFixed(7)),
        rsrp: Number(rsrp.toFixed(2)), rsrq: Number(rsrq.toFixed(2)),
        sinr: Number(sinr.toFixed(2)), dl, ul, eventType,
      });
    }
  }
  const startTime = new Date(startDate);
  for (let i = 0; i < points.length; i++) {
    points[i].ts = new Date(startTime.getTime() + i * 2000).toISOString().slice(0, 19).replace('T', ' ');
  }
  return points;
}

async function insertTest(conn, opId, name, date, routeType, tech, device, tester, waypoints, perSeg, rsrpOffset, dlFactor) {
  const samples = generateSamples(waypoints, perSeg, rsrpOffset, dlFactor, date);
  let dist = 0;
  for (let i = 1; i < samples.length; i++) dist += haversine(samples[i-1].lat, samples[i-1].lon, samples[i].lat, samples[i].lon);

  const [res] = await conn.query(
    `INSERT INTO drive_tests (operator_id, test_name, test_date, route_type, technology, device_model, tester_name, status, total_samples, distance_km, duration_min)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?)`,
    [opId, name, date, routeType, tech, device, tester, samples.length, dist.toFixed(2), Math.round(samples.length * 2 / 60)]
  );
  const id = res.insertId;

  for (let i = 0; i < samples.length; i += 200) {
    const chunk = samples.slice(i, i + 200);
    const ph = chunk.map(() => '(?,?,?,?,?,?,?,?,?,?,?)').join(',');
    const vals = chunk.flatMap(s => [id, s.ts, s.lat, s.lon, s.rsrp, s.rsrq, s.sinr, s.dl, s.ul, s.eventType, null]);
    await conn.query(
      `INSERT INTO drive_test_samples (drive_test_id, ts, latitude, longitude, rsrp, rsrq, sinr, dl_throughput, ul_throughput, event_type, serving_cell)
       VALUES ${ph}`, vals);
  }
  console.log(`  ${name}: ${samples.length} samples, ${dist.toFixed(2)} km`);
  return id;
}

async function main() {
  const conn = await mysql.createConnection(DB);

  // Qcell tests
  await insertTest(conn, 3, 'Qcell Freetown Urban LTE Survey', '2026-06-26', 'urban', '4G',
    'Huawei P60 Pro', 'Mohamed Bangura', WAYPOINTS_FREETOWN, 20, 3, 0.85);
  await insertTest(conn, 3, 'Qcell Peninsula Highway Test', '2026-06-25', 'highway', '4G',
    'Samsung A54', 'Isata Koroma', WAYPOINTS_PENINSULA, 18, -5, 0.7);

  // SierraTel tests
  await insertTest(conn, 4, 'SierraTel Eastern Freetown Coverage', '2026-06-27', 'urban', '3G',
    'Nokia G42', 'Abu Sesay', WAYPOINTS_EAST, 22, -10, 0.5);
  await insertTest(conn, 4, 'SierraTel City Centre 4G Benchmark', '2026-06-28', 'urban', '4G',
    'iPhone 14', 'Fatmata Kamara', WAYPOINTS_FREETOWN.slice(5, 12), 25, -3, 0.65);

  // Add some older tests for trend analysis
  await insertTest(conn, 1, 'Orange Lumley Monthly Check - May', '2026-05-15', 'urban', '4G',
    'Samsung Galaxy S24 Ultra', 'Ibrahim Kamara', WAYPOINTS_FREETOWN.slice(0, 8), 20, 2, 1.0);
  await insertTest(conn, 2, 'Africell Western Area Survey - May', '2026-05-20', 'urban', '4G',
    'iPhone 15 Pro', 'Aminata Sesay', WAYPOINTS_FREETOWN.slice(0, 10), 18, 0, 0.9);

  console.log('\nAll drive tests seeded successfully.');
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
