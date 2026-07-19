import { query, withTransaction } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import * as xlsx from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';
import { parseTrpFile } from './trp-parser.js';
export { getOperatorExecutiveSummary, getOperatorComparisonDashboard } from './executive.service.js';

// ── Percentile / CSSR / CDR helpers ─────────────────────────────────────────

function computePercentiles(values, pcts = [5, 25, 50, 90, 95]) {
  const sorted = values.filter((v) => v != null && !isNaN(v)).map(Number).sort((a, b) => a - b);
  if (!sorted.length) return Object.fromEntries(pcts.map((p) => [`p${p}`, null]));
  return Object.fromEntries(pcts.map((p) => {
    const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
    return [`p${p}`, Number(sorted[idx].toFixed(2))];
  }));
}

function computeCSSR(samples) {
  const attempted = samples.filter((s) => s.event_type === 'CALL_ATTEMPT' || s.call_status === 'CONNECTING').length;
  const failed    = samples.filter((s) => s.event_type === 'CALL_FAIL'    || s.call_status === 'FAILED').length;
  if (!attempted) return null;
  return Number(((1 - failed / attempted) * 100).toFixed(2));
}

function computeCDR(samples) {
  const established = samples.filter((s) => s.call_status === 'CONNECTED' || s.event_type === 'CALL_ESTABLISH').length;
  const dropped     = samples.filter((s) => s.event_type === 'CALL_DROP').length;
  if (!established) return null;
  return Number(((dropped / established) * 100).toFixed(2));
}

// ── Cluster detection ────────────────────────────────────────────────────────

