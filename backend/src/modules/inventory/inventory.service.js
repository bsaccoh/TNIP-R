import { query, withTransaction } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { parseGeoDimension } from './geoDimensionParser.js';

const TECH = { '2G': 1, '3G': 2, '4G': 3, '5G': 4 };

async function ensureRegions(names, q) {
  const map = new Map();
  for (const name of names) {
    let row = (await q('SELECT region_id FROM regions WHERE name = :n', { n: name }))[0];
    if (!row) { const r = await q('INSERT INTO regions (name) VALUES (:n)', { n: name }); row = { region_id: r.insertId }; }
    map.set(name, row.region_id);
  }
  return map;
}

async function ensureDistricts(districts, regionMap, q) {
  const map = new Map();
  for (const d of districts) {
    const regionId = d.region ? regionMap.get(d.region) : null;
    let row = (await q('SELECT district_id FROM districts WHERE name = :n', { n: d.name }))[0];
    if (!row) {
      const r = await q('INSERT INTO districts (region_id, name) VALUES (:rid, :n)', { rid: regionId, n: d.name });
      row = { district_id: r.insertId };
    }
    map.set(d.name, row.district_id);
  }
  return map;
}

const fmtDate = (d) => (d instanceof Date && !isNaN(d) ? d.toISOString().slice(0, 10) : null);

