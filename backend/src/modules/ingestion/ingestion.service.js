import crypto from 'node:crypto';
import { query, withTransaction } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../config/logger.js';
import { parseHuaweiPmCsv } from './huaweiCsvParser.js';
import { parseHuaweiPmResult, parsePmResultFilename } from './huaweiPmResultParser.js';
import { siteCodeOf, cellCodeOf } from '../inventory/geoDimensionParser.js';
import { expandToCsvEntries } from './decompress.js';

const HUAWEI_VENDOR_ID = 1;
const TECH = { '2G': 1, '3G': 2, '4G': 3, '5G': 4 };
const TECH_KEY = { 1: '2G', 2: '3G', 3: '4G', 4: '5G' };

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

const tsStr = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

/** Decide which parser to use from filename / header. */
export function detectFormat(fileName, buffer) {
  if (/pmresult_/i.test(fileName)) return 'huawei-pmresult';
  const head = buffer.slice(0, 200).toString('utf8').toLowerCase();
  if (head.includes('object name') && head.includes('result time')) return 'huawei-pmresult';
  return 'huawei-named';
}

/** Infer technology id from a Huawei NodeB function name prefix (e.g. "3G_0666..."). */
function techFromNodeB(nodeBName) {
  if (!nodeBName) return null;
  const m = /^(2G|3G|4G|5G)/i.exec(nodeBName.trim());
  return m ? TECH[m[1].toUpperCase()] : null;
}

/** Resolve counter ids for numeric/named keys; auto-create unknowns with provenance. */
async function resolveCounters(keys, technologyId, metaByKey, txq) {
  const map = new Map();
  if (!keys.length) return map;
  const existing = await txq(
    `SELECT counter_id, counter_key FROM counter_definitions
      WHERE vendor_id=:v AND technology_id=:t
        AND counter_key IN (${keys.map((_, i) => `:k${i}`).join(',')})`,
    { v: HUAWEI_VENDOR_ID, t: technologyId, ...Object.fromEntries(keys.map((k, i) => [`k${i}`, k])) }
  );
  for (const r of existing) map.set(r.counter_key, r.counter_id);
  for (const key of keys) {
    if (map.has(key)) continue;
    const meta = metaByKey?.[key] || {};
    const res = await txq(
      `INSERT INTO counter_definitions
         (vendor_id, technology_id, counter_key, counter_name, meas_type_id, raw_unit, category, measurement_object, status)
       VALUES (:v, :t, :key, :key, :mt, :unit, 'Uncategorized', :mo, 'UNKNOWN')`,
      { v: HUAWEI_VENDOR_ID, t: technologyId, key, mt: meta.measTypeId ?? null,
        unit: meta.unit ?? null, mo: meta.measurementObject ?? null }
    );
    map.set(key, res.insertId);
  }
  return map;
}

/**
 * Ensure a site (and optional cell) exist; returns { siteId, cellId|null }.
 * Idempotent against inventory-imported rows — keys on (operator, site_code) and
 * (operator, cell_code), so a PM cell whose code matches an imported inventory
 * cell binds to it instead of duplicating. opts carries enrichment for new rows.
 */
async function ensureSiteCell(operatorId, technologyId, siteCode, cellCode, opts, txq, cache) {
  siteCode = siteCode || 'UNKNOWN_SITE';
  const ck = `${siteCode}|${cellCode ?? ''}`;
  if (cache.has(ck)) return cache.get(ck);

  let site = (await txq('SELECT site_id FROM sites WHERE operator_id=:op AND site_code=:c', { op: operatorId, c: siteCode }))[0];
  if (!site) {
    const r = await txq(
      `INSERT INTO sites (operator_id, vendor_id, site_code, site_name, status) VALUES (:op,:v,:c,:n,'ACTIVE')`,
      { op: operatorId, v: HUAWEI_VENDOR_ID, c: siteCode, n: opts?.siteName || siteCode }
    );
    site = { site_id: r.insertId };
  }

  let cellId = null;
  if (cellCode) {
    let cell = (await txq('SELECT cell_id FROM cells WHERE operator_id=:op AND cell_code=:c', { op: operatorId, c: cellCode }))[0];
    if (!cell) {
      const r = await txq(
        `INSERT INTO cells (operator_id, site_id, technology_id, cell_code, cell_name, ne_name, local_cell_id, status)
         VALUES (:op,:s,:t,:c,:c,:ne,:lc,'ACTIVE')`,
        { op: operatorId, s: site.site_id, t: technologyId, c: cellCode, ne: opts?.neName ?? null, lc: opts?.localCellId ?? null }
      );
      cell = { cell_id: r.insertId };
    }
    cellId = cell.cell_id;
  }
  const out = { siteId: site.site_id, cellId };
  cache.set(ck, out);
  return out;
}