function haversineDist(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nominatimReverse(lat, lng) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`;
    const req = https.get(url, { headers: { 'User-Agent': 'NTNIP-DriveTest/1.0' } }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(raw);
          const city = j.address?.city || j.address?.town || j.address?.village || j.address?.county || null;
          resolve(city);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
  });
}

export async function resolveCluster(lat, lng) {
  if (lat == null || lng == null) return null;
  const clusters = await query('SELECT cluster_id, cluster_name, center_lat, center_lng, radius_km FROM drive_test_clusters');
  let best = null, bestDist = Infinity;
  for (const c of clusters) {
    const d = haversineDist(lat, lng, Number(c.center_lat), Number(c.center_lng));
    if (d <= Number(c.radius_km) && d < bestDist) { bestDist = d; best = c; }
  }
  if (best) return best.cluster_name;

  // No match — reverse geocode and auto-create
  const city = await nominatimReverse(lat, lng);
  const baseName = city ? city.replace(/\s+/g, ' ').trim() : 'Unknown';

  // Find next CL number for this city
  const existing = clusters.filter((c) => c.cluster_name.startsWith(baseName + ' CL'));
  const nums = existing.map((c) => parseInt(c.cluster_name.replace(baseName + ' CL', ''), 10)).filter((n) => !isNaN(n));
  const nextNum = nums.length ? Math.max(...nums) + 1 : 1;
  const clusterName = `${baseName} CL${String(nextNum).padStart(2, '0')}`;

  await query(
    'INSERT IGNORE INTO drive_test_clusters (cluster_name, center_lat, center_lng, radius_km) VALUES (:n, :lat, :lng, 10.00)',
    { n: clusterName, lat, lng },
  );
  return clusterName;
}

const RSRP_COL_NAMES = ['rsrp', 'rsrp_dbm', 'rsrp (dbm)', 'lte rsrp', 'serving rsrp', 'rscp', 'rscp_dbm', 'rscp (dbm)', 'rxlev', 'rx level', 'rxlevel', 'rx_lev'];
const RSRQ_COL_NAMES = ['rsrq', 'rsrq_db', 'rsrq (db)', 'lte rsrq', 'ecno', 'ecno_db', 'ec/no', 'ec_no', 'rxqual', 'rx qual', 'rx_qual', 'rxquality'];
const SINR_COL_NAMES = ['sinr', 'sinr_db', 'sinr (db)', 'lte sinr', 'cinr'];
const LAT_COL_NAMES = ['latitude', 'lat', 'gps_lat', 'gps latitude'];
const LON_COL_NAMES = ['longitude', 'lon', 'lng', 'gps_lon', 'gps longitude'];
const DL_COL_NAMES = ['dl_throughput', 'dl throughput', 'download', 'dl_tp', 'dl kbps', 'dl_mbps'];
const UL_COL_NAMES = ['ul_throughput', 'ul throughput', 'upload', 'ul_tp', 'ul kbps', 'ul_mbps'];

function findCol(headers, candidates) {
  const lower = headers.map((h) => String(h).toLowerCase().trim());
  for (const c of candidates) {
    const idx = lower.indexOf(c);
    if (idx >= 0) return headers[idx];
  }
  return null;
}

function fileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function checkDuplicate(hash) {
  const [existing] = await query(
    `SELECT drive_test_id, test_name, test_date FROM drive_tests WHERE file_hash = :hash`,
    { hash },
  );
  if (existing) {
    throw ApiError.badRequest(
      `This file has already been imported as "${existing.test_name}" (ID: ${existing.drive_test_id}, Date: ${existing.test_date}). Skipping duplicate.`,
    );
  }
}

export async function ensureTables() {
  await query(`CREATE TABLE IF NOT EXISTS drive_tests (
    drive_test_id INT AUTO_INCREMENT PRIMARY KEY,
    operator_id INT NOT NULL, test_name VARCHAR(200) NOT NULL,
    test_date DATE NOT NULL, route_type VARCHAR(20) DEFAULT 'urban',
    technology VARCHAR(10), device_model VARCHAR(100), tester_name VARCHAR(100),
    notes TEXT, status VARCHAR(20) DEFAULT 'UPLOADED',
    total_samples INT DEFAULT 0, distance_km DECIMAL(8,2), duration_min INT,
    overall_score DECIMAL(5,2), ai_summary TEXT,
    file_path VARCHAR(512) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  try { await query(`ALTER TABLE drive_tests ADD COLUMN file_path VARCHAR(512) NULL`); } catch {}
  try { await query(`ALTER TABLE drive_tests ADD COLUMN file_hash VARCHAR(64) NULL, ADD UNIQUE INDEX idx_file_hash (file_hash)`); } catch {}
  try { await query(`ALTER TABLE drive_tests ADD COLUMN overall_score DECIMAL(5,2) NULL, ADD COLUMN ai_summary TEXT NULL`); } catch {}
  await query(`CREATE TABLE IF NOT EXISTS drive_test_samples (
    sample_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    drive_test_id INT NOT NULL, ts DATETIME,
    latitude DECIMAL(10,7) NOT NULL, longitude DECIMAL(10,7) NOT NULL,
    rsrp DECIMAL(6,2), rsrq DECIMAL(6,2), sinr DECIMAL(6,2), rssi DECIMAL(6,2),
    dl_throughput DECIMAL(10,2), ul_throughput DECIMAL(10,2),
    pci INT, earfcn INT, band VARCHAR(20),
    event_type VARCHAR(50), call_status VARCHAR(20), serving_cell VARCHAR(50),
    rtt_ms DECIMAL(8,2) NULL, jitter_ms DECIMAL(8,2) NULL,
    packet_loss_pct DECIMAL(5,2) NULL, mos DECIMAL(3,1) NULL,
    INDEX idx_dt_latlon (drive_test_id, latitude, longitude)
  )`);
  try { await query(`ALTER TABLE drive_test_samples ADD COLUMN rtt_ms DECIMAL(8,2) NULL`); } catch {}
  try { await query(`ALTER TABLE drive_test_samples ADD COLUMN jitter_ms DECIMAL(8,2) NULL`); } catch {}
  try { await query(`ALTER TABLE drive_test_samples ADD COLUMN packet_loss_pct DECIMAL(5,2) NULL`); } catch {}
  try { await query(`ALTER TABLE drive_test_samples ADD COLUMN mos DECIMAL(3,1) NULL`); } catch {}
}

export async function importDriveTest(operatorId, meta, buffer, filename) {
  await ensureTables();

  const hash = fileHash(buffer);
  await checkDuplicate(hash);

  const wb = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
  if (!rows.length) throw ApiError.badRequest('File contains no data rows');

  const headers = Object.keys(rows[0]);
  const latCol = findCol(headers, LAT_COL_NAMES);
  const lonCol = findCol(headers, LON_COL_NAMES);
  if (!latCol || !lonCol) throw ApiError.badRequest(`Could not find latitude/longitude columns. Found: ${headers.join(', ')}`);

  const rsrpCol = findCol(headers, RSRP_COL_NAMES);
  const rsrqCol = findCol(headers, RSRQ_COL_NAMES);
  const sinrCol = findCol(headers, SINR_COL_NAMES);
  const dlCol = findCol(headers, DL_COL_NAMES);
  const ulCol = findCol(headers, UL_COL_NAMES);

  const uploadsDir = path.resolve('./uploads/drivetests');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const storedFilename = `${Date.now()}-${filename}`;
  const localFilePath = path.join(uploadsDir, storedFilename);
  fs.writeFileSync(localFilePath, buffer);
  const dbFilePath = `uploads/drivetests/${storedFilename}`;

  const is2G = headers.some(h => {
    const l = String(h).toLowerCase();
    return l.includes('rxlev') || l.includes('rx lev') || l.includes('rxqual') || l.includes('rx qual') || l.includes('bsic') || l.includes('arfcn');
  });
  const is3G = !is2G && headers.some(h => {
    const l = String(h).toLowerCase();
    return l.includes('rscp') || l.includes('ecno') || l.includes('ec/no') || l.includes('ec_no') || l.includes('uarfcn');
  });
  const detectedTech = is2G ? '2G' : is3G ? '3G' : '4G';

  return withTransaction(async ({ q }) => {
    const ins = await q(
      `INSERT INTO drive_tests (operator_id, test_name, test_date, route_type, technology, device_model, tester_name, notes, file_path, file_hash)
       VALUES (:opId, :name, :date, :route, :tech, :device, :tester, :notes, :filePath, :hash)`,
      {
        opId: operatorId,
        name: meta.testName || filename,
        date: meta.testDate || new Date().toISOString().slice(0, 10),
        route: meta.routeType || 'urban',
        tech: meta.technology || detectedTech,
        device: meta.deviceModel || null,
        tester: meta.testerName || null,
        notes: meta.notes || null,
        filePath: dbFilePath,
        hash,
      }
    );
    const driveTestId = ins.insertId;

    let validSamples = 0;
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;

    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const values = [];
      for (const r of chunk) {
        const lat = parseFloat(r[latCol]);
        const lon = parseFloat(r[lonCol]);
        if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) continue;

        minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);

        values.push([
          driveTestId, null,
          lat, lon,
          rsrpCol ? parseFloat(r[rsrpCol]) || null : null,
          rsrqCol ? parseFloat(r[rsrqCol]) || null : null,
          sinrCol ? parseFloat(r[sinrCol]) || null : null,
          null,
          dlCol ? parseFloat(r[dlCol]) || null : null,
          ulCol ? parseFloat(r[ulCol]) || null : null,
          null, null, null, null, null, null,
        ]);
        validSamples++;
      }
      if (values.length) {
        await q(
          `INSERT INTO drive_test_samples
           (drive_test_id, ts, latitude, longitude, rsrp, rsrq, sinr, rssi, dl_throughput, ul_throughput, pci, earfcn, band, event_type, call_status, serving_cell)
           VALUES ${values.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}`,
          values.flat()
        );
      }
    }

    const distKm = validSamples > 1 ? estimateDistance(rows, latCol, lonCol) : 0;
    
    // Calculate new KPIs
    const { calculateOverallScore, generateAiSummary } = await import('./scoring.service.js');
    const samplesForScoring = rows.map(r => ({
      rsrp: rsrpCol ? parseFloat(r[rsrpCol]) : null,
      rsrq: rsrqCol ? parseFloat(r[rsrqCol]) : null,
      sinr: sinrCol ? parseFloat(r[sinrCol]) : null,
      dl_throughput: dlCol ? parseFloat(r[dlCol]) : null,
    }));
    const csvTech = meta.technology || null;
    const score = await calculateOverallScore(samplesForScoring, null, csvTech);

    // Get operator name for AI summary
    const [opRes] = await q('SELECT operator_name FROM operators WHERE operator_id = ?', [operatorId]);
    const aiSummary = await generateAiSummary(opRes?.operator_name || 'Unknown', score, distKm.toFixed(2), validSamples, null, csvTech);

    await q(
      `UPDATE drive_tests SET total_samples = :s, distance_km = :d, overall_score = :score, ai_summary = :aiSummary, status = 'COMPLETED' WHERE drive_test_id = :id`,
      { s: validSamples, d: distKm.toFixed(2), score, aiSummary, id: driveTestId }
    );

    return {
      driveTestId,
      samplesImported: validSamples,
      samplesSkipped: rows.length - validSamples,
      distanceKm: distKm.toFixed(2),
      columnsFound: { rsrp: !!rsrpCol, rsrq: !!rsrqCol, sinr: !!sinrCol, dl: !!dlCol, ul: !!ulCol },
    };
  });
}

