import { query } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

export async function ensureTables() {
  await query(`CREATE TABLE IF NOT EXISTS dt_campaigns (
    campaign_id     INT AUTO_INCREMENT PRIMARY KEY,
    campaign_ref    VARCHAR(40)  NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT         NULL,
    operator_id     INT          NOT NULL,
    obligation_id   INT          NULL,          -- optional link to license obligation
    status          ENUM('PLANNING','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'PLANNING',
    objective       TEXT         NULL,           -- what this campaign is verifying
    target_area     VARCHAR(255) NULL,           -- e.g. "Western Area Urban", "Bo District"
    technology      VARCHAR(20)  NULL,
    planned_start   DATE         NULL,
    planned_end     DATE         NULL,
    actual_start    DATE         NULL,
    actual_end      DATE         NULL,
    technicians     JSON         NULL,           -- array of { userId, name, role }
    waypoints       JSON         NULL,           -- array of { lat, lng, label } for planned route
    planned_tests   INT          DEFAULT 0,
    notes           TEXT         NULL,
    created_by      INT          NULL,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);

  await query(`CREATE TABLE IF NOT EXISTS dt_campaign_tests (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id     INT NOT NULL,
    drive_test_id   INT NOT NULL,
    added_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_camp_test (campaign_id, drive_test_id),
    FOREIGN KEY (campaign_id)   REFERENCES dt_campaigns(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (drive_test_id) REFERENCES drive_tests(drive_test_id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);
}

function generateRef() {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `DTC-${y}${m}-${rand}`;
}

/* ── CRUD ────────────────────────────────────────────────────────────────── */
export async function listCampaigns({ operatorId, status, limit = 50, offset = 0 } = {}) {
  await ensureTables();
  const conds = []; const params = {};
  if (operatorId) { conds.push('c.operator_id = :operatorId'); params.operatorId = operatorId; }
  if (status)     { conds.push('c.status = :status');          params.status = status; }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  params.limit = Number(limit); params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(`
      SELECT c.*, o.operator_name,
             u.full_name AS created_by_name,
             COUNT(ct.drive_test_id) AS actual_tests,
             COALESCE(SUM(dt.total_samples), 0) AS total_samples,
             COALESCE(SUM(dt.distance_km), 0) AS total_distance_km
        FROM dt_campaigns c
        JOIN operators o ON o.operator_id = c.operator_id
        LEFT JOIN users u ON u.user_id = c.created_by
        LEFT JOIN dt_campaign_tests ct ON ct.campaign_id = c.campaign_id
        LEFT JOIN drive_tests dt ON dt.drive_test_id = ct.drive_test_id
       ${where}
       GROUP BY c.campaign_id
       ORDER BY c.created_at DESC
       LIMIT :limit OFFSET :offset`, params),
    query(`SELECT COUNT(*) AS total FROM dt_campaigns c ${where}`, params),
  ]);
  return { rows, total, limit: params.limit, offset: params.offset };
}

export async function getCampaign(campaignId) {
  await ensureTables();
  const [campaign] = await query(`
    SELECT c.*, o.operator_name, u.full_name AS created_by_name
      FROM dt_campaigns c
      JOIN operators o ON o.operator_id = c.operator_id
      LEFT JOIN users u ON u.user_id = c.created_by
     WHERE c.campaign_id = :campaignId`, { campaignId });
  if (!campaign) return null;

  const tests = await query(`
    SELECT dt.drive_test_id, dt.test_name, dt.test_date, dt.route_type, dt.technology,
           dt.tester_name, dt.status, dt.total_samples, dt.distance_km, dt.duration_min,
           dt.created_at,
           ROUND(AVG(s.rsrp), 2) AS avg_rsrp,
           ROUND(AVG(s.sinr), 2) AS avg_sinr,
           ROUND(AVG(s.dl_throughput), 2) AS avg_dl,
           SUM(CASE WHEN s.rsrp >= -100 THEN 1 ELSE 0 END) AS rsrp_pass,
           COUNT(s.sample_id) AS sample_count
      FROM dt_campaign_tests ct
      JOIN drive_tests dt ON dt.drive_test_id = ct.drive_test_id
      LEFT JOIN drive_test_samples s ON s.drive_test_id = dt.drive_test_id
     WHERE ct.campaign_id = :campaignId
     GROUP BY dt.drive_test_id
     ORDER BY dt.test_date DESC`, { campaignId });

  return { ...campaign, tests };
}

export async function createCampaign({
  name, description, operatorId, obligationId, objective, targetArea, technology,
  plannedStart, plannedEnd, plannedTests = 0, technicians, waypoints, notes, createdBy,
}) {
  await ensureTables();
  const ref = generateRef();
  const result = await query(`
    INSERT INTO dt_campaigns
      (campaign_ref, name, description, operator_id, obligation_id, objective,
       target_area, technology, planned_start, planned_end, planned_tests,
       technicians, waypoints, notes, created_by)
    VALUES
      (:ref, :name, :description, :operatorId, :obligationId, :objective,
       :targetArea, :technology, :plannedStart, :plannedEnd, :plannedTests,
       :technicians, :waypoints, :notes, :createdBy)`,
    {
      ref, name, description: description ?? null, operatorId,
      obligationId: obligationId ?? null, objective: objective ?? null,
      targetArea: targetArea ?? null, technology: technology ?? null,
      plannedStart: plannedStart ?? null, plannedEnd: plannedEnd ?? null,
      plannedTests: Number(plannedTests ?? 0),
      technicians: technicians ? JSON.stringify(technicians) : null,
      waypoints: waypoints ? JSON.stringify(waypoints) : null,
      notes: notes ?? null, createdBy: createdBy ?? null,
    });
  return getCampaign(result.insertId);
}

export async function updateCampaign(campaignId, fields) {
  await ensureTables();
  const allowed = ['name','description','objective','target_area','technology',
                   'planned_start','planned_end','planned_tests','technicians',
                   'waypoints','notes','obligation_id'];
  const sets = []; const params = { campaignId };
  for (const [k, v] of Object.entries(fields)) {
    const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowed.includes(col)) {
      sets.push(`${col} = :${k}`);
      params[k] = ['technicians','waypoints'].includes(col) && v !== null
        ? JSON.stringify(v) : v;
    }
  }
  if (!sets.length) throw Object.assign(new Error('No valid fields'), { status: 400 });
  await query(`UPDATE dt_campaigns SET ${sets.join(', ')}, updated_at = NOW()
               WHERE campaign_id = :campaignId`, params);
  return getCampaign(campaignId);
}

