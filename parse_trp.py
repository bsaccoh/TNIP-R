"""
TRP Drive Test File Parser
Parses TEMS Pocket .trp files (ZIP-based OPC packages with protobuf-encoded CDF data).
Outputs all records to CSV and prints a summary.

Usage:
    python parse_trp.py <file.trp>                     # Parse one file, print summary + save CSV
    python parse_trp.py <file.trp> --csv output.csv     # Specify CSV output path
    python parse_trp.py <folder>                        # Parse all .trp files in a folder
    python parse_trp.py <file.trp> --head 20            # Print first 20 records to console
"""

import sys, os, struct, zlib, zipfile, csv, re, math
from datetime import datetime, timezone
from pathlib import Path
from io import BytesIO

# ── Protobuf wire-format helpers ─────────────────────────────────────────────

def decode_varint(buf, pos):
    result, shift = 0, 0
    while pos < len(buf):
        b = buf[pos]; pos += 1
        result |= (b & 0x7F) << shift
        if not (b & 0x80):
            break
        shift += 7
        if shift > 49:
            break
    return result, pos

def parse_pb(buf):
    fields = {}
    p = 0
    while p < len(buf):
        tag, p = decode_varint(buf, p)
        fn = tag >> 3
        wt = tag & 7
        if fn == 0:
            break
        if wt == 0:  # varint
            val, p = decode_varint(buf, p)
            fields.setdefault(fn, []).append(('v', val))
        elif wt == 2:  # length-delimited
            length, p = decode_varint(buf, p)
            if p + length > len(buf):
                break
            fields.setdefault(fn, []).append(('b', buf[p:p+length]))
            p += length
        elif wt == 1:  # 64-bit (double)
            if p + 8 > len(buf):
                break
            val = struct.unpack_from('<d', buf, p)[0]
            fields.setdefault(fn, []).append(('d', val))
            p += 8
        elif wt == 5:  # 32-bit (float)
            if p + 4 > len(buf):
                break
            val = struct.unpack_from('<f', buf, p)[0]
            fields.setdefault(fn, []).append(('f', val))
            p += 4
        else:
            break
    return fields

def iter_records(decompressed):
    records = []
    pos = 0
    while pos < len(decompressed):
        size, pos = decode_varint(decompressed, pos)
        if size <= 0 or size > 500000 or pos + size > len(decompressed):
            break
        records.append(parse_pb(decompressed[pos:pos+size]))
        pos += size
    return records

def decompress_cdf(raw):
    return zlib.decompress(raw[8:])

# ── Param IDs ────────────────────────────────────────────────────────────────

PID = {
    'RSRP': 9990, 'RSRQ': 9982, 'SINR': 12238, 'PCI': 10078,
    'BAND': 12390, 'DL_EARFCN': 13134, 'UL_EARFCN': 10190,
    'PDSCH_TP': 12214, 'PUSCH_TP': 10782,
    'PDSCH_TOTAL': 14454, 'PUSCH_TOTAL': 14448,
    'LATITUDE': 603, 'LONGITUDE': 602, 'SPEED': 600, 'ALTITUDE': 601,
}
PID_REV = {v: k for k, v in PID.items()}

def extract_value(sub):
    for t, v in sub.get(10, []):
        if t == 'f': return round(v, 4)
    for t, v in sub.get(11, []):
        if t == 'd': return round(v, 6)
    for t, v in sub.get(9, []):
        if t == 'v': return v
    for t, v in sub.get(8, []):
        if t == 'v': return v
    for t, v in sub.get(6, []):
        if t == 'v': return v
    return None

# ── XML metadata ─────────────────────────────────────────────────────────────

def xml_tag(xml, tag):
    m = re.search(rf'<{tag}[^>]*>([^<]*)</{tag}>', xml, re.I)
    return m.group(1).strip() if m else None

def xml_named_prop(xml, name):
    m = re.search(rf'<Property>\s*<Name>{name}</Name>\s*<Value[^>]*>([^<]*)</Value>', xml, re.I)
    return m.group(1).strip() or None if m else None

