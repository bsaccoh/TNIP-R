import { query } from '../../config/db.js';

/* ── Campaigns assigned to this technician ───────────────────────────────── */
export async function getMyCampaigns(userId) {
  // dt_campaigns stores technicians as a JSON array of user_ids
  const rows = await query(`
    SELECT c.campaign_id, c.campaign_ref, c.campaign_name, c.status,
           c.planned_start, c.planned_end, c.actual_start,
           o.operator_name, o.operator_id,
           COUNT(DISTINCT ct.drive_test_id) AS linked_tests
      FROM dt_campaigns c
      JOIN operators o ON o.operator_id = c.operator_id
      LEFT JOIN dt_campaign_tests ct ON ct.campaign_id = c.campaign_id
     WHERE JSON_CONTAINS(c.technicians, :uid)
       AND c.status IN ('PLANNING','IN_PROGRESS')
     GROUP BY c.campaign_id
     ORDER BY c.planned_end ASC`, { uid: JSON.stringify(userId) })
    .catch(() => []);
  return rows;
}

/* ── Start a field session → creates a drive_tests record ────────────────── */
export async function startSession({ userId, userName, campaignId, operatorId, technology, deviceModel, routeType }) {
  const testName = `Field-${userName || `User${userId}`}-${new Date().toISOString().slice(0, 10)}`;

  // If campaignId provided, get the operator from the campaign
  let opId = operatorId;
  if (campaignId && !opId) {
    const [camp] = await query(
      `SELECT operator_id FROM dt_campaigns WHERE campaign_id = :campaignId`, { campaignId });
    opId = camp?.operator_id;
  }

  const result = await query(`
    INSERT INTO drive_tests
      (operator_id, test_name, test_date, route_type, technology, device_model, tester_name, status)
    VALUES
      (:opId, :testName, CURDATE(), :routeType, :technology, :deviceModel, :testerName, 'RECORDING')`,
    {
      opId:        opId || null,
      testName,
      routeType:   routeType || 'Urban',
      technology:  technology || '4G',
      deviceModel: deviceModel || 'Mobile Device',
      testerName:  userName || String(userId),
    });

  const driveTestId = result.insertId;

  // Link to campaign if provided
  if (campaignId) {
    await query(`INSERT IGNORE INTO dt_campaign_tests (campaign_id, drive_test_id)
                 VALUES (:campaignId, :driveTestId)`, { campaignId, driveTestId });
  }

  return { driveTestId, testName };
}

/* ── Add a GPS + signal reading ──────────────────────────────────────────── */
export async function addReading(driveTestId, reading) {
  const {
    latitude, longitude, accuracy,
    rsrp, rsrq, sinr, rssi,
    dl_throughput, ul_throughput,
    pci, band, technology,
    cell_id, event_type,
    recorded_at,
  } = reading;

  await query(`
    INSERT INTO drive_test_samples
      (drive_test_id, ts, latitude, longitude,
       rsrp, rsrq, sinr, rssi,
       dl_throughput, ul_throughput,
       pci, band, event_type, serving_cell)
    VALUES
      (:driveTestId, :ts, :lat, :lng,
       :rsrp, :rsrq, :sinr, :rssi,
       :dl, :ul,
       :pci, :band, :evt, :cell)`,
    {
      driveTestId,
      ts:   recorded_at || new Date(),
      lat:  latitude  || null,
      lng:  longitude || null,
      rsrp: rsrp      || null,
      rsrq: rsrq      || null,
      sinr: sinr      || null,
      rssi: rssi      || null,
      dl:   dl_throughput || null,
      ul:   ul_throughput || null,
      pci:  pci       || null,
      band: band || technology || null,
      evt:  event_type || 'NORMAL',
      cell: cell_id   || null,
    });

  return { ok: true };
}

/* ── Bulk readings upload (for offline sync) ─────────────────────────────── */
export async function bulkReadings(driveTestId, readings) {
  for (const r of readings) {
    await addReading(driveTestId, r);
  }
  return { uploaded: readings.length };
}

/* ── End a session ───────────────────────────────────────────────────────── */
export async function endSession(driveTestId, notes) {
  // Aggregate from samples
  const [stats] = await query(`
    SELECT COUNT(*) AS sample_count,
           AVG(rsrp) AS avg_rsrp,
           AVG(sinr) AS avg_sinr,
           AVG(dl_throughput) AS avg_dl,
           MIN(latitude)  AS lat_min, MAX(latitude)  AS lat_max,
           MIN(longitude) AS lng_min, MAX(longitude) AS lng_max
      FROM drive_test_samples
     WHERE drive_test_id = :driveTestId`, { driveTestId });

  await query(`
    UPDATE drive_tests
       SET status = 'COMPLETED',
           notes  = CONCAT(COALESCE(notes,''), IF(:notes IS NOT NULL AND :notes != '', CONCAT(' | ', :notes), ''))
     WHERE drive_test_id = :driveTestId`, { driveTestId, notes: notes || null });

  return {
    driveTestId,
    sampleCount:  Number(stats?.sample_count || 0),
    avgRsrp:      stats?.avg_rsrp ? +Number(stats.avg_rsrp).toFixed(2) : null,
    avgSinr:      stats?.avg_sinr ? +Number(stats.avg_sinr).toFixed(2) : null,
    avgDl:        stats?.avg_dl   ? +Number(stats.avg_dl).toFixed(2)   : null,
  };
}

/* ── My recent sessions ──────────────────────────────────────────────────── */
export async function getMyHistory(userName, limit = 20) {
  return query(`
    SELECT dt.drive_test_id, dt.test_name, dt.test_date, dt.technology,
           dt.status, dt.route_type, o.operator_name,
           COUNT(s.sample_id) AS sample_count,
           AVG(s.rsrp) AS avg_rsrp, AVG(s.sinr) AS avg_sinr,
           AVG(s.dl_throughput) AS avg_dl
      FROM drive_tests dt
      LEFT JOIN operators o ON o.operator_id = dt.operator_id
      LEFT JOIN drive_test_samples s ON s.drive_test_id = dt.drive_test_id
     WHERE dt.tester_name = :userName
     GROUP BY dt.drive_test_id
     ORDER BY dt.test_date DESC, dt.drive_test_id DESC
     LIMIT :limit`, { userName, limit });
}

/* ── Session detail ──────────────────────────────────────────────────────── */
export async function getSession(driveTestId) {
  const [test] = await query(`
    SELECT dt.*, o.operator_name
      FROM drive_tests dt
      LEFT JOIN operators o ON o.operator_id = dt.operator_id
     WHERE dt.drive_test_id = :driveTestId`, { driveTestId });
  if (!test) return null;

  const samples = await query(`
    SELECT ts, latitude, longitude, rsrp, rsrq, sinr, dl_throughput, ul_throughput, band, event_type
      FROM drive_test_samples
     WHERE drive_test_id = :driveTestId
     ORDER BY ts DESC
     LIMIT 200`, { driveTestId });

  return { ...test, samples };
}