export async function updateStatus(campaignId, status) {
  await ensureTables();
  const allowed = ['PLANNING','IN_PROGRESS','COMPLETED','CANCELLED'];
  if (!allowed.includes(status)) throw Object.assign(new Error('Invalid status'), { status: 400 });

  const extra = status === 'IN_PROGRESS' ? ', actual_start = COALESCE(actual_start, CURDATE())'
    : status === 'COMPLETED'   ? ', actual_end = COALESCE(actual_end, CURDATE())'
    : '';
  await query(`UPDATE dt_campaigns SET status = :status${extra}, updated_at = NOW()
               WHERE campaign_id = :campaignId`, { status, campaignId });
  return getCampaign(campaignId);
}

/* ── Test linkage ────────────────────────────────────────────────────────── */
export async function addTest(campaignId, driveTestId) {
  await ensureTables();
  await query(`INSERT IGNORE INTO dt_campaign_tests (campaign_id, drive_test_id)
               VALUES (:campaignId, :driveTestId)`, { campaignId, driveTestId });
  return getCampaign(campaignId);
}

export async function removeTest(campaignId, driveTestId) {
  await ensureTables();
  await query(`DELETE FROM dt_campaign_tests WHERE campaign_id = :campaignId AND drive_test_id = :driveTestId`,
    { campaignId, driveTestId });
}