def parse_metadata(z):
    meta = {'device': None, 'os': None, 'app_version': None,
            'operator': None, 'mcc': None, 'mnc': None, 'imei': None,
            'start_time': None, 'tags': None}

    try:
        content_xml = z.read('trp/content.xml').decode('utf-8', errors='replace')
        meta['start_time'] = xml_tag(content_xml, 'Time') or xml_tag(content_xml, 'a:Time')
        meta['tags'] = xml_tag(content_xml, 'Tags')
        ver_major = xml_tag(content_xml, 'a:_Major')
        ver_minor = xml_tag(content_xml, 'a:_Minor')
        if ver_major:
            meta['app_version'] = f"TEMS Pocket {ver_major}.{ver_minor or '0'}"
    except Exception:
        pass

    try:
        sys_xml = z.read('trp/systeminformation.xml').decode('utf-8', errors='replace')
        mfr = xml_tag(sys_xml, 'Manufacturer')
        model = xml_tag(sys_xml, 'Model')
        if model:
            meta['device'] = f"{mfr} {model}" if mfr else model
        os_name = xml_tag(sys_xml, 'Caption')
        os_major = xml_tag(sys_xml, 'a:_Major')
        if os_name:
            meta['os'] = f"{os_name} {os_major}" if os_major and os_major != '-1' else os_name
    except Exception:
        pass

    try:
        sp_xml = z.read('trp/providers/sp1/serviceprovider.xml').decode('utf-8', errors='replace')
        meta['imei'] = xml_named_prop(sp_xml, 'IMEI')
        imsi = xml_named_prop(sp_xml, 'IMSI')
        if imsi and len(imsi) >= 5:
            meta['mcc'] = imsi[:3]
            meta['mnc'] = imsi[3:5]
    except Exception:
        pass

    if meta['mcc'] == '619':
        ops = {'01': 'Orange SL', '03': 'Africell SL', '05': 'Qcell SL', '04': 'Sierra Tel'}
        meta['operator'] = ops.get(meta['mnc'])

    return meta

# ── Haversine ────────────────────────────────────────────────────────────────

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

# ── Main parser ──────────────────────────────────────────────────────────────

