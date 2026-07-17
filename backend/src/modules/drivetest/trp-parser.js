import { createRequire } from 'node:module';
import { Buffer } from 'node:buffer';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
const JSZip = typeof globalThis.JSZip !== 'undefined'
  ? globalThis.JSZip
  : (await import('jszip')).default;

// ── Protobuf wire-format helpers ────────────────────────────────────────────

function decodeVarint(buf, pos) {
  let result = 0, shift = 0;
  while (pos < buf.length) {
    const b = buf[pos++];
    result |= (b & 0x7f) << shift;
    if (!(b & 0x80)) break;
    shift += 7;
    if (shift > 49) break;
  }
  return [result, pos];
}

function parsePb(buf) {
  const fields = {};
  let p = 0;
  while (p < buf.length) {
    let tag;
    [tag, p] = decodeVarint(buf, p);
    const fn = tag >>> 3;
    const wt = tag & 7;
    if (fn === 0) break;

    if (wt === 0) {
      let val;
      [val, p] = decodeVarint(buf, p);
      (fields[fn] ??= []).push({ t: 'v', v: val });
    } else if (wt === 2) {
      let len;
      [len, p] = decodeVarint(buf, p);
      if (p + len > buf.length) break;
      (fields[fn] ??= []).push({ t: 'b', v: buf.subarray(p, p + len) });
      p += len;
    } else if (wt === 1) {
      if (p + 8 > buf.length) break;
      (fields[fn] ??= []).push({ t: 'd', v: buf.readDoubleLE(p) });
      p += 8;
    } else if (wt === 5) {
      if (p + 4 > buf.length) break;
      (fields[fn] ??= []).push({ t: 'f', v: buf.readFloatLE(p) });
      p += 4;
    } else {
      break;
    }
  }
  return fields;
}

function iterRecords(decompressed) {
  const records = [];
  let pos = 0;
  while (pos < decompressed.length) {
    let size;
    [size, pos] = decodeVarint(decompressed, pos);
    if (size <= 0 || size > 500000 || pos + size > decompressed.length) break;
    records.push(parsePb(decompressed.subarray(pos, pos + size)));
    pos += size;
  }
  return records;
}

function decompressCdf(raw) {
  const payload = raw.subarray(8);
  return Buffer.from(zlib.inflateSync(payload));
}

// ── Param ID constants ──────────────────────────────────────────────────────

const PID = {
  RSRP: 9990,
  RSRQ: 9982,
  SINR: 12238,
  PCI: 10078,
  BAND: 12390,
  DL_EARFCN: 13134,
  UL_EARFCN: 10190,
  PDSCH_TP: 12214,
  PUSCH_TP: 10782,
  PDSCH_TOTAL: 14454,
  PUSCH_TOTAL: 14448,
  LATITUDE: 603,
  LONGITUDE: 602,
  SPEED: 600,
  ALTITUDE: 601,
};

function extractValue(sub) {
  for (const entry of sub[10] ?? []) if (entry.t === 'f') return entry.v;
  for (const entry of sub[11] ?? []) if (entry.t === 'd') return entry.v;
  for (const entry of sub[9] ?? [])  if (entry.t === 'v') return entry.v;
  for (const entry of sub[8] ?? [])  if (entry.t === 'v') return entry.v;
  for (const entry of sub[6] ?? [])  if (entry.t === 'v') return entry.v;
  return null;
}

// ── XML metadata extraction ─────────────────────────────────────────────────

function extractXmlTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function extractXmlAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\b${attr}="([^"]*)"`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function extractNamedProp(xml, propName) {
  const re = new RegExp(`<Property>\\s*<Name>${propName}</Name>\\s*<Value[^>]*>([^<]*)</Value>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() || null : null;
}

async function parseMetadata(zip) {
  const meta = {
    device: null, os: null, appVersion: null,
    operator: null, mcc: null, mnc: null, imei: null,
    startTime: null, endTime: null, tags: null,
  };

  try {
    const contentXml = await zip.file('trp/content.xml')?.async('text');
    if (contentXml) {
      meta.startTime = extractXmlTag(contentXml, 'Time')
        || extractXmlTag(contentXml, 'a:Time');
      meta.tags = extractXmlTag(contentXml, 'Tags');
      const verMajor = extractXmlTag(contentXml, 'a:_Major');
      const verMinor = extractXmlTag(contentXml, 'a:_Minor');
      if (verMajor) meta.appVersion = `TEMS Pocket ${verMajor}.${verMinor || '0'}`;
    }
  } catch {}

  try {
    const sysXml = await zip.file('trp/systeminformation.xml')?.async('text');
    if (sysXml) {
      const mfr = extractXmlTag(sysXml, 'Manufacturer');
      const model = extractXmlTag(sysXml, 'Model');
      if (model) meta.device = mfr ? `${mfr} ${model}` : model;
      const osName = extractXmlTag(sysXml, 'Caption');
      const osMajor = extractXmlTag(sysXml, 'a:_Major');
      if (osName) meta.os = osMajor && osMajor !== '-1' ? `${osName} ${osMajor}` : osName;
    }
  } catch {}

  try {
    const spXml = await zip.file('trp/providers/sp1/serviceprovider.xml')?.async('text');
    if (spXml) {
      meta.imei = extractNamedProp(spXml, 'IMEI');
      const imsi = extractNamedProp(spXml, 'IMSI');
      if (imsi && imsi.length >= 5) {
        meta.mcc = imsi.slice(0, 3);
        meta.mnc = imsi.slice(3, 5);
      }
    }
  } catch {}

  if (meta.mcc === '619') {
    if (meta.mnc === '01') meta.operator = 'Orange Sierra Leone';
    else if (meta.mnc === '03') meta.operator = 'Africell Sierra Leone';
    else if (meta.mnc === '05') meta.operator = 'Qcell Sierra Leone';
    else if (meta.mnc === '04') meta.operator = 'Sierra Tel';
  }

  return meta;
}

// ── Metadata-only preview (no CDF parsing) ─────────────────────────────────

export async function previewTrpFile(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const meta = await parseMetadata(zip);

  let technology = '4G';
  const tags = meta.tags?.toLowerCase() || '';
  if (tags.includes('5g') || tags.includes('nr')) technology = '5G';
  else if (tags.includes('lte') || tags.includes('4g') || tags.includes('3gul') || tags.includes('3gdl')) technology = '4G';
  else if (tags.includes('3g') || tags.includes('umts') || tags.includes('wcdma')) technology = '3G';
  else if (tags.includes('2g') || tags.includes('gsm')) technology = '2G';

  let testName = null;
  if (meta.tags) {
    const parts = meta.tags.split(';').map(s => s.trim()).filter(Boolean);
    const meaningful = parts.filter(p =>
      !p.startsWith('TEMS') && !p.startsWith('Internal') && !p.startsWith('External'));
    if (meaningful.length) testName = meaningful.join(' — ');
  }

  return {
    operator: meta.operator || null,
    device: meta.device || null,
    os: meta.os || null,
    technology,
    testDate: meta.startTime ? meta.startTime.split('T')[0] : null,
    testName,
    appVersion: meta.appVersion || null,
    imei: meta.imei || null,
  };
}

// ── Main parser ─────────────────────────────────────────────────────────────

export async function parseTrpFile(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  const meta = await parseMetadata(zip);

  const providerDirs = [];
  zip.forEach((path) => {
    const m = path.match(/^trp\/providers\/(sp\d+)\/$/);
    if (m) providerDirs.push(m[1]);
  });
  if (!providerDirs.length) providerDirs.push('sp1');

  let allSamples = [];

  for (const sp of providerDirs) {
    const declFile = zip.file(`trp/providers/${sp}/cdf/declarations.cdf`);
    const dataFile = zip.file(`trp/providers/${sp}/cdf/data.cdf`);
    if (!declFile || !dataFile) continue;

    const declRaw = Buffer.from(await declFile.async('arraybuffer'));
    const dataRaw = Buffer.from(await dataFile.async('arraybuffer'));

    const declBuf = decompressCdf(declRaw);
    const dataBuf = decompressCdf(dataRaw);

    const paramNames = {};
    for (const rec of iterRecords(declBuf)) {
      const pid = rec[2]?.[0]?.v;
      const name = rec[1]?.[0]?.v;
      if (pid != null && name) {
        paramNames[pid] = Buffer.isBuffer(name) ? name.toString('utf-8') : String(name);
      }
    }

    let currentTs = null;
    let currentValues = {};

    const flush = () => {
      if (!currentTs) return;
      const lat = currentValues[PID.LATITUDE];
      const lon = currentValues[PID.LONGITUDE];
      if (lat != null && lon != null && lat !== 0 && lon !== 0) {
        allSamples.push({
          ts: new Date(currentTs * 1000),
          latitude: lat,
          longitude: lon,
          rsrp: currentValues[PID.RSRP] ?? null,
          rsrq: currentValues[PID.RSRQ] ?? null,
          sinr: currentValues[PID.SINR] ?? null,
          pci: currentValues[PID.PCI] ?? null,
          band: currentValues[PID.BAND] != null ? String(currentValues[PID.BAND]) : null,
          earfcn: currentValues[PID.DL_EARFCN] ?? null,
          dl_throughput: currentValues[PID.PDSCH_TOTAL] ?? currentValues[PID.PDSCH_TP] ?? null,
          ul_throughput: currentValues[PID.PUSCH_TOTAL] ?? currentValues[PID.PUSCH_TP] ?? null,
          speed: currentValues[PID.SPEED] ?? null,
          altitude: currentValues[PID.ALTITUDE] ?? null,
        });
      }
    };

    for (const rec of iterRecords(dataBuf)) {
      let ts = null;
      const tsSub = rec[1]?.[0];
      if (tsSub?.t === 'b') {
        const inner = parsePb(tsSub.v);
        ts = inner[1]?.[0]?.v ?? null;
      }

      if (ts && ts !== currentTs) {
        flush();
        currentTs = ts;
        currentValues = {};
      }

      for (const dp of rec[3] ?? []) {
        if (dp.t !== 'b') continue;
        const sub = parsePb(dp.v);
        const pid = sub[1]?.[0]?.v;
        if (pid == null) continue;
        const val = extractValue(sub);
        if (val != null) currentValues[pid] = val;
      }
    }
    flush();
  }

  allSamples.sort((a, b) => a.ts - b.ts);

  let distanceKm = 0;
  for (let i = 1; i < allSamples.length; i++) {
    distanceKm += haversine(
      allSamples[i - 1].latitude, allSamples[i - 1].longitude,
      allSamples[i].latitude, allSamples[i].longitude,
    );
  }

  const durationMin = allSamples.length >= 2
    ? Math.round((allSamples[allSamples.length - 1].ts - allSamples[0].ts) / 60000)
    : 0;

  return {
    meta,
    samples: allSamples,
    summary: {
      totalSamples: allSamples.length,
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMin,
      startTime: allSamples[0]?.ts ?? null,
      endTime: allSamples[allSamples.length - 1]?.ts ?? null,
    },
  };
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