// ─── pmresult (real Huawei U2020/PRS) ingestion ─────────────────────────────
async function ingestPmResult({ operatorId, fileName, buffer, uploadedBy, hash }) {
  const parsed = parseHuaweiPmResult(buffer, fileName);
  if (!parsed.records.length) throw ApiError.badRequest('No reliable data rows in pmresult file');

  const fileMeta = parsePmResultFilename(fileName);
  // Technology from first record's NodeB prefix, else default 3G/UMTS (sample domain).
  const technologyId = techFromNodeB(parsed.records.find((r) => r.nodeBName)?.nodeBName) || TECH['3G'];
  const granularity = parsed.granularityMin === 30 ? '30MIN' : 'HOUR';

  const metaByKey = {};
  for (const id of parsed.counterIds) {
    metaByKey[id] = { measTypeId: parsed.measTypeId, unit: parsed.units[id], measurementObject: parsed.records[0]?.objectType };
  }

  return withTransaction(async ({ q, conn }) => {
    const fileRes = await q(
      `INSERT INTO pm_files
         (operator_id, vendor_id, technology_id, uploaded_by, file_name, file_hash,
          source_host, meas_type_id, format, reliability_skipped, granularity,
          period_start, period_end, row_count, status)
       VALUES (:op,:v,:t,:by,:fn,:hash,:host,:mt,'huawei-pmresult',:skip,:gran,:ps,:pe,:rc,'PARSING')`,
      { op: operatorId, v: HUAWEI_VENDOR_ID, t: technologyId, by: uploadedBy ?? null,
        fn: fileName, hash, host: fileMeta.host, mt: parsed.measTypeId, skip: parsed.stats.skipped,
        gran: granularity,
        ps: parsed.periodStart ? tsStr(parsed.periodStart) : null,
        pe: parsed.periodEnd ? tsStr(parsed.periodEnd) : null,
        rc: parsed.records.length }
    );
    const pmFileId = fileRes.insertId;

    const counterMap = await resolveCounters(parsed.counterIds, technologyId, metaByKey, q);
    const cache = new Map();
    
    // Pre-warm cache for all known sites and cells for this operator to eliminate N+1 queries
    const allSites = await q('SELECT site_code, site_id FROM sites WHERE operator_id=:op', { op: operatorId });
    for (const s of allSites) cache.set(`${s.site_code}|`, { siteId: s.site_id, cellId: null });
    
    const allCells = await q('SELECT c.cell_code, c.cell_id, s.site_code FROM cells c JOIN sites s ON c.site_id=s.site_id WHERE c.operator_id=:op', { op: operatorId });
    for (const c of allCells) cache.set(`${c.site_code}|${c.cell_code}`, { siteId: c.site_id, cellId: c.cell_id });

    const values = [];

    const techKey = TECH_KEY[technologyId];
    for (const rec of parsed.records) {
      if (!rec.ts) continue;
      // Site code = SLxxxx prefix of the NE name (aligns with inventory).
      const siteCode = siteCodeOf(rec.neName);
      // Cell-level objects carry a Local Cell ID; interface objects (IUR) don't → site-level.
      const cellCode = rec.localCellId != null ? cellCodeOf(siteCode, techKey, rec.localCellId) : null;
      const { siteId, cellId } = await ensureSiteCell(
        operatorId, technologyId, siteCode, cellCode,
        { siteName: rec.neName, neName: rec.neName, localCellId: rec.localCellId }, q, cache
      );
      const t = tsStr(rec.ts);
      for (const [key, val] of Object.entries(rec.counters)) {
        if (val == null) continue;
        values.push([operatorId, pmFileId, siteId, cellId, counterMap.get(key), t, val]);
      }
    }

    let inserted = 0;
    const CHUNK = 10000;
    for (let i = 0; i < values.length; i += CHUNK) {
      const chunk = values.slice(i, i + CHUNK);
      const [res] = await conn.query(
        `INSERT INTO counter_values (operator_id, pm_file_id, site_id, cell_id, counter_id, ts, value)
         VALUES ${chunk.map(() => '(?,?,?,?,?,?,?)').join(',')}`,
        chunk.flat()
      );
      inserted += res.affectedRows || chunk.length;
    }

    const unknowns = await q(
      `SELECT COUNT(*) AS c FROM counter_definitions
        WHERE vendor_id=:v AND technology_id=:t AND status='UNKNOWN'
          AND counter_key IN (${parsed.counterIds.map((_, i) => `:k${i}`).join(',')})`,
      { v: HUAWEI_VENDOR_ID, t: technologyId, ...Object.fromEntries(parsed.counterIds.map((k, i) => [`k${i}`, k])) }
    );

    await q(`UPDATE pm_files SET status='PARSED', row_count=:rc WHERE pm_file_id=:id`,
      { rc: parsed.records.length, id: pmFileId });
    await q(`INSERT INTO pm_file_logs (pm_file_id, level, message) VALUES (:id,'INFO',:m)`,
      { id: pmFileId, m: `pmresult ${parsed.measTypeId}: ${parsed.records.length} rows, ${parsed.counterIds.length} counters (${unknowns[0].c} unmapped), ${inserted} values, ${parsed.stats.skipped} unreliable skipped` });

    return {
      format: 'huawei-pmresult', pmFileId, measTypeId: parsed.measTypeId,
      technologyId, rows: parsed.records.length, counters: parsed.counterIds.length,
      unmappedCounters: unknowns[0].c, values: inserted, unreliableSkipped: parsed.stats.skipped,
      periodStart: parsed.periodStart, periodEnd: parsed.periodEnd,
    };
  });
}