/** Import the Orange Geo-Dimension workbook for an operator. Upserts sites & cells. */
export async function importGeoDimension(operatorId, buffer) {
  const parsed = parseGeoDimension(buffer);
  if (!parsed.sites.length) throw ApiError.badRequest('No sites found — is this the Geo-Dimension workbook?');

  return withTransaction(async ({ q, conn }) => {
    const regionMap = await ensureRegions(parsed.regions, q);
    const districtMap = await ensureDistricts(parsed.districts, regionMap, q);

    // ── Sites (batched upsert) ──
    let sitesUpserted = 0;
    for (let i = 0; i < parsed.sites.length; i += 200) {
      const chunk = parsed.sites.slice(i, i + 200);
      const rows = chunk.map((s) => [
        operatorId, s.siteCode, s.siteName, s.latitude, s.longitude, s.towerHeight,
        s.classification, s.areaClass, s.owner,
        s.region ? regionMap.get(s.region) : null,
        s.district ? districtMap.get(s.district) : null,
        s.chiefdom, s.location, s.technologies, fmtDate(s.onAirDate), s.siteType,
      ]);
      const [res] = await conn.query(
        `INSERT INTO sites
           (operator_id, site_code, site_name, latitude, longitude, tower_height,
            classification, area_class, owner, region_id, district_id, chiefdom,
            location, technologies, on_air_date, site_type)
         VALUES ${rows.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}
         ON DUPLICATE KEY UPDATE
           site_name=VALUES(site_name), latitude=VALUES(latitude), longitude=VALUES(longitude),
           tower_height=VALUES(tower_height), classification=VALUES(classification),
           area_class=VALUES(area_class), owner=VALUES(owner), region_id=VALUES(region_id),
           district_id=VALUES(district_id), chiefdom=VALUES(chiefdom), location=VALUES(location),
           technologies=VALUES(technologies), on_air_date=VALUES(on_air_date), site_type=VALUES(site_type)`,
        rows.flat()
      );
      sitesUpserted += chunk.length;
    }

    // Resolve site_id by code for cell linkage.
    const siteIdByCode = new Map();
    const siteRows = await q('SELECT site_id, site_code FROM sites WHERE operator_id = :op', { op: operatorId });
    for (const r of siteRows) siteIdByCode.set(r.site_code, r.site_id);

    // ── Cells (batched upsert) ──
    let cellsUpserted = 0, cellsNoSite = 0;
    for (let i = 0; i < parsed.cells.length; i += 300) {
      const chunk = parsed.cells.slice(i, i + 300);
      const rows = [];
      for (const c of chunk) {
        const siteId = siteIdByCode.get(c.siteCode);
        if (!siteId) { cellsNoSite++; continue; }
        rows.push([
          operatorId, siteId, TECH[c.tech] ?? null, c.cellCode, c.cellName, c.neName,
          c.huaweiLcid ?? c.localCellId, c.cgi, c.lac, c.mcc, c.mnc, c.enodebId,
          c.bscName, c.latitude, c.longitude,
        ]);
      }
      if (!rows.length) continue;
      await conn.query(
        `INSERT INTO cells
           (operator_id, site_id, technology_id, cell_code, cell_name, ne_name,
            local_cell_id, cgi, lac, mcc, mnc, enodeb_id, bsc_name, latitude, longitude)
         VALUES ${rows.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}
         ON DUPLICATE KEY UPDATE
           technology_id=VALUES(technology_id), cell_name=VALUES(cell_name), ne_name=VALUES(ne_name),
           local_cell_id=VALUES(local_cell_id), cgi=VALUES(cgi), lac=VALUES(lac),
           mcc=VALUES(mcc), mnc=VALUES(mnc), enodeb_id=VALUES(enodeb_id),
           bsc_name=VALUES(bsc_name), latitude=VALUES(latitude), longitude=VALUES(longitude)`,
        rows.flat()
      );
      cellsUpserted += rows.length;
    }

    // ── Network reference (denormalized cell/site/location mapping) ──
    const siteMeta = new Map(parsed.sites.map((s) => [s.siteCode, s]));
    let refRows = 0;
    for (let i = 0; i < parsed.cells.length; i += 300) {
      const chunk = parsed.cells.slice(i, i + 300);
      const rows = chunk.map((c) => {
        const s = siteMeta.get(c.siteCode) || {};
        return [
          operatorId, c.tech, c.siteCode, s.siteName || null, c.cellCode, c.cellName,
          c.neName, c.huaweiLcid, c.localCellId, c.cgi, c.lac, c.enodebId, c.bscName,
          s.region || null, s.district || null, s.chiefdom || null, s.location || null,
          c.latitude ?? s.latitude ?? null, c.longitude ?? s.longitude ?? null,
        ];
      });
      await conn.query(
        `INSERT INTO network_reference
           (operator_id, technology, site_code, site_name, cell_code, cell_name, ne_name,
            huawei_lcid, sector_id, cgi, lac, enodeb_id, bsc_name, region, district,
            chiefdom, location, latitude, longitude)
         VALUES ${rows.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}
         ON DUPLICATE KEY UPDATE
           technology=VALUES(technology), site_name=VALUES(site_name), cell_name=VALUES(cell_name),
           ne_name=VALUES(ne_name), huawei_lcid=VALUES(huawei_lcid), sector_id=VALUES(sector_id),
           cgi=VALUES(cgi), lac=VALUES(lac), enodeb_id=VALUES(enodeb_id), bsc_name=VALUES(bsc_name),
           region=VALUES(region), district=VALUES(district), chiefdom=VALUES(chiefdom),
           location=VALUES(location), latitude=VALUES(latitude), longitude=VALUES(longitude)`,
        rows.flat()
      );
      refRows += rows.length;
    }

    return {
      regions: regionMap.size, districts: districtMap.size,
      sites: sitesUpserted, cells: cellsUpserted, cellsSkippedNoSite: cellsNoSite,
      referenceRows: refRows, parserStats: parsed.stats,
    };
  });
}