export async function importTrpFile(operatorId, meta, buffer, filename) {
  await ensureTables();

  const hash = fileHash(buffer);
  await checkDuplicate(hash);

  const parsed = await parseTrpFile(buffer);
  if (!parsed.samples.length) throw ApiError.badRequest('TRP file contains no GPS-correlated samples');

  const uploadsDir = path.resolve('./uploads/drivetests');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const storedFilename = `${Date.now()}-${filename}`;
  const localFilePath = path.join(uploadsDir, storedFilename);
  fs.writeFileSync(localFilePath, buffer);

  return withTransaction(async ({ q }) => {
    const technology = meta.technology || '4G';
    const deviceModel = meta.deviceModel || parsed.meta.device || null;
    const testDate = meta.testDate
      || (parsed.summary.startTime ? parsed.summary.startTime.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));

    const { calculateOverallScore, generateAiSummary, computeDetailedStats } = await import('./scoring.service.js');
    const score = await calculateOverallScore(parsed.samples, null, technology);
    const stats = await computeDetailedStats(parsed.samples, null, technology);
    const [opRes] = await q('SELECT operator_name FROM operators WHERE operator_id = ?', [operatorId]);
    const aiSummary = await generateAiSummary(opRes?.operator_name || 'Unknown', score, parsed.summary.distanceKm.toFixed(2), parsed.samples.length, stats, technology);

    const ins = await q(
      `INSERT INTO drive_tests (operator_id, test_name, test_date, route_type, technology,
        device_model, tester_name, notes, file_path, file_hash, total_samples, distance_km, duration_min, overall_score, ai_summary, status)
       VALUES (:opId, :name, :date, :route, :tech, :device, :tester, :notes, :filePath, :hash,
               :samples, :dist, :dur, :score, :aiSummary, 'COMPLETED')`,
      {
        opId: operatorId,
        name: meta.testName || filename.replace(/\.[^.]+$/, ''),
        date: testDate,
        route: meta.routeType || 'urban',
        tech: technology,
        device: deviceModel,
        tester: meta.testerName || null,
        notes: meta.notes || `Parsed from TEMS Pocket TRP. Operator: ${parsed.meta.operator || 'N/A'}. App: ${parsed.meta.appVersion || 'N/A'}`,
        filePath: `uploads/drivetests/${storedFilename}`,
        hash,
        samples: parsed.samples.length,
        dist: parsed.summary.distanceKm.toFixed(2),
        dur: parsed.summary.durationMin,
        score,
        aiSummary
      },
    );
    const driveTestId = ins.insertId;

    for (let i = 0; i < parsed.samples.length; i += 500) {
      const chunk = parsed.samples.slice(i, i + 500);
      const values = chunk.map((s) => [
        driveTestId,
        s.ts ? s.ts.toISOString().slice(0, 19).replace('T', ' ') : null,
        s.latitude, s.longitude,
        s.rsrp, s.rsrq, s.sinr, null,
        s.dl_throughput, s.ul_throughput,
        s.pci, s.earfcn, s.band,
        s.event_type ?? null, s.call_status ?? null, null,
        s.rtt_ms ?? null, s.jitter_ms ?? null, s.packet_loss_pct ?? null, s.mos ?? null,
      ]);
      await q(
        `INSERT INTO drive_test_samples
         (drive_test_id, ts, latitude, longitude, rsrp, rsrq, sinr, rssi,
          dl_throughput, ul_throughput, pci, earfcn, band, event_type, call_status, serving_cell,
          rtt_ms, jitter_ms, packet_loss_pct, mos)
         VALUES ${values.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}`,
        values.flat(),
      );
    }

    return {
      driveTestId,
      format: 'TRP',
      samplesImported: parsed.samples.length,
      distanceKm: parsed.summary.distanceKm,
      durationMin: parsed.summary.durationMin,
      device: parsed.meta.device,
      operator: parsed.meta.operator,
      startTime: parsed.summary.startTime,
      endTime: parsed.summary.endTime,
    };
  });
}

