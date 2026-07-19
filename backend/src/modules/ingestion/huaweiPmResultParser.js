import { parse } from 'csv-parse/sync';

// Parser for the Huawei U2020/PRS "pmresult" CSV export format:
//   row 1: Result Time, Granularity Period, Object Name, Reliability, <counterId>, <counterId>, ...
//   row 2: units row   (empty Result Time; e.g. None, per mill, bit/s, ms ...)
//   row 3+: data
// Columns past the 4 meta columns are NUMERIC COUNTER IDs (not names).
// Object Name is a compound NE/object descriptor that varies by domain.

const META = ['result time', 'granularity period', 'object name', 'reliability'];
const norm = (s) => String(s || '').trim().toLowerCase();

/** Parse the filename to recover measurement-type id, granularity and period. */
export function parsePmResultFilename(name = '') {
  // e.g. HOST03_pmresult_50331648_60_202606230000_202606230100.csv[.gz]
  const m = /^(?<host>[^_]+)_pmresult_(?<meas>\d+)_(?<gran>\d+)_(?<start>\d{12})_(?<end>\d{12})\.csv(\.gz)?$/i.exec(name);
  if (!m) return { host: null, measTypeId: null, granularityMin: null, periodStart: null, periodEnd: null };
  const toDate = (s) => new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(8,10)}:${s.slice(10,12)}:00Z`);
  return {
    host: m.groups.host,
    measTypeId: m.groups.meas,
    granularityMin: Number(m.groups.gran),
    periodStart: toDate(m.groups.start),
    periodEnd: toDate(m.groups.end),
  };
}

/**
 * Parse a Huawei Object Name string into structured identity.
 * Handles e.g.
 *   "SL0681_BUMBA_R/ULoCell:NodeB Function Name=3G_0681_BUMBA_R, Local Cell ID=11, Cell Name=N/A"
 *   "HW_FTRNC02/IUR:RNCID=10, LogicRNCID=11"
 */
export function parseObjectName(raw) {
  const out = { neName: null, objectType: null, attrs: {}, raw };
  if (!raw) return out;
  const slash = raw.indexOf('/');
  if (slash === -1) { out.neName = raw.trim(); return out; }
  out.neName = raw.slice(0, slash).trim();
  const rest = raw.slice(slash + 1);
  const colon = rest.indexOf(':');
  if (colon === -1) { out.objectType = rest.trim(); return out; }
  out.objectType = rest.slice(0, colon).trim();
  const attrStr = rest.slice(colon + 1);
  for (const pair of attrStr.split(',')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    out.attrs[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return out;
}

const isNa = (v) => v == null || v === '' || /^(n\/a|na|none|null)$/i.test(String(v).trim());

/**
 * @param buffer CSV bytes (already gunzipped)
 * @param fileName original filename (for measTypeId / granularity / period)
 * @param opts.includeUnreliable keep rows where Reliability != 'Reliable' (default false)
 * @returns { format, measTypeId, granularityMin, periodStart, periodEnd,
 *            counterIds[], units{id:unit}, records[], stats }
 */
export function parseHuaweiPmResult(buffer, fileName = '', opts = {}) {
  const includeUnreliable = opts.includeUnreliable === true;
  const rows = parse(buffer, { skip_empty_lines: true, relax_column_count: true, bom: true });
  if (!rows.length) return { format: 'huawei-pmresult', counterIds: [], records: [], units: {}, stats: { rows: 0 } };

  const header = rows[0].map((h) => String(h).trim());
  const idx = {
    time: header.findIndex((h) => norm(h) === 'result time'),
    gran: header.findIndex((h) => norm(h) === 'granularity period'),
    object: header.findIndex((h) => norm(h) === 'object name'),
    reliability: header.findIndex((h) => norm(h) === 'reliability'),
  };
  const counterCols = header
    .map((h, i) => ({ id: h.replace(/^"|"$/g, ''), i }))
    .filter((c) => !META.includes(norm(c.id)));

  // Detect & consume the units row (Result Time empty).
  let dataStart = 1;
  const units = {};
  if (rows[1] && isNa(rows[1][idx.time])) {
    for (const c of counterCols) units[c.id] = rows[1][c.i];
    dataStart = 2;
  }

  const meta = parsePmResultFilename(fileName);
  let reliable = 0, unreliable = 0, skipped = 0;
  const records = [];

  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r];
    const reliability = idx.reliability >= 0 ? String(row[idx.reliability] || '').trim() : '';
    const isReliable = norm(reliability) === 'reliable';
    if (isReliable) reliable++; else unreliable++;
    if (!isReliable && !includeUnreliable) { skipped++; continue; }

    const tsRaw = idx.time >= 0 ? row[idx.time] : null;
    const ts = tsRaw ? new Date(String(tsRaw).replace(' ', 'T') + 'Z') : null;
    const obj = parseObjectName(idx.object >= 0 ? row[idx.object] : '');

    const counters = {};
    let nonZero = 0;
    for (const c of counterCols) {
      const raw = row[c.i];
      if (isNa(raw)) { counters[c.id] = null; continue; }
      const n = Number(String(raw).replace(/,/g, ''));
      counters[c.id] = Number.isFinite(n) ? n : null;
      if (n) nonZero++;
    }

    records.push({
      ts: ts && !isNaN(ts) ? ts : null,
      reliability,
      neName: obj.neName,
      objectType: obj.objectType,
      localCellId: obj.attrs['Local Cell ID'] ?? null,
      cellName: isNa(obj.attrs['Cell Name']) ? null : obj.attrs['Cell Name'],
      nodeBName: obj.attrs['NodeB Function Name'] ?? null,
      rncId: obj.attrs['RNCID'] ?? null,
      attrs: obj.attrs,
      counters,
      nonZeroCounters: nonZero,
    });
  }

  return {
    format: 'huawei-pmresult',
    measTypeId: meta.measTypeId,
    granularityMin: meta.granularityMin ?? (rows[dataStart] ? Number(rows[dataStart][idx.gran]) : null),
    periodStart: meta.periodStart,
    periodEnd: meta.periodEnd,
    counterIds: counterCols.map((c) => c.id),
    units,
    records,
    stats: { rows: records.length, reliable, unreliable, skipped },
  };
}
