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

// ── Dynamic PID discovery from declarations ──────────────────────────────────

function discoverPids(idToName) {
  const pids = {};
  for (const [pidStr, name] of Object.entries(idToName)) {
    const pid = +pidStr;
    const n = name.toLowerCase();
    // GPS
    if (n === 'location.latitude')  { pids.LATITUDE  ??= pid; continue; }
    if (n === 'location.longitude') { pids.LONGITUDE ??= pid; continue; }
    if (n === 'location.speed')     { pids.SPEED     ??= pid; continue; }
    if (n === 'location.altitude')  { pids.ALTITUDE  ??= pid; continue; }
    // LTE
    if (/radio\.lte\.servingcell\[\d+\]\.rsrp$/i.test(n))          { pids.RSRP       ??= pid; continue; }
    if (/radio\.lte\.servingcell\[\d+\]\.rsrq$/i.test(n))          { pids.RSRQ       ??= pid; continue; }
    if (/radio\.lte\.servingcell\[\d+\]\.pci$/i.test(n))           { pids.PCI        ??= pid; continue; }
    if (/radio\.lte\.servingcell\[\d+\]\.pdsch\.sinr$/i.test(n))   { pids.SINR       ??= pid; continue; }
    if (/radio\.lte\.servingcell\[\d+\]\.downlink\.earfcn$/i.test(n)) { pids.DL_EARFCN ??= pid; continue; }
    if (/radio\.lte\.servingcelltotal\.pdsch\.throughput$/i.test(n))    { pids.PDSCH_TP    ??= pid; continue; }
    if (/radio\.lte\.servingcelltotal\.mac\.downlink\.throughput$/i.test(n)) { pids.PDSCH_TOTAL ??= pid; continue; }
    if (/radio\.lte\.servingcelltotal\.mac\.uplink\.throughput$/i.test(n))   { pids.PUSCH_TOTAL ??= pid; continue; }
    // 2G GSM – use RxQualFull as signal quality proxy
    if (n === 'radio.gsm.servingcell.rxqualfull') { pids.RXQUAL ??= pid; continue; }
    if (n === 'radio.gsm.servingcell.rxlev')      { pids.RXLEV  ??= pid; continue; }
    if (n === 'radio.gsm.servingcell.bsic')       { pids.BSIC   ??= pid; continue; }
    if (n === 'radio.gsm.servingcell.bcch.arfcn') { pids.ARFCN  ??= pid; continue; }
    if (n === 'radio.gsm.currentarfcn')           { pids.ARFCN  ??= pid; continue; }
    // 3G WCDMA
    if (/radio\.wcdma\.servingcarrier\[\d+\]\.cell\[\d+\]\.rscp$/i.test(n)) { pids.RSCP  ??= pid; continue; }
    if (/radio\.wcdma\.servingcarrier\[\d+\]\.cell\[\d+\]\.ecno$/i.test(n)) { pids.ECNO  ??= pid; continue; }
    if (/radio\.wcdma\.servingcarrier\[\d+\]\.uarfcn$/i.test(n))            { pids.UARFCN ??= pid; continue; }
    // Ping / RTT / Jitter / Packet-loss (ITU-T Y.1540 / 3GPP TS 22.261)
    if (/internet\.ping\.rtt$/i.test(n))           { pids.RTT         ??= pid; continue; }
    if (/internet\.ping\.jitter$/i.test(n))         { pids.JITTER      ??= pid; continue; }
    if (/internet\.ping\.packetloss$/i.test(n))     { pids.PACKET_LOSS ??= pid; continue; }
    // Voice MOS (ITU-T P.800 / P.862)
    if (/voice\.mos$/i.test(n) || /audio\.mos$/i.test(n)) { pids.MOS ??= pid; continue; }
    // Call / event state (ITU-T E.800 CSSR / CDR)
    if (/call\.status$/i.test(n))  { pids.CALL_STATUS ??= pid; continue; }
    if (/event\.type$/i.test(n))   { pids.EVENT_TYPE  ??= pid; continue; }
  }
  return pids;
}

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

  // Extract GPS centroid from first provider's data
  let gpsCenter = null;
  try {
    const providerDirs = [];
    zip.forEach((path) => { const m = path.match(/^trp\/providers\/(sp\d+)\/$/); if (m) providerDirs.push(m[1]); });
    if (!providerDirs.length) providerDirs.push('sp1');
    const sp = providerDirs[0];
    const declFile = zip.file(`trp/providers/${sp}/cdf/declarations.cdf`);
    const dataFile = zip.file(`trp/providers/${sp}/cdf/data.cdf`);
    if (declFile && dataFile) {
      const declBuf = decompressCdf(Buffer.from(await declFile.async('arraybuffer')));
      const dataBuf = decompressCdf(Buffer.from(await dataFile.async('arraybuffer')));
      const idToName = {};
      for (const rec of iterRecords(declBuf)) {
        const pid = rec[2]?.[0]?.v;
        const nameEntry = rec[1]?.[0];
        if (pid != null && nameEntry?.t === 'b') idToName[pid] = nameEntry.v.toString('utf-8');
      }
      const PID = discoverPids(idToName);
      const latPoints = [], lonPoints = [];
      let currentValues = {};
      outer: for (const rec of iterRecords(dataBuf)) {
        for (const dp of rec[3] ?? []) {
          if (dp.t !== 'b') continue;
          const sub = parsePb(dp.v);
          const pid = sub[1]?.[0]?.v;
          if (pid == null) continue;
          const val = extractValue(sub);
          if (val != null) currentValues[pid] = val;
        }
        const lat = PID.LATITUDE != null ? (currentValues[PID.LATITUDE] ?? null) : null;
        const lon = PID.LONGITUDE != null ? (currentValues[PID.LONGITUDE] ?? null) : null;
        if (lat != null && lon != null && lat !== 0 && lon !== 0) {
          latPoints.push(Number(lat)); lonPoints.push(Number(lon));
          if (latPoints.length >= 20) break outer;
        }
      }
      if (latPoints.length) {
        const avgLat = latPoints.reduce((a, b) => a + b, 0) / latPoints.length;
        const avgLon = lonPoints.reduce((a, b) => a + b, 0) / lonPoints.length;
        gpsCenter = { lat: +avgLat.toFixed(6), lng: +avgLon.toFixed(6) };
      }
    }
  } catch { /* GPS extraction is best-effort */ }

  return {
    operator: meta.operator || null,
    device: meta.device || null,
    os: meta.os || null,
    technology,
    testDate: meta.startTime ? meta.startTime.split('T')[0] : null,
    testName,
    appVersion: meta.appVersion || null,
    imei: meta.imei || null,
    gpsCenter,
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

    const idToName = {};
    for (const rec of iterRecords(declBuf)) {
      const pid = rec[2]?.[0]?.v;
      const nameEntry = rec[1]?.[0];
      if (pid != null && nameEntry?.t === 'b') {
        idToName[pid] = nameEntry.v.toString('utf-8');
      }
    }
    const PID = discoverPids(idToName);

    let currentTs = null;
    let currentValues = {};
    let stickyLat = null;
    let stickyLon = null;

    const cv = (key) => (PID[key] != null ? (currentValues[PID[key]] ?? null) : null);

    const flush = () => {
      if (!currentTs) return;
      const rawLat = cv('LATITUDE');
      const rawLon = cv('LONGITUDE');
      if (rawLat != null && rawLat !== 0) stickyLat = rawLat;
      if (rawLon != null && rawLon !== 0) stickyLon = rawLon;
      const lat = stickyLat;
      const lon = stickyLon;
      if (lat != null && lon != null) {
        // Pick best signal value across LTE / 3G / 2G
        const rsrp = cv('RSRP') ?? cv('RSCP') ?? cv('RXLEV');
        const rsrq = cv('RSRQ') ?? cv('ECNO') ?? cv('RXQUAL');
        const pci  = cv('PCI')  ?? cv('BSIC');
        const earfcn = cv('DL_EARFCN') ?? cv('UARFCN') ?? cv('ARFCN');
        const dl = cv('PDSCH_TOTAL') ?? cv('PDSCH_TP');
        allSamples.push({
          ts: new Date(currentTs * 1000),
          latitude: lat,
          longitude: lon,
          rsrp, rsrq,
          sinr:            cv('SINR'),
          pci, earfcn, dl_throughput: dl,
          ul_throughput:   cv('PUSCH_TOTAL'),
          speed:           cv('SPEED'),
          altitude:        cv('ALTITUDE'),
          rtt_ms:          cv('RTT'),
          jitter_ms:       cv('JITTER'),
          packet_loss_pct: cv('PACKET_LOSS'),
          mos:             cv('MOS'),
          call_status:     cv('CALL_STATUS') != null ? String(cv('CALL_STATUS')) : null,
          event_type:      cv('EVENT_TYPE')  != null ? String(cv('EVENT_TYPE'))  : null,
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
