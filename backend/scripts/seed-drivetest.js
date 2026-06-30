/**
 * Seed script: Generate sample drive test data for testing.
 * Run: node scripts/seed-drivetest.js
 */
import mysql from 'mysql2/promise';

const DB = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root123',
  database: process.env.DB_NAME || 'tnipr',
  namedPlaceholders: true,
};

// Freetown drive route waypoints (lat, lon) — realistic road path
const WAYPOINTS = [
  [8.4840, -13.2344],  // Aberdeen
  [8.4780, -13.2420],  // Lumley Beach Road
  [8.4720, -13.2510],  // Lumley
  [8.4680, -13.2540],  // Congo Cross
  [8.4630, -13.2490],  // Wilberforce
  [8.4570, -13.2440],  // Hill Station
  [8.4510, -13.2380],  // Tower Hill area
  [8.4480, -13.2320],  // Brookfields
  [8.4460, -13.2250],  // Siaka Stevens St
  [8.4420, -13.2170],  // PZ / City Centre
  [8.4380, -13.2100],  // Eastern Freetown
  [8.4350, -13.2020],  // Cline Town
  [8.4310, -13.1940],  // Kissy Road
  [8.4280, -13.1870],  // Kissy
  [8.4250, -13.1790],  // Wellington
  [8.4220, -13.1710],  // Waterloo Road start
  [8.4180, -13.1640],  // Allen Town area
  [8.4130, -13.1560],  // Hastings approach
  [8.4070, -13.1470],  // Hastings
  [8.3980, -13.1350],  // Waterloo approach
  [8.3880, -13.1200],  // Waterloo
];

// Signal quality zones (simulate real conditions)
const ZONES = [
  { start: 0, end: 3, rsrpBase: -72, quality: 'excellent' },   // Aberdeen/Lumley - good coverage
  { start: 3, end: 6, rsrpBase: -85, quality: 'good' },        // Wilberforce/Hill Station
  { start: 6, end: 10, rsrpBase: -78, quality: 'good' },       // City centre - strong
  { start: 10, end: 13, rsrpBase: -95, quality: 'fair' },       // Eastern Freetown - moderate
  { start: 13, end: 16, rsrpBase: -88, quality: 'good' },       // Kissy/Wellington
  { start: 16, end: 18, rsrpBase: -105, quality: 'poor' },      // Allen Town - weak
  { start: 18, end: 21, rsrpBase: -92, quality: 'fair' },       // Hastings/Waterloo
];

function lerp(a, b, t) { return a + (b - a) * t; }
function rand(min, max) { return min + Math.random() * (max - min); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function getZone(waypointIdx) {
  for (const z of ZONES) {
    if (waypointIdx >= z.start && waypointIdx < z.end) return z;
  }
  return ZONES[ZONES.length - 1];
}

function interpolateRoute(waypoints, samplesPerSegment = 25) {
  const points = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lat1, lon1] = waypoints[i];
    const [lat2, lon2] = waypoints[i + 1];
    for (let j = 0; j < samplesPerSegment; j++) {
      const t = j / samplesPerSegment;
      const lat = lerp(lat1, lat2, t) + rand(-0.0003, 0.0003);
      const lon = lerp(lon1, lon2, t) + rand(-0.0003, 0.0003);
      const zone = getZone(i);

      const rsrp = clamp(zone.rsrpBase + rand(-8, 8), -120, -60);
      const rsrq = clamp(-5 + (rsrp + 80) * 0.15 + rand(-3, 3), -20, 0);
      const sinr = clamp(10 + (rsrp + 80) * 0.3 + rand(-5, 5), -5, 30);
      const dl = clamp(Math.round(5000 + (rsrp + 120) * 200 + rand(-2000, 2000)), 100, 80000);
      const ul = clamp(Math.round(dl * rand(0.15, 0.35)), 50, 20000);

      // Occasional events
      let eventType = null;
      if (Math.random() < 0.02) eventType = 'HANDOVER';
      if (Math.random() < 0.005 && rsrp < -105) eventType = 'CALL_DROP';
      if (i > 0 && j === 0 && Math.random() < 0.3) eventType = 'HANDOVER';

      points.push({
        lat: Number(lat.toFixed(7)),
        lon: Number(lon.toFixed(7)),
        rsrp: Number(rsrp.toFixed(2)),
        rsrq: Number(rsrq.toFixed(2)),
        sinr: Number(sinr.toFixed(2)),
        dl, ul, eventType,
        ts: null, // will be set below
      });
    }
  }
  // Add final waypoint
  const last = waypoints[waypoints.length - 1];
  const zone = getZone(waypoints.length - 2);
  points.push({
    lat: last[0], lon: last[1],
    rsrp: Number((zone.rsrpBase + rand(-5, 5)).toFixed(2)),
    rsrq: -8, sinr: 12, dl: 15000, ul: 3000,
    eventType: null, ts: null,
  });

  // Assign timestamps (1 sample per ~2 seconds, ~35 km/h average)
  const startTime = new Date('2026-06-28T09:00:00');
  for (let i = 0; i < points.length; i++) {
    points[i].ts = new Date(startTime.getTime() + i * 2000).toISOString().slice(0, 19).replace('T', ' ');
  }

  return points;
}

