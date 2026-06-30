import xlsx from 'xlsx';

// Parser for the Orange "Geo-Dimension" workbook:
//   sheet "OSL_Physical Sites"  → physical site master (coords, region, district…)
//   sheet "GEO-DIM 2G_3G_4G_5G" → cell master (CellName, LocalCellID, CGI, tech…)
// Bakes in the data-quality fixes observed in the real file:
//   • region/district trimming + known typo correction
//   • Technology normalization ("3G_HUAWEI" → "3G"), keeping a vendor hint
//   • cell dedupe on (siteCode, localCellId, tech), preferring the Huawei/OSS row
//     (it is the variant that matches Huawei PM data)

const SHEET_SITES = 'OSL_Physical Sites';
const SHEET_CELLS = 'GEO-DIM 2G_3G_4G_5G';

const clean = (v) => (v == null ? null : String(v).trim().replace(/\s+/g, ' ') || null);

const REGION_FIX = {
  'weatern area': 'Western Area',
  'western area': 'Western Area',
  'eastern': 'Eastern',
  'southern': 'Southern',
  'northern': 'Northern',
};
export function normalizeRegion(v) {
  const c = clean(v);
  if (!c) return null;
  return REGION_FIX[c.toLowerCase()] || c;
}

/** "3G_HUAWEI" → { tech: "3G", vendor: "HUAWEI" }; "3G" → { tech:"3G", vendor:null } */
export function normalizeTech(v) {
  const c = clean(v);
  if (!c) return { tech: null, vendor: null };
  const m = /^(2G|3G|4G|5G)(?:_([A-Z]+))?$/i.exec(c);
  if (!m) return { tech: c.toUpperCase(), vendor: null };
  return { tech: m[1].toUpperCase(), vendor: m[2] ? m[2].toUpperCase() : null };
}

/** Site code from a NE/site name, e.g. "SL0666_NJALA_R" → "SL0666". */
export function siteCodeOf(v) {
  const c = clean(v);
  if (!c) return null;
  const m = /^(SL\d+)/i.exec(c);
  return m ? m[1].toUpperCase() : c;
}

// Canonical PM-aligned cell code (matches Huawei PM "Local Cell ID").
export const cellCodeOf = (siteCode, tech, huaweiLcid) =>
  `${siteCode}_${tech}_LC${huaweiLcid}`;

// The real Huawei Local Cell ID is embedded as the CellName suffix, e.g.
// "3G_NAIAHUN_R-11" → 11. The GEO-DIM "LocalCellID" column is only a sector index.
export function huaweiLcidFromCellName(cellName) {
  const m = /-(\d+)\s*$/.exec(cellName || '');
  return m ? m[1] : null;
}

function sheetRows(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Sheet not found: "${name}"`);
  return xlsx.utils.sheet_to_json(ws, { defval: null, raw: false });
}

export function parseGeoDimension(buffer) {
  const wb = xlsx.read(buffer, { type: 'buffer', cellDates: true });

  // ── Sites ──
  const siteRows = sheetRows(wb, SHEET_SITES);
  const sites = [];
  const regions = new Set();
  const districts = new Map(); // name → region
  for (const r of siteRows) {
    const code = clean(r['SITE ID']);
    if (!code) continue;
    const region = normalizeRegion(r['Region']);
    const district = clean(r['District']);
    if (region) regions.add(region);
    if (district) districts.set(district, region);
    const lat = parseFloat(r['LATITUDE']);
    const lon = parseFloat(r['LONGITUDE']);
    sites.push({
      siteCode: code,
      siteName: clean(r['SITE NAME']),
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lon) ? lon : null,
      towerHeight: r['Tower Height'] != null ? parseFloat(r['Tower Height']) || null : null,
      technologies: clean(r['Technology']),
      classification: clean(r['Classification']),
      areaClass: clean(r['NAtCa Sites Classification']),
      owner: clean(r['OWNER']),
      region, district,
      chiefdom: clean(r['Chiefdom']),
      location: clean(r['Location_Updated']) || clean(r['Location']),
      onAirDate: r['OnAir Date'] instanceof Date ? r['OnAir Date'] : null,
      siteType: clean(r['Site Type']),
    });
  }

  // ── Cells (dedupe, prefer Huawei-tagged variant) ──
  const cellRows = sheetRows(wb, SHEET_CELLS);
  const cellMap = new Map(); // cellCode → cell
  let raw = 0;
  for (const r of cellRows) {
    const siteCode = clean(r['Site ID']);
    const lcid = clean(r['LocalCellID']);
    const { tech, vendor } = normalizeTech(r['Technology']);
    if (!siteCode || lcid == null || !tech) continue;
    raw++;
    const cellName = clean(r['CellName']);
    // Prefer the Huawei Local Cell ID embedded in CellName (PM-aligned); else
    // fall back to the sector-index column with a distinct "_S" code so it
    // cannot be mistaken for a PM-resolvable cell.
    const huaweiLcid = huaweiLcidFromCellName(cellName);
    const code = huaweiLcid != null
      ? cellCodeOf(siteCode, tech, huaweiLcid)
      : `${siteCode}_${tech}_S${lcid}`;
    const lat = parseFloat(r['Latitude']);
    const lon = parseFloat(r['Longitude']);
    const cell = {
      cellCode: code, siteCode, tech, vendor,
      cellName,
      huaweiLcid,
      neName: clean(r['NE Name']),
      btsName: clean(r['BTS Name']),
      localCellId: lcid,
      enodebId: clean(r['BTS ID/eNodeBID']),
      mcc: clean(r['MCC']), mnc: clean(r['MNC']),
      lac: clean(r['LAC']) || clean(r['LAC ']),
      cellId: clean(r['Cell Id']),
      cgi: clean(r['CGI']),
      bscName: clean(r['BSC Name']),
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lon) ? lon : null,
    };
    const existing = cellMap.get(code);
    // Prefer the HUAWEI-tagged row (matches PM/OSS); otherwise keep first seen.
    if (!existing || (vendor === 'HUAWEI' && existing.vendor !== 'HUAWEI')) {
      cellMap.set(code, cell);
    }
  }

  return {
    sites,
    cells: [...cellMap.values()],
    regions: [...regions],
    districts: [...districts.entries()].map(([name, region]) => ({ name, region })),
    stats: { siteRows: siteRows.length, cellRowsRaw: raw, cellsDeduped: cellMap.size },
  };
}