// ─── Read models for inventory UI / coverage map ───────────────────────────
export async function listSites({ operatorId, region, technology, search, status, limit, offset }) {
  const where = ['s.deleted_at IS NULL'];
  const params = { limit, offset };
  if (operatorId != null) { where.push('s.operator_id = :op'); params.op = operatorId; }
  if (region) { where.push('r.name = :region'); params.region = region; }
  if (search) { where.push('(s.site_code LIKE :s OR s.site_name LIKE :s)'); params.s = `%${search}%`; }
  if (status) { where.push('s.status = :status'); params.status = status; }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const rows = await query(
    `SELECT s.site_id, s.operator_id, o.operator_name, s.site_code, s.site_name,
            s.latitude, s.longitude, s.technologies, s.classification, s.status,
            r.name AS region, d.name AS district, s.chiefdom
       FROM sites s JOIN operators o ON o.operator_id = s.operator_id
       LEFT JOIN regions r ON r.region_id = s.region_id
       LEFT JOIN districts d ON d.district_id = s.district_id
       ${whereSql} ORDER BY s.site_code LIMIT :limit OFFSET :offset`, params);
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM sites s
       LEFT JOIN regions r ON r.region_id = s.region_id ${whereSql}`, params);
  return { rows, total };
}

/** Coordinates for the national coverage map (operator layer + tech filter). */
export async function mapSites({ operatorId, technology, status }) {
  const where = ['s.deleted_at IS NULL', 's.latitude IS NOT NULL'];
  const params = {};
  if (operatorId != null) { where.push('s.operator_id = :op'); params.op = operatorId; }
  if (technology) { where.push('s.technologies LIKE :t'); params.t = `%${technology}%`; }
  if (status) { where.push('s.status = :status'); params.status = status; }
  return query(
    `SELECT s.site_id, s.operator_id, s.site_code, s.site_name, s.latitude, s.longitude,
            s.technologies, s.status, r.name AS region
       FROM sites s LEFT JOIN regions r ON r.region_id = s.region_id
      WHERE ${where.join(' AND ')}`, params);
}

/** Cell-level coordinates for the coverage map. */
export async function mapCells({ operatorId, technology, status }) {
  const where = ['c.deleted_at IS NULL', '(c.latitude IS NOT NULL OR s.latitude IS NOT NULL)'];
  const params = {};
  if (operatorId != null) { where.push('c.operator_id = :op'); params.op = operatorId; }
  if (technology) { where.push('t.tech_key = :t'); params.t = technology; }
  if (status) { where.push('s.status = :status'); params.status = status; }
  return query(
    `SELECT c.cell_id, c.operator_id, c.cell_code, c.cell_name,
            COALESCE(c.latitude, s.latitude) AS latitude,
            COALESCE(c.longitude, s.longitude) AS longitude,
            t.tech_key, s.site_code, s.site_name, s.status,
            r.name AS region
       FROM cells c
       JOIN sites s ON s.site_id = c.site_id
       LEFT JOIN technologies t ON t.technology_id = c.technology_id
       LEFT JOIN regions r ON r.region_id = s.region_id
      WHERE ${where.join(' AND ')}`, params);
}

/** Region-level summary stats for the map sidebar. */
export async function mapRegionStats({ operatorId }) {
  const where = ['s.deleted_at IS NULL'];
  const params = {};
  if (operatorId != null) { where.push('s.operator_id = :op'); params.op = operatorId; }
  return query(
    `SELECT r.name AS region, COUNT(DISTINCT s.site_id) AS sites,
            COUNT(DISTINCT c.cell_id) AS cells,
            GROUP_CONCAT(DISTINCT t.tech_key ORDER BY t.tech_key SEPARATOR ',') AS technologies
       FROM sites s
       LEFT JOIN regions r ON r.region_id = s.region_id
       LEFT JOIN cells c ON c.site_id = s.site_id AND c.deleted_at IS NULL
       LEFT JOIN technologies t ON t.technology_id = c.technology_id
      WHERE ${where.join(' AND ')}
      GROUP BY r.name
      ORDER BY sites DESC`, params);
}

/** Cell-level KPI performance for heatmap overlay. Returns cells with their worst KPI value. */
export async function mapHeatData({ operatorId, kpiKey }) {
  const where = ['ck.granularity = \'DAY\''];
  const params = {};
  if (operatorId != null) { where.push('ck.operator_id = :op'); params.op = operatorId; }
  if (kpiKey) { where.push('k.kpi_key = :kpi'); params.kpi = kpiKey; }
  return query(
    `SELECT ck.cell_id,
            COALESCE(c.latitude, s.latitude) AS latitude,
            COALESCE(c.longitude, s.longitude) AS longitude,
            c.cell_code, s.site_code, k.kpi_key,
            ROUND(AVG(ck.value), 2) AS avg_value,
            cr.required_value AS threshold,
            cr.status AS compliance_status
       FROM calculated_kpis ck
       JOIN cells c ON c.cell_id = ck.cell_id
       JOIN sites s ON s.site_id = c.site_id
       JOIN kpi_definitions k ON k.kpi_id = ck.kpi_id
       LEFT JOIN compliance_results cr ON cr.operator_id = ck.operator_id
         AND cr.kpi_id = ck.kpi_id AND cr.technology_id = ck.technology_id
      WHERE ${where.join(' AND ')}
        AND (c.latitude IS NOT NULL OR s.latitude IS NOT NULL)
      GROUP BY ck.cell_id, c.latitude, c.longitude, s.latitude, s.longitude,
               c.cell_code, s.site_code, k.kpi_key, cr.required_value, cr.status
      LIMIT 10000`, params);
}

/** Resolve cell/site/location from the reference mapping (by cell_code, cgi, or site_code). */
export async function resolveReference({ operatorId, cellCode, cgi, siteCode, limit = 50 }) {
  const where = [];
  const params = { limit };
  if (operatorId != null) { where.push('operator_id = :op'); params.op = operatorId; }
  if (cellCode) { where.push('cell_code = :cc'); params.cc = cellCode; }
  if (cgi) { where.push('cgi = :cgi'); params.cgi = cgi; }
  if (siteCode) { where.push('site_code = :sc'); params.sc = siteCode; }
  if (!where.length) throw ApiError.badRequest('Provide cellCode, cgi or siteCode');
  return query(
    `SELECT * FROM network_reference WHERE ${where.join(' AND ')} LIMIT :limit`, params);
}

// ─── Single-site CRUD ─────────────────────────────────────────────────────────

/** Create a single site. Resolves region/district names to IDs. */
export async function createSite({ operator_id, site_code, site_name, region, district, classification, latitude, longitude, status }) {
  if (!operator_id || !site_code || !site_name) throw ApiError.badRequest('operator_id, site_code and site_name are required');

  let region_id = null;
  if (region) {
    const rows = await query('SELECT region_id FROM regions WHERE name = :n', { n: region });
    if (!rows.length) throw ApiError.badRequest(`Region "${region}" not found`);
    region_id = rows[0].region_id;
  }

  let district_id = null;
  if (district) {
    const rows = await query('SELECT district_id FROM districts WHERE name = :n', { n: district });
    if (!rows.length) throw ApiError.badRequest(`District "${district}" not found`);
    district_id = rows[0].district_id;
  }

  const result = await query(
    `INSERT INTO sites (operator_id, site_code, site_name, region_id, district_id, classification, latitude, longitude, status)
     VALUES (:operator_id, :site_code, :site_name, :region_id, :district_id, :classification, :latitude, :longitude, :status)`,
    { operator_id, site_code, site_name, region_id, district_id, classification: classification || null, latitude: latitude || null, longitude: longitude || null, status: status || 'ACTIVE' }
  );
  return { site_id: result.insertId };
}

/** Update a site by ID. Only provided fields are changed. */
export async function updateSite(siteId, fields) {
  const existing = await query('SELECT site_id FROM sites WHERE site_id = :id AND deleted_at IS NULL', { id: siteId });
  if (!existing.length) throw ApiError.notFound('Site not found');

  const sets = [];
  const params = { id: siteId };

  if (fields.operator_id !== undefined) { sets.push('operator_id = :operator_id'); params.operator_id = fields.operator_id; }
  if (fields.site_code !== undefined) { sets.push('site_code = :site_code'); params.site_code = fields.site_code; }
  if (fields.site_name !== undefined) { sets.push('site_name = :site_name'); params.site_name = fields.site_name; }
  if (fields.classification !== undefined) { sets.push('classification = :classification'); params.classification = fields.classification; }
  if (fields.latitude !== undefined) { sets.push('latitude = :latitude'); params.latitude = fields.latitude; }
  if (fields.longitude !== undefined) { sets.push('longitude = :longitude'); params.longitude = fields.longitude; }
  if (fields.status !== undefined) { sets.push('status = :status'); params.status = fields.status; }

  if (fields.region !== undefined) {
    if (fields.region) {
      const rows = await query('SELECT region_id FROM regions WHERE name = :n', { n: fields.region });
      if (!rows.length) throw ApiError.badRequest(`Region "${fields.region}" not found`);
      params.region_id = rows[0].region_id;
    } else {
      params.region_id = null;
    }
    sets.push('region_id = :region_id');
  }

  if (fields.district !== undefined) {
    if (fields.district) {
      const rows = await query('SELECT district_id FROM districts WHERE name = :n', { n: fields.district });
      if (!rows.length) throw ApiError.badRequest(`District "${fields.district}" not found`);
      params.district_id = rows[0].district_id;
    } else {
      params.district_id = null;
    }
    sets.push('district_id = :district_id');
  }

  if (!sets.length) throw ApiError.badRequest('No fields to update');

  await query(`UPDATE sites SET ${sets.join(', ')} WHERE site_id = :id`, params);
  return { site_id: siteId };
}

/** Soft-delete a site and hard-delete its related cells. */
export async function deleteSite(siteId) {
  const existing = await query('SELECT site_id FROM sites WHERE site_id = :id AND deleted_at IS NULL', { id: siteId });
  if (!existing.length) throw ApiError.notFound('Site not found');

  await query('DELETE FROM cells WHERE site_id = :id', { id: siteId });
  await query('UPDATE sites SET deleted_at = NOW() WHERE site_id = :id', { id: siteId });
  return { site_id: siteId };
}

export async function inventoryStats(operatorId) {
  const op = operatorId != null ? 'WHERE operator_id = :op' : '';
  const p = operatorId != null ? { op: operatorId } : {};
  const [sites] = await query(`SELECT COUNT(*) c FROM sites ${op}`, p);
  const [cells] = await query(`SELECT COUNT(*) c FROM cells ${op}`, p);
  const byTech = await query(
    `SELECT t.tech_key, COUNT(*) c FROM cells cl JOIN technologies t ON t.technology_id=cl.technology_id
     ${op ? 'WHERE cl.operator_id = :op' : ''} GROUP BY t.tech_key`, p);
  return { sites: sites.c, cells: cells.c, byTech };
}

/**
 * Network footprint broken down by operator and technology, for the
 * inventory charts. Returns:
 *   sites: [{ operator_id, operator_name, sites }]
 *   cells: [{ operator_name, tech_key, cells }]   (one row per operator×tech)
 * The frontend pivots `cells` into stacked-bar series.
 */
export async function inventoryBreakdown(operatorId) {
  const opFilter = operatorId != null ? 'WHERE o.operator_id = :op' : '';
  const p = operatorId != null ? { op: operatorId } : {};

  const sites = await query(
    `SELECT o.operator_id, o.operator_name,
            COUNT(s.site_id) AS sites
       FROM operators o
       LEFT JOIN sites s ON s.operator_id = o.operator_id AND s.deleted_at IS NULL
       ${opFilter}
      GROUP BY o.operator_id, o.operator_name
      ORDER BY sites DESC`, p);

  const cells = await query(
    `SELECT o.operator_name, t.tech_key,
            COUNT(c.cell_id) AS cells
       FROM operators o
       JOIN cells c ON c.operator_id = o.operator_id AND c.deleted_at IS NULL
       LEFT JOIN technologies t ON t.technology_id = c.technology_id
       ${opFilter}
      GROUP BY o.operator_name, t.tech_key
      ORDER BY o.operator_name, t.tech_key`, p);

  return { sites, cells };
}