// ─── named-counter CSV ingestion (synthetic/test format) ────────────────────
async function ingestNamedCsv({ operatorId, fileName, buffer, uploadedBy, hash }) {
  const parsed = parseHuaweiPmCsv(buffer);
  if (!parsed.records.length) throw ApiError.badRequest('No data rows found in CSV');
  const technologyId = TECH['4G'];

  return withTransaction(async ({ q, conn }) => {
    const fileRes = await q(
      `INSERT INTO pm_files (operator_id, vendor_id, technology_id, uploaded_by, file_name, file_hash,
                             format, granularity, period_start, period_end, row_count, status)
       VALUES (:op,:v,:t,:by,:fn,:hash,'huawei-named','DAY',:ps,:pe,:rc,'PARSING')`,
      { op: operatorId, v: HUAWEI_VENDOR_ID, t: technologyId, by: uploadedBy ?? null, fn: fileName, hash,
        ps: parsed.periodStart ? tsStr(parsed.periodStart) : null,
        pe: parsed.periodEnd ? tsStr(parsed.periodEnd) : null, rc: parsed.records.length }
    );
    const pmFileId = fileRes.insertId;
    const counterMap = await resolveCounters(parsed.meta.counterKeys, technologyId, {}, q);
    const cache = new Map();
    
    const allSites = await q('SELECT site_code, site_id FROM sites WHERE operator_id=:op', { op: operatorId });
    for (const s of allSites) cache.set(`${s.site_code}|`, { siteId: s.site_id, cellId: null });
    
    const allCells = await q('SELECT c.cell_code, c.cell_id, s.site_code FROM cells c JOIN sites s ON c.site_id=s.site_id WHERE c.operator_id=:op', { op: operatorId });
    for (const c of allCells) cache.set(`${c.site_code}|${c.cell_code}`, { siteId: c.site_id, cellId: c.cell_id });

    const values = [];
    for (const rec of parsed.records) {
      if (!rec.ts) continue;
      const cellCode = rec.cellName || rec.cellId || 'UNKNOWN_CELL';
      const { siteId, cellId } = await ensureSiteCell(
        operatorId, technologyId, rec.enodeb || 'UNKNOWN_SITE', cellCode,
        { siteName: rec.enodeb, neName: rec.enodeb, localCellId: rec.cellId }, q, cache
      );
      const t = tsStr(rec.ts);
      for (const [key, val] of Object.entries(rec.counters)) {
        if (val == null) continue;
        values.push([operatorId, pmFileId, siteId, cellId, counterMap.get(key), t, val]);
      }
    }
    let inserted = 0;
    const CHUNK = 10000;
    for (let i = 0; i < values.length; i += CHUNK) {
      const chunk = values.slice(i, i + CHUNK);
      const [res] = await conn.query(
        `INSERT INTO counter_values (operator_id, pm_file_id, site_id, cell_id, counter_id, ts, value)
         VALUES ${chunk.map(() => '(?,?,?,?,?,?,?)').join(',')}`, chunk.flat());
      inserted += res.affectedRows || chunk.length;
    }
    await q(`UPDATE pm_files SET status='PARSED' WHERE pm_file_id=:id`, { id: pmFileId });
    return { format: 'huawei-named', pmFileId, rows: parsed.records.length,
      counters: parsed.meta.counterKeys.length, values: inserted,
      periodStart: parsed.periodStart, periodEnd: parsed.periodEnd };
  });
}