/* ── Aggregate analytics ─────────────────────────────────────────────────── */
export async function campaignAnalytics(campaignId) {
  await ensureTables();
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw ApiError.notFound('Campaign not found');

  const [agg] = await query(`
    SELECT COUNT(DISTINCT s.sample_id) AS total_samples,
           ROUND(AVG(s.rsrp), 2)  AS avg_rsrp,
           ROUND(MIN(s.rsrp), 2)  AS min_rsrp,
           ROUND(MAX(s.rsrp), 2)  AS max_rsrp,
           ROUND(AVG(s.sinr), 2)  AS avg_sinr,
           ROUND(AVG(s.dl_throughput), 2) AS avg_dl,
           ROUND(AVG(s.ul_throughput), 2) AS avg_ul,
           SUM(CASE WHEN s.rsrp >= -80  THEN 1 ELSE 0 END) AS rsrp_excellent,
           SUM(CASE WHEN s.rsrp >= -90  AND s.rsrp < -80  THEN 1 ELSE 0 END) AS rsrp_good,
           SUM(CASE WHEN s.rsrp >= -100 AND s.rsrp < -90  THEN 1 ELSE 0 END) AS rsrp_fair,
           SUM(CASE WHEN s.rsrp >= -110 AND s.rsrp < -100 THEN 1 ELSE 0 END) AS rsrp_poor,
           SUM(CASE WHEN s.rsrp < -110  THEN 1 ELSE 0 END) AS rsrp_no_signal,
           SUM(CASE WHEN s.rsrp >= -100 THEN 1 ELSE 0 END) AS rsrp_pass,
           SUM(CASE WHEN s.sinr >= 0    THEN 1 ELSE 0 END) AS sinr_pass,
           SUM(CASE WHEN s.dl_throughput >= 2000 THEN 1 ELSE 0 END) AS dl_pass,
           SUM(CASE WHEN s.event_type = 'CALL_DROP' THEN 1 ELSE 0 END) AS call_drops,
           SUM(CASE WHEN s.event_type = 'HANDOVER'  THEN 1 ELSE 0 END) AS handovers
      FROM dt_campaign_tests ct
      JOIN drive_test_samples s ON s.drive_test_id = ct.drive_test_id
     WHERE ct.campaign_id = :campaignId`, { campaignId });

  const byTest = await query(`
    SELECT dt.drive_test_id, dt.test_name, dt.test_date, dt.tester_name, dt.distance_km,
           ROUND(AVG(s.rsrp), 2) AS avg_rsrp,
           ROUND(AVG(s.sinr), 2) AS avg_sinr,
           ROUND(AVG(s.dl_throughput), 2) AS avg_dl,
           COUNT(s.sample_id) AS samples,
           SUM(CASE WHEN s.rsrp >= -100 THEN 1 ELSE 0 END) AS rsrp_pass,
           COUNT(s.sample_id) AS total
      FROM dt_campaign_tests ct
      JOIN drive_tests dt ON dt.drive_test_id = ct.drive_test_id
      LEFT JOIN drive_test_samples s ON s.drive_test_id = dt.drive_test_id
     WHERE ct.campaign_id = :campaignId
     GROUP BY dt.drive_test_id
     ORDER BY dt.test_date`, { campaignId });

  const total = agg.total_samples || 1;
  return {
    campaign: { campaign_id: campaign.campaign_id, name: campaign.name,
                operator_name: campaign.operator_name, status: campaign.status },
    totals: {
      tests: campaign.tests.length,
      samples: agg.total_samples,
      distanceKm: campaign.tests.reduce((s, t) => s + Number(t.distance_km || 0), 0).toFixed(1),
    },
    signal: { avg_rsrp: agg.avg_rsrp, min_rsrp: agg.min_rsrp, max_rsrp: agg.max_rsrp,
               avg_sinr: agg.avg_sinr, avg_dl: agg.avg_dl, avg_ul: agg.avg_ul },
    compliance: {
      rsrp: { pass: agg.rsrp_pass, pct: +((agg.rsrp_pass / total) * 100).toFixed(1) },
      sinr: { pass: agg.sinr_pass, pct: +((agg.sinr_pass / total) * 100).toFixed(1) },
      dl:   { pass: agg.dl_pass,   pct: +((agg.dl_pass   / total) * 100).toFixed(1) },
    },
    distribution: {
      excellent: agg.rsrp_excellent, good: agg.rsrp_good, fair: agg.rsrp_fair,
      poor: agg.rsrp_poor, noSignal: agg.rsrp_no_signal,
    },
    events: { callDrops: agg.call_drops, handovers: agg.handovers },
    byTest,
  };
}

/* ── Summary for dashboard ───────────────────────────────────────────────── */
export async function campaignSummary() {
  await ensureTables();
  const [counts] = await query(`
    SELECT COUNT(*) AS total,
           SUM(status='PLANNING')     AS planning,
           SUM(status='IN_PROGRESS')  AS in_progress,
           SUM(status='COMPLETED')    AS completed,
           SUM(status='CANCELLED')    AS cancelled
      FROM dt_campaigns`);
  const active = await query(`
    SELECT c.campaign_ref, c.name, c.target_area, c.status,
           o.operator_name,
           COUNT(ct.drive_test_id) AS tests_done,
           c.planned_tests,
           c.planned_end
      FROM dt_campaigns c
      JOIN operators o ON o.operator_id = c.operator_id
      LEFT JOIN dt_campaign_tests ct ON ct.campaign_id = c.campaign_id
     WHERE c.status IN ('PLANNING','IN_PROGRESS')
     GROUP BY c.campaign_id
     ORDER BY c.planned_end ASC LIMIT 5`);
  return { ...counts, active };
}