def parse_trp(filepath):
    with zipfile.ZipFile(filepath) as z:
        meta = parse_metadata(z)

        provider_dirs = []
        for name in z.namelist():
            m = re.match(r'^trp/providers/(sp\d+)/$', name)
            if m:
                provider_dirs.append(m.group(1))
        if not provider_dirs:
            provider_dirs = ['sp1']

        # Collect all known param IDs from declarations
        all_param_names = {}

        samples = []
        for sp in provider_dirs:
            try:
                decl_raw = z.read(f'trp/providers/{sp}/cdf/declarations.cdf')
                data_raw = z.read(f'trp/providers/{sp}/cdf/data.cdf')
            except KeyError:
                continue

            decl_buf = decompress_cdf(decl_raw)
            data_buf = decompress_cdf(data_raw)

            for rec in iter_records(decl_buf):
                pid_entries = rec.get(2, [])
                name_entries = rec.get(1, [])
                if pid_entries and name_entries:
                    pid = pid_entries[0][1]
                    name_val = name_entries[0][1]
                    name_str = name_val.decode('utf-8', errors='replace') if isinstance(name_val, (bytes, bytearray)) else str(name_val)
                    all_param_names[pid] = name_str

            current_ts = None
            current_values = {}

            def flush():
                nonlocal current_ts, current_values
                if current_ts is None:
                    return
                lat = current_values.get(PID['LATITUDE'])
                lon = current_values.get(PID['LONGITUDE'])
                if lat and lon and lat != 0 and lon != 0:
                    ts_dt = datetime.fromtimestamp(current_ts, tz=timezone.utc)
                    samples.append({
                        'timestamp': ts_dt.strftime('%Y-%m-%d %H:%M:%S'),
                        'latitude': round(lat, 6),
                        'longitude': round(lon, 6),
                        'rsrp': current_values.get(PID['RSRP']),
                        'rsrq': current_values.get(PID['RSRQ']),
                        'sinr': current_values.get(PID['SINR']),
                        'pci': current_values.get(PID['PCI']),
                        'band': current_values.get(PID['BAND']),
                        'dl_earfcn': current_values.get(PID['DL_EARFCN']),
                        'dl_throughput_kbps': current_values.get(PID['PDSCH_TOTAL']) or current_values.get(PID['PDSCH_TP']),
                        'ul_throughput_kbps': current_values.get(PID['PUSCH_TOTAL']) or current_values.get(PID['PUSCH_TP']),
                        'speed_kmh': current_values.get(PID['SPEED']),
                        'altitude_m': current_values.get(PID['ALTITUDE']),
                    })

            for rec in iter_records(data_buf):
                ts = None
                ts_sub = rec.get(1, [])
                if ts_sub and ts_sub[0][0] == 'b':
                    inner = parse_pb(ts_sub[0][1])
                    if 1 in inner:
                        ts = inner[1][0][1]

                if ts and ts != current_ts:
                    flush()
                    current_ts = ts
                    current_values = {}

                for dp_type, dp_val in rec.get(3, []):
                    if dp_type != 'b':
                        continue
                    sub = parse_pb(dp_val)
                    pid_entries = sub.get(1, [])
                    if not pid_entries:
                        continue
                    pid = pid_entries[0][1]
                    val = extract_value(sub)
                    if val is not None:
                        current_values[pid] = val
            flush()

    samples.sort(key=lambda s: s['timestamp'])

    distance_km = 0
    for i in range(1, len(samples)):
        distance_km += haversine(
            samples[i-1]['latitude'], samples[i-1]['longitude'],
            samples[i]['latitude'], samples[i]['longitude'])

    return {
        'meta': meta,
        'param_names': all_param_names,
        'samples': samples,
        'summary': {
            'total_samples': len(samples),
            'distance_km': round(distance_km, 2),
            'start_time': samples[0]['timestamp'] if samples else None,
            'end_time': samples[-1]['timestamp'] if samples else None,
        }
    }

# ── CLI ──────────────────────────────────────────────────────────────────────

def print_summary(result, filename):
    meta = result['meta']
    summ = result['summary']
    samples = result['samples']

    print(f"\n{'='*70}")
    print(f"  FILE: {filename}")
    print(f"{'='*70}")
    print(f"  Operator:    {meta['operator'] or 'Unknown'}  (MCC={meta['mcc']}, MNC={meta['mnc']})")
    print(f"  Device:      {meta['device'] or 'Unknown'}")
    print(f"  OS:          {meta['os'] or 'Unknown'}")
    print(f"  App:         {meta['app_version'] or 'Unknown'}")
    print(f"  IMEI:        {meta['imei'] or 'Unknown'}")
    print(f"  Tags:        {meta['tags'] or '-'}")
    print(f"  Start:       {summ['start_time']}")
    print(f"  End:         {summ['end_time']}")
    print(f"  Samples:     {summ['total_samples']:,}")
    print(f"  Distance:    {summ['distance_km']} km")

    if samples:
        rsrp_vals = [s['rsrp'] for s in samples if s['rsrp'] is not None]
        rsrq_vals = [s['rsrq'] for s in samples if s['rsrq'] is not None]
        sinr_vals = [s['sinr'] for s in samples if s['sinr'] is not None]
        dl_vals   = [s['dl_throughput_kbps'] for s in samples if s['dl_throughput_kbps'] is not None]
        ul_vals   = [s['ul_throughput_kbps'] for s in samples if s['ul_throughput_kbps'] is not None]

        def stats(vals, unit, div=1):
            if not vals:
                return "  no data"
            avg = sum(vals) / len(vals) / div
            mn = min(vals) / div
            mx = max(vals) / div
            return f"  Avg={avg:.1f} {unit}  Min={mn:.1f}  Max={mx:.1f}  ({len(vals)} samples)"

        print(f"\n  KPI Summary:")
        print(f"    RSRP:       {stats(rsrp_vals, 'dBm')}")
        print(f"    RSRQ:       {stats(rsrq_vals, 'dB')}")
        print(f"    SINR:       {stats(sinr_vals, 'dB')}")
        print(f"    DL Speed:   {stats(dl_vals, 'Mbps', 1000)}")
        print(f"    UL Speed:   {stats(ul_vals, 'Mbps', 1000)}")

    # Print declared parameters
    print(f"\n  Declared Parameters ({len(result['param_names'])}):")
    for pid, name in sorted(result['param_names'].items()):
        known = PID_REV.get(pid, '')
        marker = f" <-- {known}" if known else ""
        print(f"    PID {pid:>6}: {name}{marker}")

    print(f"{'='*70}\n")