async function main() {
  const conn = await mysql.createConnection(DB);
  console.log('Connected to database');

  // Ensure tables exist
  await conn.query(`CREATE TABLE IF NOT EXISTS drive_tests (
    drive_test_id INT AUTO_INCREMENT PRIMARY KEY,
    operator_id INT NOT NULL, test_name VARCHAR(200) NOT NULL,
    test_date DATE NOT NULL, route_type VARCHAR(20) DEFAULT 'urban',
    technology VARCHAR(10), device_model VARCHAR(100), tester_name VARCHAR(100),
    notes TEXT, status VARCHAR(20) DEFAULT 'UPLOADED',
    total_samples INT DEFAULT 0, distance_km DECIMAL(8,2), duration_min INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await conn.query(`CREATE TABLE IF NOT EXISTS drive_test_samples (
    sample_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    drive_test_id INT NOT NULL, ts DATETIME,
    latitude DECIMAL(10,7) NOT NULL, longitude DECIMAL(10,7) NOT NULL,
    rsrp DECIMAL(6,2), rsrq DECIMAL(6,2), sinr DECIMAL(6,2), rssi DECIMAL(6,2),
    dl_throughput DECIMAL(10,2), ul_throughput DECIMAL(10,2),
    pci INT, earfcn INT, band VARCHAR(20),
    event_type VARCHAR(50), call_status VARCHAR(20), serving_cell VARCHAR(50),
    INDEX idx_dt_latlon (drive_test_id, latitude, longitude)
  )`);
  console.log('Tables ensured');

  // Get Orange operator ID
  const [ops] = await conn.query('SELECT operator_id FROM operators WHERE operator_name LIKE ?', ['%Orange%']);
  const operatorId = ops.length ? ops[0].operator_id : 1;
  console.log(`Using operator_id: ${operatorId}`);

  // Generate route samples
  const samples = interpolateRoute(WAYPOINTS, 25);
  console.log(`Generated ${samples.length} sample points`);

  // Calculate distance
  let totalDist = 0;
  for (let i = 1; i < samples.length; i++) {
    totalDist += haversine(samples[i - 1].lat, samples[i - 1].lon, samples[i].lat, samples[i].lon);
  }
  const durationMin = Math.round(samples.length * 2 / 60);

  // Insert drive test record
  const [dtResult] = await conn.query(
    `INSERT INTO drive_tests (operator_id, test_name, test_date, route_type, technology, device_model, tester_name, notes, status, total_samples, distance_km, duration_min)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [operatorId, 'Freetown LTE Coverage Survey — Aberdeen to Waterloo', '2026-06-28',
     'urban', '4G', 'Samsung Galaxy S24 Ultra', 'Ibrahim Kamara',
     'Drive test along main corridor from Aberdeen through city centre to Waterloo. Mix of urban and peri-urban environments.',
     'COMPLETED', samples.length, totalDist.toFixed(2), durationMin]
  );
  const driveTestId = dtResult.insertId;
  console.log(`Created drive_test_id: ${driveTestId}`);

  // Insert samples in batches
  for (let i = 0; i < samples.length; i += 200) {
    const chunk = samples.slice(i, i + 200);
    const placeholders = chunk.map(() => '(?,?,?,?,?,?,?,?,?,?,?)').join(',');
    const values = chunk.flatMap((s) => [
      driveTestId, s.ts, s.lat, s.lon, s.rsrp, s.rsrq, s.sinr,
      s.dl, s.ul, s.eventType, null,
    ]);
    await conn.query(
      `INSERT INTO drive_test_samples (drive_test_id, ts, latitude, longitude, rsrp, rsrq, sinr, dl_throughput, ul_throughput, event_type, serving_cell)
       VALUES ${placeholders}`, values
    );
    console.log(`  Inserted batch ${Math.floor(i / 200) + 1} (${chunk.length} samples)`);
  }

  // Also create a second shorter test for Africell
  const [ops2] = await conn.query('SELECT operator_id FROM operators WHERE operator_name LIKE ?', ['%Africell%']);
  if (ops2.length) {
    const op2Id = ops2[0].operator_id;
    const shortWaypoints = WAYPOINTS.slice(6, 14); // City centre to Kissy only
    const samples2 = interpolateRoute(shortWaypoints, 20);
    let dist2 = 0;
    for (let i = 1; i < samples2.length; i++) {
      dist2 += haversine(samples2[i - 1].lat, samples2[i - 1].lon, samples2[i].lat, samples2[i].lon);
    }

    const [dt2] = await conn.query(
      `INSERT INTO drive_tests (operator_id, test_name, test_date, route_type, technology, device_model, tester_name, notes, status, total_samples, distance_km, duration_min)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [op2Id, 'Africell City Centre Benchmark', '2026-06-27',
       'urban', '4G', 'iPhone 15 Pro', 'Aminata Sesay',
       'Benchmark drive test through Freetown city centre comparing Africell LTE coverage.',
       'COMPLETED', samples2.length, dist2.toFixed(2), Math.round(samples2.length * 2 / 60)]
    );
    const dt2Id = dt2.insertId;

    for (let i = 0; i < samples2.length; i += 200) {
      const chunk = samples2.slice(i, i + 200);
      const placeholders = chunk.map(() => '(?,?,?,?,?,?,?,?,?,?,?)').join(',');
      const values = chunk.flatMap((s) => [
        dt2Id, s.ts, s.lat, s.lon,
        Number((s.rsrp - 5 + rand(-3, 3)).toFixed(2)),
        Number((s.rsrq - 2 + rand(-2, 2)).toFixed(2)),
        Number((s.sinr - 3 + rand(-2, 2)).toFixed(2)),
        Math.round(s.dl * 0.8), Math.round(s.ul * 0.75),
        s.eventType, null,
      ]);
      await conn.query(
        `INSERT INTO drive_test_samples (drive_test_id, ts, latitude, longitude, rsrp, rsrq, sinr, dl_throughput, ul_throughput, event_type, serving_cell)
         VALUES ${placeholders}`, values
      );
    }
    console.log(`Created Africell test (${samples2.length} samples, ${dist2.toFixed(2)} km)`);
  }

  console.log('\nDone! Drive test data seeded successfully.');
  console.log(`  Test 1: Orange — Freetown LTE Coverage Survey (${samples.length} samples, ${totalDist.toFixed(2)} km)`);
  await conn.end();
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

main().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
