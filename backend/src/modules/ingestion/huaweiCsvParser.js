import { parse } from 'csv-parse/sync';

// Header aliases for the non-counter (meta) columns of a Huawei PM CSV export.
// Everything NOT matched here is treated as a counter column.
const TIME_COLS = ['start time', 'period start time', 'begin time', 'time', 'datetime', 'date time'];
const DATE_COLS = ['date'];
const ENODEB_COLS = ['enodeb name', 'enodeb', 'nodeb name', 'ne name', 'enodeb id'];
const CELL_NAME_COLS = ['cell name', 'cell', 'eutrancell', 'cellname'];
const CELL_ID_COLS = ['cell id', 'localcell id', 'cell ci', 'cellid', 'ci'];
const IGNORE_COLS = ['object name', 'reliability', 'granularity period', 'result time', 'integrity'];

const norm = (s) => String(s || '').trim().toLowerCase();
const findCol = (headers, aliases) => headers.find((h) => aliases.includes(norm(h)));

function toTimestamp(row, headers, timeCol, dateCol) {
  if (timeCol && row[timeCol]) {
    // Huawei often emits "2026-06-01 00:00:00" or "06/01/2026 00:00"
    const v = String(row[timeCol]).trim();
    const d = new Date(v.replace(/\//g, '-'));
    if (!isNaN(d)) return d;
  }
  if (dateCol && row[dateCol]) {
    const d = new Date(String(row[dateCol]).trim());
    if (!isNaN(d)) return d;
  }
  return null;
}

/**
 * Parse a Huawei PM CSV buffer.
 * @returns {{
 *   meta: { timeCol, enodebCol, cellNameCol, cellIdCol, counterKeys: string[] },
 *   records: Array<{ ts: Date|null, enodeb: string, cellName: string, cellId: string,
 *                    counters: Record<string, number|null> }>,
 *   periodStart: Date|null, periodEnd: Date|null
 * }}
 */
export function parseHuaweiPmCsv(buffer) {
  const rows = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
    bom: true,
  });
  if (!rows.length) {
    return { meta: { counterKeys: [] }, records: [], periodStart: null, periodEnd: null };
  }

  const headers = Object.keys(rows[0]);
  const timeCol = findCol(headers, TIME_COLS);
  const dateCol = findCol(headers, DATE_COLS);
  const enodebCol = findCol(headers, ENODEB_COLS);
  const cellNameCol = findCol(headers, CELL_NAME_COLS);
  const cellIdCol = findCol(headers, CELL_ID_COLS);

  const metaSet = new Set([timeCol, dateCol, enodebCol, cellNameCol, cellIdCol].filter(Boolean));
  const counterKeys = headers.filter(
    (h) => !metaSet.has(h) && !IGNORE_COLS.includes(norm(h))
  );

  let periodStart = null;
  let periodEnd = null;
  const records = rows.map((row) => {
    const ts = toTimestamp(row, headers, timeCol, dateCol);
    if (ts) {
      if (!periodStart || ts < periodStart) periodStart = ts;
      if (!periodEnd || ts > periodEnd) periodEnd = ts;
    }
    const counters = {};
    for (const key of counterKeys) {
      const raw = row[key];
      if (raw === '' || raw == null || norm(raw) === 'na' || norm(raw) === 'null') {
        counters[key] = null;
      } else {
        const n = Number(String(raw).replace(/,/g, ''));
        counters[key] = Number.isFinite(n) ? n : null;
      }
    }
    return {
      ts,
      enodeb: enodebCol ? String(row[enodebCol] || '').trim() : '',
      cellName: cellNameCol ? String(row[cellNameCol] || '').trim() : '',
      cellId: cellIdCol ? String(row[cellIdCol] || '').trim() : '',
      counters,
    };
  });

  return {
    meta: { timeCol, enodebCol, cellNameCol, cellIdCol, counterKeys },
    records,
    periodStart,
    periodEnd,
  };
}