def save_csv(samples, csv_path):
    if not samples:
        print("  No samples to write.")
        return
    fields = ['timestamp', 'latitude', 'longitude', 'rsrp', 'rsrq', 'sinr',
              'pci', 'band', 'dl_earfcn', 'dl_throughput_kbps', 'ul_throughput_kbps',
              'speed_kmh', 'altitude_m']
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(samples)
    print(f"  CSV saved: {csv_path} ({len(samples):,} rows)")


def print_records(samples, n):
    if not samples:
        print("  No samples.")
        return
    n = min(n, len(samples))
    header = f"{'#':>4}  {'Timestamp':>19}  {'Lat':>10}  {'Lon':>11}  {'RSRP':>6}  {'RSRQ':>6}  {'SINR':>6}  {'PCI':>5}  {'DL kbps':>9}  {'UL kbps':>9}"
    print(f"\n  First {n} records:")
    print(f"  {header}")
    print(f"  {'-'*len(header)}")
    for i, s in enumerate(samples[:n]):
        def fv(v, w=6):
            return f"{v:>{w}.1f}" if v is not None else f"{'-':>{w}}"
        def iv(v, w=5):
            return f"{v:>{w}}" if v is not None else f"{'-':>{w}}"
        print(f"  {i+1:>4}  {s['timestamp']:>19}  {s['latitude']:>10.6f}  {s['longitude']:>11.6f}  "
              f"{fv(s['rsrp'])}  {fv(s['rsrq'])}  {fv(s['sinr'])}  {iv(s['pci'])}  "
              f"{iv(s['dl_throughput_kbps'], 9)}  {iv(s['ul_throughput_kbps'], 9)}")
    if len(samples) > n:
        print(f"  ... and {len(samples) - n} more records (use --head {len(samples)} to see all)")
    print()


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Parse TEMS Pocket .trp drive test files')
    parser.add_argument('path', help='Path to .trp file or folder containing .trp files')
    parser.add_argument('--csv', help='Output CSV file path (default: <input_name>.csv)')
    parser.add_argument('--head', type=int, default=20, help='Number of records to print to console (default: 20, use 0 for none)')
    parser.add_argument('--no-csv', action='store_true', help='Skip CSV output, only print summary')
    args = parser.parse_args()

    target = Path(args.path)
    if target.is_dir():
        files = sorted(target.glob('*.trp'))
        if not files:
            print(f"No .trp files found in {target}")
            sys.exit(1)
    elif target.is_file():
        files = [target]
    else:
        print(f"Path not found: {target}")
        sys.exit(1)

    for f in files:
        try:
            result = parse_trp(str(f))
            print_summary(result, f.name)

            if args.head > 0:
                print_records(result['samples'], args.head)

            if not args.no_csv:
                csv_path = args.csv if args.csv else str(f.with_suffix('.csv'))
                save_csv(result['samples'], csv_path)

        except Exception as e:
            print(f"\n  ERROR parsing {f.name}: {e}")
            import traceback
            traceback.print_exc()