/** Dispatcher: detect format, dedupe, ingest. Operator-aware end to end. */
export async function ingestFile({ operatorId, fileName, buffer, uploadedBy }) {
  const hash = sha256(buffer);
  const dup = await query('SELECT pm_file_id FROM pm_files WHERE operator_id=:op AND file_hash=:h', { op: operatorId, h: hash });
  if (dup.length) throw ApiError.conflict('Duplicate file: identical content already uploaded', { pmFileId: dup[0].pm_file_id });

  const format = detectFormat(fileName, buffer);
  const args = { operatorId, fileName, buffer, uploadedBy, hash };
  return format === 'huawei-pmresult' ? ingestPmResult(args) : ingestNamedCsv(args);
}

// Back-compat alias for existing controller import.
export const ingestHuaweiCsv = ingestFile;

/**
 * Ingest a possibly-compressed file or archive (.csv/.gz/.tar.gz). Each CSV
 * member is ingested independently; one bad file does not abort the batch.
 * Returns a per-file summary — the entry point for SFTP/batch ingestion.
 */
export async function ingestArchive({ operatorId, fileName, buffer, uploadedBy }) {
  const entries = await expandToCsvEntries(fileName, buffer);
  const results = [];
  let ok = 0, failed = 0, duplicates = 0;
  for (const e of entries) {
    try {
      const r = await ingestFile({ operatorId, fileName: e.name, buffer: e.buffer, uploadedBy });
      results.push({ file: e.name, status: 'ok', pmFileId: r.pmFileId, rows: r.rows });
      ok++;
    } catch (err) {
      if (err?.status === 409) { duplicates++; results.push({ file: e.name, status: 'duplicate' }); }
      else { failed++; results.push({ file: e.name, status: 'failed', error: err.message }); logger.warn(`ingest ${e.name} failed: ${err.message}`); }
    }
  }
  return { archive: fileName, total: entries.length, ok, duplicates, failed, results };
}

export async function listFiles({ operatorId, limit, offset }) {
  const where = operatorId != null ? 'WHERE pf.operator_id = :op' : '';
  const params = operatorId != null ? { op: operatorId, limit, offset } : { limit, offset };
  const rows = await query(
    `SELECT pf.pm_file_id, pf.operator_id, o.operator_name, pf.file_name, pf.format,
            pf.meas_type_id, pf.source_host, pf.granularity, pf.period_start, pf.period_end,
            pf.row_count, pf.reliability_skipped, pf.status, pf.upload_date
       FROM pm_files pf JOIN operators o ON o.operator_id = pf.operator_id
       ${where}
      ORDER BY pf.upload_date DESC LIMIT :limit OFFSET :offset`, params);
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM pm_files pf ${where}`, params);
  return { rows, total };
}