function estimateDistance(rows, latCol, lonCol) {
  let total = 0;
  let prevLat = null, prevLon = null;
  for (const r of rows) {
    const lat = parseFloat(r[latCol]);
    const lon = parseFloat(r[lonCol]);
    if (isNaN(lat) || isNaN(lon)) continue;
    if (prevLat !== null) total += haversine(prevLat, prevLon, lat, lon);
    prevLat = lat; prevLon = lon;
  }
  return total;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Live recording ────────────────────────────────────────────────────────────

export async function createLiveTest(operatorId, meta, userId) {
  await ensureTables();
  const r = await query(
    `INSERT INTO drive_tests (operator_id, test_name, test_date, route_type, technology,
      device_model, tester_name, notes, status)
     VALUES (:op, :name, :date, :route, :tech, :device, :tester, :notes, 'RECORDING')`,
    {
      op: operatorId,
      name: meta.testName || `Live Test ${new Date().toISOString().slice(0, 10)}`,
      date: meta.testDate || new Date().toISOString().slice(0, 10),
      route: meta.routeType || 'urban',
      tech: meta.technology || null,
      device: meta.deviceModel || null,
      tester: meta.testerName || null,
      notes: meta.notes || null,
    },
  );
  return { drive_test_id: r.insertId };
}

export async function appendLiveSamples(driveTestId, samples) {
  await ensureTables();
  if (!samples?.length) return { inserted: 0 };

  const valid = samples.filter(
    (s) => s.latitude && s.longitude && !isNaN(parseFloat(s.latitude)) && !isNaN(parseFloat(s.longitude)),
  );
  if (!valid.length) return { inserted: 0 };

  for (let i = 0; i < valid.length; i += 200) {
    const chunk = valid.slice(i, i + 200);
    const vals = chunk.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
    await query(
      `INSERT INTO drive_test_samples
       (drive_test_id, ts, latitude, longitude, rsrp, rsrq, sinr, rssi,
        dl_throughput, ul_throughput, pci, earfcn, band, event_type, call_status, serving_cell)
       VALUES ${vals}`,
      chunk.flatMap((s) => [
        driveTestId,
        s.ts || null,
        parseFloat(s.latitude),
        parseFloat(s.longitude),
        s.rsrp != null ? parseFloat(s.rsrp) : null,
        s.rsrq != null ? parseFloat(s.rsrq) : null,
        s.sinr != null ? parseFloat(s.sinr) : null,
        s.rssi != null ? parseFloat(s.rssi) : null,
        s.dl_throughput != null ? parseFloat(s.dl_throughput) : null,
        s.ul_throughput != null ? parseFloat(s.ul_throughput) : null,
        s.pci != null ? parseInt(s.pci) : null,
        s.earfcn != null ? parseInt(s.earfcn) : null,
        s.band || null,
        s.event_type || null,
        s.call_status || null,
        s.serving_cell || null,
      ]),
    );
  }
  return { inserted: valid.length };
}

export async function endLiveTest(driveTestId) {
  await ensureTables();
  const samples = await query(
    'SELECT latitude, longitude FROM drive_test_samples WHERE drive_test_id = :id ORDER BY sample_id',
    { id: driveTestId },
  );
  const [cnt] = await query(
    'SELECT COUNT(*) AS n FROM drive_test_samples WHERE drive_test_id = :id',
    { id: driveTestId },
  );
  const [meta] = await query(
    'SELECT created_at FROM drive_tests WHERE drive_test_id = :id',
    { id: driveTestId },
  );

  let distKm = 0;
  for (let i = 1; i < samples.length; i++) {
    distKm += haversine(
      Number(samples[i - 1].latitude), Number(samples[i - 1].longitude),
      Number(samples[i].latitude),     Number(samples[i].longitude),
    );
  }

  const durationMin = meta?.created_at
    ? Math.round((Date.now() - new Date(meta.created_at).getTime()) / 60000)
    : null;

  const liveSamplesForScore = await query(
    'SELECT rsrp, rsrq, sinr, dl_throughput FROM drive_test_samples WHERE drive_test_id = :id',
    { id: driveTestId },
  );
  const [liveMeta] = await query(
    `SELECT dt.technology, o.operator_name FROM drive_tests dt
       JOIN operators o ON o.operator_id = dt.operator_id
       WHERE dt.drive_test_id = :id`, { id: driveTestId }
  );
  const { calculateOverallScore, generateAiSummary } = await import('./scoring.service.js');
  const score = await calculateOverallScore(liveSamplesForScore, null, liveMeta?.technology);
  const aiSummary = await generateAiSummary(liveMeta?.operator_name || 'Unknown', score, distKm.toFixed(2), cnt.n, null, liveMeta?.technology);

  await query(
    `UPDATE drive_tests SET
       status = 'COMPLETED', total_samples = :s,
       distance_km = :d, duration_min = :dur,
       overall_score = :score, ai_summary = :ai
     WHERE drive_test_id = :id`,
    { s: cnt.n, d: distKm.toFixed(2), dur: durationMin, score, ai: aiSummary, id: driveTestId },
  );

  const [updated] = await query(
    `SELECT dt.*, o.operator_name FROM drive_tests dt
       JOIN operators o ON o.operator_id = dt.operator_id
       WHERE dt.drive_test_id = :id`,
    { id: driveTestId },
  );
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function listDriveTests(operatorId) {
  await ensureTables();
  const where = operatorId ? 'WHERE dt.operator_id = :op' : '';
  return query(
    `SELECT dt.*, o.operator_name
       FROM drive_tests dt
       JOIN operators o ON o.operator_id = dt.operator_id
       ${where}
       ORDER BY dt.created_at DESC`, operatorId ? { op: operatorId } : {}
  );
}

export async function getDriveTestSamples(driveTestId) {
  return query(
    `SELECT sample_id, latitude, longitude, rsrp, rsrq, sinr, dl_throughput, ul_throughput,
            event_type, serving_cell
       FROM drive_test_samples WHERE drive_test_id = :id ORDER BY sample_id`,
    { id: driveTestId }
  );
}

export async function getClusterSamples(testIds) {
  if (!testIds?.length) return [];
  const placeholders = testIds.map((_, i) => `:id${i}`).join(',');
  const params = Object.fromEntries(testIds.map((id, i) => [`id${i}`, id]));
  return query(
    `SELECT s.sample_id, s.drive_test_id, s.latitude, s.longitude,
            s.rsrp, s.rsrq, s.sinr, s.dl_throughput, s.ul_throughput,
            dt.operator_id, dt.technology, dt.test_name,
            o.operator_name
       FROM drive_test_samples s
       JOIN drive_tests dt ON dt.drive_test_id = s.drive_test_id
       JOIN operators o ON o.operator_id = dt.operator_id
       WHERE s.drive_test_id IN (${placeholders})
       ORDER BY s.drive_test_id, s.sample_id`,
    params,
  );
}

export async function getSignalThresholds() {
  return query('SELECT * FROM signal_thresholds ORDER BY technology, metric');
}

export async function updateSignalThreshold(id, data) {
  const { label, unit, pass_value, pass_direction, bins } = data;
  await query(
    `UPDATE signal_thresholds SET label=:label, unit=:unit, pass_value=:pass_value,
     pass_direction=:pass_direction, bins=:bins WHERE id=:id`,
    { id, label, unit, pass_value, pass_direction, bins: typeof bins === 'string' ? bins : JSON.stringify(bins) }
  );
  return query('SELECT * FROM signal_thresholds WHERE id=:id', { id }).then(r => r[0]);
}

export async function getThroughputAnalysis(cluster, technology) {
  let where = 'WHERE s.dl_throughput IS NOT NULL AND s.dl_throughput > 0';
  const params = {};
  if (cluster) {
    where += ' AND dt.test_name LIKE :cluster';
    params.cluster = `%— ${cluster} —%`;
  }
  if (technology) {
    where += ' AND dt.technology = :tech';
    params.tech = technology;
  }
  const rows = await query(
    `SELECT dt.drive_test_id, dt.test_name, dt.technology,
            o.operator_name, o.operator_id,
            s.sample_id, s.latitude, s.longitude,
            s.dl_throughput, s.ul_throughput, s.rsrp, s.rsrq, s.sinr
       FROM drive_test_samples s
       JOIN drive_tests dt ON dt.drive_test_id = s.drive_test_id
       JOIN operators o ON o.operator_id = dt.operator_id
       ${where}
       ORDER BY o.operator_name, dt.test_name, s.sample_id`,
    params,
  );
  return rows;
}

export async function getDriveTestAnalysis(driveTestId) {
  const [meta] = await query(
    `SELECT dt.*, o.operator_name FROM drive_tests dt
       JOIN operators o ON o.operator_id = dt.operator_id
       WHERE dt.drive_test_id = :id`, { id: driveTestId }
  );
  if (!meta) throw ApiError.notFound('Drive test not found');

  const [stats] = await query(
    `SELECT COUNT(*) AS total_samples,
            ROUND(AVG(rsrp), 2) AS avg_rsrp, ROUND(MIN(rsrp), 2) AS min_rsrp, ROUND(MAX(rsrp), 2) AS max_rsrp,
            ROUND(AVG(rsrq), 2) AS avg_rsrq, ROUND(MIN(rsrq), 2) AS min_rsrq, ROUND(MAX(rsrq), 2) AS max_rsrq,
            ROUND(AVG(sinr), 2) AS avg_sinr, ROUND(MIN(sinr), 2) AS min_sinr, ROUND(MAX(sinr), 2) AS max_sinr,
            ROUND(AVG(dl_throughput), 2) AS avg_dl, ROUND(MAX(dl_throughput), 2) AS max_dl,
            ROUND(AVG(ul_throughput), 2) AS avg_ul, ROUND(MAX(ul_throughput), 2) AS max_ul,
            ROUND(AVG(rtt_ms), 2) AS avg_rtt, ROUND(AVG(jitter_ms), 2) AS avg_jitter,
            ROUND(AVG(packet_loss_pct), 2) AS avg_packet_loss, ROUND(AVG(mos), 2) AS avg_mos,
            SUM(CASE WHEN rsrp >= -80 THEN 1 ELSE 0 END) AS rsrp_excellent,
            SUM(CASE WHEN rsrp >= -90 AND rsrp < -80 THEN 1 ELSE 0 END) AS rsrp_good,
            SUM(CASE WHEN rsrp >= -100 AND rsrp < -90 THEN 1 ELSE 0 END) AS rsrp_fair,
            SUM(CASE WHEN rsrp >= -110 AND rsrp < -100 THEN 1 ELSE 0 END) AS rsrp_poor,
            SUM(CASE WHEN rsrp < -110 THEN 1 ELSE 0 END) AS rsrp_no_signal
       FROM drive_test_samples WHERE drive_test_id = :id`, { id: driveTestId }
  );

  const rawSamples = await query(
    `SELECT rsrp, sinr, dl_throughput, ul_throughput, rtt_ms, jitter_ms, mos,
            event_type, call_status
       FROM drive_test_samples WHERE drive_test_id = :id`, { id: driveTestId }
  );

  const percentiles = {
    rsrp: computePercentiles(rawSamples.map((s) => s.rsrp)),
    sinr: computePercentiles(rawSamples.map((s) => s.sinr)),
    dl:   computePercentiles(rawSamples.map((s) => s.dl_throughput)),
    ul:   computePercentiles(rawSamples.map((s) => s.ul_throughput)),
    rtt:  computePercentiles(rawSamples.map((s) => s.rtt_ms)),
    mos:  computePercentiles(rawSamples.map((s) => s.mos)),
  };

  const callQuality = {
    cssr_pct: computeCSSR(rawSamples),
    cdr_pct:  computeCDR(rawSamples),
    call_drops: rawSamples.filter((s) => s.event_type === 'CALL_DROP').length,
    handovers:  rawSamples.filter((s) => s.event_type === 'HANDOVER').length,
  };

  return { meta, stats, percentiles, callQuality };
}

export async function deleteDriveTest(driveTestId) {
  const [row] = await query('SELECT file_path FROM drive_tests WHERE drive_test_id = :id', { id: driveTestId });
  if (row?.file_path) {
    try {
      const fullPath = path.resolve(row.file_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (err) {
      // Ignore error
    }
  }
  await query('DELETE FROM drive_test_samples WHERE drive_test_id = :id', { id: driveTestId });
  await query('DELETE FROM drive_tests WHERE drive_test_id = :id', { id: driveTestId });
}

export async function compareDriveTests(ids) {
  if (!ids?.length || ids.length < 2) throw ApiError.badRequest('At least 2 drive test IDs required');

  const results = [];
  for (const id of ids) {
    const { meta, stats } = await getDriveTestAnalysis(id);
    const samples = await query(
      `SELECT latitude, longitude, rsrp, rsrq, sinr, dl_throughput, ul_throughput
         FROM drive_test_samples WHERE drive_test_id = :id ORDER BY sample_id`,
      { id }
    );
    results.push({ meta, stats, samples });
  }
  return results;
}

export async function getCoverageGaps(driveTestId, threshold = -100) {
  const samples = await query(
    `SELECT sample_id, latitude, longitude, rsrp, rsrq, sinr, dl_throughput
       FROM drive_test_samples WHERE drive_test_id = :id ORDER BY sample_id`,
    { id: driveTestId }
  );

  const gaps = [];
  let currentGap = null;

  for (const s of samples) {
    const rsrp = Number(s.rsrp);
    if (rsrp < threshold) {
      if (!currentGap) {
        currentGap = { startIdx: s.sample_id, samples: [], minRsrp: rsrp };
      }
      currentGap.samples.push(s);
      currentGap.minRsrp = Math.min(currentGap.minRsrp, rsrp);
    } else if (currentGap) {
      currentGap.endIdx = currentGap.samples[currentGap.samples.length - 1].sample_id;
      currentGap.length = currentGap.samples.length;
      currentGap.centerLat = currentGap.samples.reduce((a, s) => a + Number(s.latitude), 0) / currentGap.length;
      currentGap.centerLon = currentGap.samples.reduce((a, s) => a + Number(s.longitude), 0) / currentGap.length;
      if (currentGap.length >= 3) gaps.push(currentGap);
      currentGap = null;
    }
  }
  if (currentGap && currentGap.samples.length >= 3) {
    currentGap.endIdx = currentGap.samples[currentGap.samples.length - 1].sample_id;
    currentGap.length = currentGap.samples.length;
    currentGap.centerLat = currentGap.samples.reduce((a, s) => a + Number(s.latitude), 0) / currentGap.length;
    currentGap.centerLon = currentGap.samples.reduce((a, s) => a + Number(s.longitude), 0) / currentGap.length;
    gaps.push(currentGap);
  }

  return gaps;
}

export async function getRouteSegments(driveTestId, segmentSize = 25) {
  const samples = await query(
    `SELECT sample_id, latitude, longitude, rsrp, rsrq, sinr, dl_throughput, ul_throughput
       FROM drive_test_samples WHERE drive_test_id = :id ORDER BY sample_id`,
    { id: driveTestId }
  );

  const segments = [];
  for (let i = 0; i < samples.length; i += segmentSize) {
    const chunk = samples.slice(i, i + segmentSize);
    const rsrps = chunk.map((s) => Number(s.rsrp)).filter((v) => !isNaN(v));
    const sinrs = chunk.map((s) => Number(s.sinr)).filter((v) => !isNaN(v));
    const dls = chunk.map((s) => Number(s.dl_throughput)).filter((v) => !isNaN(v) && v > 0);
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    const startPt = chunk[0];
    const endPt = chunk[chunk.length - 1];
    let dist = 0;
    for (let j = 1; j < chunk.length; j++) {
      dist += haversine(Number(chunk[j-1].latitude), Number(chunk[j-1].longitude),
                        Number(chunk[j].latitude), Number(chunk[j].longitude));
    }

    segments.push({
      index: Math.floor(i / segmentSize),
      sampleCount: chunk.length,
      startLat: Number(startPt.latitude), startLon: Number(startPt.longitude),
      endLat: Number(endPt.latitude), endLon: Number(endPt.longitude),
      centerLat: avg(chunk.map((s) => Number(s.latitude))),
      centerLon: avg(chunk.map((s) => Number(s.longitude))),
      distanceKm: Number(dist.toFixed(3)),
      avgRsrp: Number(avg(rsrps)?.toFixed(2)),
      minRsrp: rsrps.length ? Number(Math.min(...rsrps).toFixed(2)) : null,
      avgSinr: Number(avg(sinrs)?.toFixed(2)),
      avgDl: dls.length ? Number(avg(dls).toFixed(2)) : null,
      coverage: {
        excellent: rsrps.filter((v) => v >= -80).length,
        good: rsrps.filter((v) => v >= -90 && v < -80).length,
        fair: rsrps.filter((v) => v >= -100 && v < -90).length,
        poor: rsrps.filter((v) => v >= -110 && v < -100).length,
        noSignal: rsrps.filter((v) => v < -110).length,
      },
    });
  }

  return segments;
}

export async function getComplianceSummary(driveTestId, thresholds = {}) {
  const t = {
    rsrp: thresholds.rsrp ?? -100,
    rsrq: thresholds.rsrq ?? -15,
    sinr: thresholds.sinr ?? 0,
    dl: thresholds.dl ?? 2000,
  };

  const [row] = await query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN rsrp >= :rsrp THEN 1 ELSE 0 END) AS rsrp_pass,
            SUM(CASE WHEN rsrq >= :rsrq THEN 1 ELSE 0 END) AS rsrq_pass,
            SUM(CASE WHEN sinr >= :sinr THEN 1 ELSE 0 END) AS sinr_pass,
            SUM(CASE WHEN dl_throughput >= :dl THEN 1 ELSE 0 END) AS dl_pass,
            SUM(CASE WHEN rsrp >= -80 THEN 1 ELSE 0 END) AS rsrp_excellent,
            SUM(CASE WHEN rsrp >= -90 AND rsrp < -80 THEN 1 ELSE 0 END) AS rsrp_good,
            SUM(CASE WHEN rsrp >= -100 AND rsrp < -90 THEN 1 ELSE 0 END) AS rsrp_fair,
            SUM(CASE WHEN rsrp >= -110 AND rsrp < -100 THEN 1 ELSE 0 END) AS rsrp_poor,
            SUM(CASE WHEN rsrp < -110 THEN 1 ELSE 0 END) AS rsrp_no_signal,
            ROUND(AVG(rsrp), 2) AS avg_rsrp,
            ROUND(AVG(sinr), 2) AS avg_sinr,
            ROUND(AVG(dl_throughput), 2) AS avg_dl,
            SUM(CASE WHEN event_type = 'CALL_DROP' THEN 1 ELSE 0 END) AS call_drops,
            SUM(CASE WHEN event_type = 'HANDOVER' THEN 1 ELSE 0 END) AS handovers
       FROM drive_test_samples WHERE drive_test_id = :id`,
    { ...t, id: driveTestId }
  );

  const rawSamples = await query(
    `SELECT rsrp, sinr, dl_throughput, ul_throughput, rtt_ms, jitter_ms, mos,
            event_type, call_status
       FROM drive_test_samples WHERE drive_test_id = :id`, { id: driveTestId }
  );

  const [meta] = await query(
    `SELECT dt.*, o.operator_name FROM drive_tests dt
       JOIN operators o ON o.operator_id = dt.operator_id
       WHERE dt.drive_test_id = :id`, { id: driveTestId }
  );

  const total = row.total || 1;
  return {
    meta,
    thresholds: t,
    total: row.total,
    compliance: {
      rsrp: { pass: row.rsrp_pass, pct: Number(((row.rsrp_pass / total) * 100).toFixed(1)) },
      rsrq: { pass: row.rsrq_pass, pct: Number(((row.rsrq_pass / total) * 100).toFixed(1)) },
      sinr: { pass: row.sinr_pass, pct: Number(((row.sinr_pass / total) * 100).toFixed(1)) },
      dl: { pass: row.dl_pass, pct: Number(((row.dl_pass / total) * 100).toFixed(1)) },
    },
    averages: { rsrp: row.avg_rsrp, sinr: row.avg_sinr, dl: row.avg_dl },
    events: { callDrops: row.call_drops, handovers: row.handovers },
    distribution: {
      excellent: row.rsrp_excellent, good: row.rsrp_good,
      fair: row.rsrp_fair, poor: row.rsrp_poor, noSignal: row.rsrp_no_signal,
    },
    percentiles: {
      rsrp: computePercentiles(rawSamples.map((s) => s.rsrp)),
      sinr: computePercentiles(rawSamples.map((s) => s.sinr)),
      dl:   computePercentiles(rawSamples.map((s) => s.dl_throughput)),
      rtt:  computePercentiles(rawSamples.map((s) => s.rtt_ms)),
      mos:  computePercentiles(rawSamples.map((s) => s.mos)),
    },
    callQuality: {
      cssr_pct: computeCSSR(rawSamples),
      cdr_pct:  computeCDR(rawSamples),
    },
  };
}

export async function getDashboardSummary(dateFrom, dateTo) {
  const where = dateFrom && dateTo
    ? 'WHERE dt.test_date BETWEEN :from AND :to' : '';
  const params = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : {};

  const perOperator = await query(
    `SELECT o.operator_name,
            COUNT(dt.drive_test_id) AS test_count,
            COALESCE(SUM(dt.total_samples), 0) AS total_samples,
            ROUND(COALESCE(SUM(dt.distance_km), 0), 2) AS total_distance_km,
            ROUND(AVG(sub.avg_rsrp), 2) AS avg_rsrp,
            ROUND(AVG(sub.avg_sinr), 2) AS avg_sinr,
            ROUND(AVG(sub.avg_dl), 2) AS avg_dl,
            ROUND(SUM(sub.rsrp_pass) / NULLIF(SUM(sub.total), 0) * 100, 1) AS rsrp_compliance,
            ROUND(SUM(sub.sinr_pass) / NULLIF(SUM(sub.total), 0) * 100, 1) AS sinr_compliance,
            COALESCE(SUM(sub.call_drops), 0) AS call_drops,
            COALESCE(SUM(sub.handovers), 0) AS handovers
       FROM drive_tests dt
       JOIN operators o ON o.operator_id = dt.operator_id
       LEFT JOIN (
         SELECT s.drive_test_id,
                COUNT(*) AS total,
                AVG(s.rsrp) AS avg_rsrp, AVG(s.sinr) AS avg_sinr, AVG(s.dl_throughput) AS avg_dl,
                SUM(CASE
                  WHEN dtt.technology = '3G' AND s.rsrp >= -70  THEN 1
                  WHEN dtt.technology = '4G' AND s.rsrp >= -100 THEN 1
                  WHEN dtt.technology = '2G' AND s.rsrq IS NOT NULL AND s.rsrq <= 3 THEN 1
                  ELSE 0
                END) AS rsrp_pass,
                SUM(CASE
                  WHEN dtt.technology = '3G' AND s.rsrq >= -10 THEN 1
                  WHEN dtt.technology = '4G' AND s.sinr >= 0   THEN 1
                  WHEN dtt.technology = '2G' AND s.rsrq IS NOT NULL AND s.rsrq <= 3 THEN 1
                  ELSE 0
                END) AS sinr_pass,
                SUM(CASE WHEN s.event_type = 'CALL_DROP' THEN 1 ELSE 0 END) AS call_drops,
                SUM(CASE WHEN s.event_type = 'HANDOVER'  THEN 1 ELSE 0 END) AS handovers
           FROM drive_test_samples s
           JOIN drive_tests dtt ON dtt.drive_test_id = s.drive_test_id
           GROUP BY s.drive_test_id
       ) sub ON sub.drive_test_id = dt.drive_test_id
       ${where}
       GROUP BY o.operator_id, o.operator_name
       ORDER BY avg_rsrp DESC`,
    params
  );

  const overall = await query(
    `SELECT COUNT(DISTINCT dt.drive_test_id) AS total_tests,
            COALESCE(SUM(dt.total_samples), 0) AS total_samples,
            ROUND(COALESCE(SUM(dt.distance_km), 0), 1) AS total_distance_km,
            COUNT(DISTINCT dt.operator_id) AS operators_tested
       FROM drive_tests dt ${where}`,
    params
  );

  const byMonth = await query(
    `SELECT DATE_FORMAT(dt.test_date, '%Y-%m') AS month,
            COUNT(dt.drive_test_id) AS tests,
            COALESCE(SUM(dt.total_samples), 0) AS samples,
            ROUND(COALESCE(SUM(dt.distance_km), 0), 1) AS distance_km
       FROM drive_tests dt ${where}
       GROUP BY month ORDER BY month`,
    params
  );

  return { overall: overall[0], perOperator, byMonth };
}

export async function getConfig() {
  await query(`CREATE TABLE IF NOT EXISTS drive_test_config (
    config_key VARCHAR(50) PRIMARY KEY,
    config_value TEXT NOT NULL,
    description VARCHAR(200),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);

  const rows = await query('SELECT config_key, config_value, description FROM drive_test_config');
  const config = {};
  for (const r of rows) {
    try { config[r.config_key] = JSON.parse(r.config_value); }
    catch { config[r.config_key] = r.config_value; }
  }

  return {
    rsrp_threshold: config.rsrp_threshold ?? -100,
    rsrq_threshold: config.rsrq_threshold ?? -15,
    sinr_threshold: config.sinr_threshold ?? 0,
    dl_threshold: config.dl_threshold ?? 2000,
    ul_threshold: config.ul_threshold ?? 500,
    coverage_target: config.coverage_target ?? 95,
    gap_min_samples: config.gap_min_samples ?? 3,
    segment_size: config.segment_size ?? 25,
    nearby_radius_km: config.nearby_radius_km ?? 2,
    rsrp_excellent: config.rsrp_excellent ?? -80,
    rsrp_good: config.rsrp_good ?? -90,
    rsrp_fair: config.rsrp_fair ?? -100,
    rsrp_poor: config.rsrp_poor ?? -110,
    sinr_excellent: config.sinr_excellent ?? 20,
    sinr_good: config.sinr_good ?? 10,
    sinr_fair: config.sinr_fair ?? 0,
    score_weight_rsrp: config.score_weight_rsrp ?? 0.35,
    score_weight_sinr: config.score_weight_sinr ?? 0.25,
    score_weight_dl: config.score_weight_dl ?? 0.25,
    score_weight_rsrq: config.score_weight_rsrq ?? 0.15,
    ...config,
  };
}

export async function updateConfig(updates) {
  const { clearConfigCache } = await import('./scoring.service.js');
  await query(`CREATE TABLE IF NOT EXISTS drive_test_config (
    config_key VARCHAR(50) PRIMARY KEY,
    config_value TEXT NOT NULL,
    description VARCHAR(200),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);

  for (const [key, value] of Object.entries(updates)) {
    await query(
      `INSERT INTO drive_test_config (config_key, config_value)
       VALUES (:key, :val)
       ON DUPLICATE KEY UPDATE config_value = :val`,
      { key, val: JSON.stringify(value) }
    );
  }
  clearConfigCache();
  return getConfig();
}

export async function getNearbySites(driveTestId, radiusKm = 2) {
  const [bounds] = await query(
    `SELECT MIN(latitude) AS min_lat, MAX(latitude) AS max_lat,
            MIN(longitude) AS min_lon, MAX(longitude) AS max_lon
       FROM drive_test_samples WHERE drive_test_id = :id`, { id: driveTestId }
  );
  if (!bounds?.min_lat) return [];

  const delta = radiusKm / 111;
  return query(
    `SELECT s.site_id, s.site_code, s.site_name, s.latitude, s.longitude,
            s.technologies, o.operator_name
       FROM sites s
       JOIN operators o ON o.operator_id = s.operator_id
       WHERE s.latitude BETWEEN :minLat AND :maxLat
         AND s.longitude BETWEEN :minLon AND :maxLon
         AND s.latitude IS NOT NULL`,
    {
      minLat: bounds.min_lat - delta,
      maxLat: bounds.max_lat + delta,
      minLon: bounds.min_lon - delta,
      maxLon: bounds.max_lon + delta,
    }
  );
}

// ─── Live recording endpoints (mobile app) ──────────────────────────────────

/**
 * Create a live recording session. Returns the new drive_test_id.
 */
export async function createLiveSession({ operatorId, testName, routeType, technology, deviceModel, testerName, notes }) {
  await ensureTables();
  const ins = await query(
    `INSERT INTO drive_tests (operator_id, test_name, test_date, route_type, technology, device_model, tester_name, notes, status)
     VALUES (:opId, :name, CURDATE(), :route, :tech, :device, :tester, :notes, 'RECORDING')`,
    {
      opId: operatorId,
      name: testName || 'Live Test',
      route: routeType || 'urban',
      tech: technology || '4G',
      device: deviceModel || null,
      tester: testerName || null,
      notes: notes || null,
    }
  );
  return { driveTestId: ins.insertId };
}

/**
 * Bulk-insert GPS+signal sample batches from the mobile app.
 * Expects an array of sample objects.
 */
export async function addLiveSamples(driveTestId, samples) {
  if (!samples?.length) return { inserted: 0 };

  const values = [];
  for (const s of samples) {
    const lat = parseFloat(s.latitude);
    const lon = parseFloat(s.longitude);
    if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) continue;
    values.push([
      driveTestId,
      s.ts || null,
      lat, lon,
      s.rsrp != null ? parseFloat(s.rsrp) : null,
      s.rsrq != null ? parseFloat(s.rsrq) : null,
      s.sinr != null ? parseFloat(s.sinr) : null,
      s.rssi != null ? parseFloat(s.rssi) : null,
      s.dl_throughput != null ? parseFloat(s.dl_throughput) : null,
      s.ul_throughput != null ? parseFloat(s.ul_throughput) : null,
      s.pci != null ? parseInt(s.pci, 10) : null,
      s.earfcn != null ? parseInt(s.earfcn, 10) : null,
      s.band || null,
      s.event_type || null,
      s.call_status || null,
      s.serving_cell || null,
    ]);
  }

  if (!values.length) return { inserted: 0 };

  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < values.length; i += CHUNK) {
    const chunk = values.slice(i, i + CHUNK);
    await query(
      `INSERT INTO drive_test_samples
       (drive_test_id, ts, latitude, longitude, rsrp, rsrq, sinr, rssi, dl_throughput, ul_throughput, pci, earfcn, band, event_type, call_status, serving_cell)
       VALUES ${chunk.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}`,
      chunk.flat()
    );
    inserted += chunk.length;
  }

  return { inserted };
}

/**
 * End a live recording session. Computes total_samples, distance_km,
 * duration_min and sets status='COMPLETED'.
 */
export async function endLiveSession(driveTestId) {
  const [meta] = await query(
    'SELECT drive_test_id, created_at FROM drive_tests WHERE drive_test_id = :id AND status = :s',
    { id: driveTestId, s: 'RECORDING' }
  );
  if (!meta) throw ApiError.notFound('No active recording session found for this ID');

  // Count samples
  const [countRow] = await query(
    'SELECT COUNT(*) AS total FROM drive_test_samples WHERE drive_test_id = :id',
    { id: driveTestId }
  );

  // Compute distance via haversine over all ordered samples
  const allSamples = await query(
    'SELECT latitude, longitude FROM drive_test_samples WHERE drive_test_id = :id ORDER BY sample_id',
    { id: driveTestId }
  );
  let distKm = 0;
  for (let i = 1; i < allSamples.length; i++) {
    distKm += haversine(
      Number(allSamples[i - 1].latitude), Number(allSamples[i - 1].longitude),
      Number(allSamples[i].latitude), Number(allSamples[i].longitude)
    );
  }

  // Duration: difference between created_at and now
  const durationMin = Math.round((Date.now() - new Date(meta.created_at).getTime()) / 60000);

  await query(
    `UPDATE drive_tests SET total_samples = :total, distance_km = :dist, duration_min = :dur, status = 'COMPLETED'
     WHERE drive_test_id = :id`,
    { total: countRow.total, dist: distKm.toFixed(2), dur: durationMin, id: driveTestId }
  );

  const [updated] = await query(
    `SELECT dt.*, o.operator_name FROM drive_tests dt
       JOIN operators o ON o.operator_id = dt.operator_id
       WHERE dt.drive_test_id = :id`,
    { id: driveTestId }
  );

  return updated;
}
