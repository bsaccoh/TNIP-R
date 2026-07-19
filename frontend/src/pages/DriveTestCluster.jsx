import { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import {
  Box, Card, CardContent, Typography, Stack, Grid, Chip, Alert,
  FormControl, InputLabel, Select, MenuItem, FormGroup, FormControlLabel,
  Checkbox, LinearProgress, CircularProgress, Divider, Button, Paper,
  Table, TableHead, TableBody, TableRow, TableCell, ToggleButtonGroup,
  ToggleButton, Tooltip,
} from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import MapIcon from '@mui/icons-material/Map';
import RouteIcon from '@mui/icons-material/Route';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { get, api } from '../api/client';
import { Loading, EmptyState } from '../components/ui';
import { colorFor } from '../theme';

// ── Build TECH_CFG from API thresholds ───────────────────────────────────────
export function buildTechCfg(rows) {
  const map = {};
  for (const r of rows) {
    const bins = typeof r.bins === 'string' ? JSON.parse(r.bins) : r.bins;
    map[`${r.technology}/${r.metric}`] = { ...r, bins };
  }
  const toMetric = (row) => {
    if (!row) return null;
    const passMin = row.pass_direction === 'gte' ? Number(row.pass_value) : null;
    const passMax = row.pass_direction === 'lte' ? Number(row.pass_value) : null;
    const passLabel = row.pass_direction === 'gte'
      ? `${row.label} >= ${row.pass_value} ${row.unit}`
      : `${row.label} <= ${row.pass_value} ${row.unit}`;
    return { key: row.metric === 'rsrp' ? 'rsrp' : row.metric === 'rsrq' ? 'rsrq' : row.metric,
      label: row.label, unit: row.unit, passMin, passMax, passLabel, bins: row.bins };
  };
  return {
    '4G': {
      primary: toMetric(map['4G/rsrp']),
      secondary: toMetric(map['4G/rsrq']),
    },
    '3G': {
      primary: toMetric(map['3G/rsrp']),
      secondary: toMetric(map['3G/rsrq']),
    },
    '2G': {
      primary: toMetric(map['2G/rsrq']),
      secondary: toMetric(map['2G/rsrp']),
    },
  };
}

function binColor(val, metricCfg) {
  if (val == null || metricCfg == null) return '#888';
  const v = Number(val);
  if (metricCfg.bins[0].max != null) {
    // max-based (2G RxQual: lower = better)
    for (const bin of metricCfg.bins) {
      if (v <= bin.max) return bin.color;
    }
    return '#e0413b';
  }
  // min-based (higher = better)
  for (const bin of metricCfg.bins) {
    if (v >= bin.min) return bin.color;
  }
  return '#e0413b';
}

function passCount(samples, metricCfg) {
  if (!samples?.length || !metricCfg) return { pass: 0, total: 0 };
  const total = samples.filter((s) => s[metricCfg.key] != null).length;
  let pass;
  if (metricCfg.passMin != null) {
    pass = samples.filter((s) => s[metricCfg.key] != null && Number(s[metricCfg.key]) >= metricCfg.passMin).length;
  } else if (metricCfg.passMax != null) {
    pass = samples.filter((s) => s[metricCfg.key] != null && Number(s[metricCfg.key]) <= metricCfg.passMax).length;
  } else {
    pass = 0;
  }
  return { pass, total };
}

// ── Extract cluster name from test name ──────────────────────────────────────
export function clusterFromName(testName) {
  if (!testName) return null;
  // Legacy format: "Label — ClusterName"
  const parts = testName.split(' — ');
  if (parts.length >= 2) return parts[1].trim();
  // Auto-format: strip trailing timestamp (_YYYYMMDDTHHMMSSZ or _YYYYMMDDTHHMMSSz)
  const stripped = testName.replace(/_\d{8}T\d{6}Z?$/i, '').trim();
  return stripped || testName;
}

// ── Leaflet FlyTo helper ─────────────────────────────────────────────────────
function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom, { duration: 0.8 }); }, [center, zoom, map]);
  return null;
}

// ── Percentile helpers ───────────────────────────────────────────────────────
function calcPercentiles(arr, pcts = [5, 25, 50, 90, 95]) {
  const sorted = arr.filter((v) => v != null && !isNaN(v)).map(Number).sort((a, b) => a - b);
  if (!sorted.length) return Object.fromEntries(pcts.map((p) => [`p${p}`, null]));
  return Object.fromEntries(pcts.map((p) => {
    const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
    return [`p${p}`, +sorted[idx].toFixed(2)];
  }));
}

function buildCdfData(vals, step = 1) {
  const sorted = vals.filter((v) => v != null && !isNaN(v)).map(Number).sort((a, b) => a - b);
  if (!sorted.length) return [];
  const min = Math.floor(sorted[0] / step) * step;
  const max = Math.ceil(sorted[sorted.length - 1] / step) * step;
  const total = sorted.length;
  const result = [];
  for (let x = min; x <= max; x += step) {
    const count = sorted.filter((v) => v <= x).length;
    result.push({ x, cdf: +((count / total) * 100).toFixed(1) });
  }
  return result;
}

// ── CDF Chart (ETSI EG 202 057 style) ───────────────────────────────────────
function CdfChart({ samplesByOp, metricKey, label, unit, passMin }) {
  const opNames = Object.keys(samplesByOp);
  if (!opNames.length) return null;

  const allVals = opNames.flatMap((op) => samplesByOp[op].map((s) => Number(s[metricKey])).filter((v) => !isNaN(v)));
  if (!allVals.length) return null;

  const step = Math.abs(allVals[0]) > 50 ? 1 : 0.1;
  const min = Math.floor(Math.min(...allVals) / step) * step;
  const max = Math.ceil(Math.max(...allVals) / step) * step;
  const xs = [];
  for (let x = min; x <= max; x = +(x + step).toFixed(6)) xs.push(x);

  const series = opNames.map((op) => {
    const vals = samplesByOp[op].map((s) => Number(s[metricKey])).filter((v) => !isNaN(v)).sort((a, b) => a - b);
    return { op, vals, total: vals.length };
  });

  const chartData = xs.map((x) => {
    const pt = { x: +x.toFixed(2) };
    for (const { op, vals, total } of series) {
      if (!total) { pt[op] = null; continue; }
      const count = vals.filter((v) => v <= x).length;
      pt[op] = +((count / total) * 100).toFixed(1);
    }
    return pt;
  });

  const COLORS = ['#1976d2', '#e65100', '#2e7d32', '#6a1b9a', '#c62828'];

  return (
    <Box>
      <Typography variant="caption" fontWeight={700} display="block" mb={1} color="text.secondary">
        Cumulative Distribution — {label} {unit ? `(${unit})` : ''} (ETSI EG 202 057)
      </Typography>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 16, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis dataKey="x" tick={{ fontSize: 10 }} label={{ value: unit || 'value', position: 'insideBottom', offset: -8, style: { fontSize: 10 } }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} label={{ value: '%', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
          <RTooltip formatter={(v, name) => [`${v}%`, name]} labelFormatter={(v) => `${v} ${unit}`} contentStyle={{ fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {passMin != null && (
            <ReferenceLine x={passMin} stroke="#e53935" strokeDasharray="4 2"
              label={{ value: `Thr ${passMin}`, position: 'top', style: { fontSize: 10, fill: '#e53935' } }} />
          )}
          {opNames.map((op, i) => (
            <Line key={op} type="monotone" dataKey={op} stroke={COLORS[i % COLORS.length]}
              dot={false} strokeWidth={2} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

// ── Distribution table ───────────────────────────────────────────────────────
function DistributionTable({ samples, tech, mapMode, techCfg }) {
  const cfg = techCfg;
  const metricCfg = cfg ? (mapMode === 'primary' ? cfg.primary : cfg.secondary) : null;
  if (!metricCfg || !samples?.length) return null;

  const vals = samples.map((s) => s[metricCfg.key]).filter((v) => v != null).map(Number);
  const total = vals.length;
  if (!total) return null;

  const binCounts = metricCfg.bins.map((bin, i) => {
    let count;
    if (bin.max != null) {
      const prevMax = metricCfg.bins[i - 1]?.max ?? -Infinity;
      count = vals.filter((v) => v <= bin.max && v > prevMax).length;
    } else {
      const nextMin = i > 0 ? metricCfg.bins[i - 1].min : Infinity;
      count = vals.filter((v) => v >= bin.min && v < nextMin).length;
    }
    return { ...bin, count };
  });

  const { pass, total: passTotal } = passCount(samples, metricCfg);
  const passPct = passTotal ? ((pass / passTotal) * 100).toFixed(1) : '—';
  const passColor = passPct >= 80 ? '#2e9e5b' : passPct >= 60 ? '#e6a700' : '#e0413b';

  const pcts = calcPercentiles(vals);

  return (
    <Box>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ width: 14, p: 0.5 }} />
            <TableCell>{metricCfg.label} ({metricCfg.unit || 'value'})</TableCell>
            <TableCell align="right">Samples</TableCell>
            <TableCell align="right">%</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...binCounts].reverse().map((bin) => (
            <TableRow key={bin.label} hover>
              <TableCell sx={{ p: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: bin.color }} />
              </TableCell>
              <TableCell>
                <Typography variant="caption">{bin.label} ({bin.tier})</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="caption">{bin.count.toLocaleString()}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="caption" fontWeight={bin.count > 0 ? 600 : 400}>
                  {total ? ((bin.count / total) * 100).toFixed(1) : 0}%
                </Typography>
              </TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ borderTop: 2, borderColor: 'divider' }}>
            <TableCell />
            <TableCell><Typography variant="caption" fontWeight={700}>Total</Typography></TableCell>
            <TableCell align="right"><Typography variant="caption" fontWeight={700}>{total.toLocaleString()}</Typography></TableCell>
            <TableCell align="right"><Typography variant="caption" fontWeight={700}>100%</Typography></TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <Stack direction="row" spacing={1} alignItems="center" mt={1.5}>
        <Typography variant="caption" color="text.secondary">{metricCfg.passLabel}:</Typography>
        <Typography variant="caption" fontWeight={700} sx={{ color: passColor }}>{passPct}%</Typography>
        <Typography variant="caption" color="text.secondary">
          ({pass.toLocaleString()} / {passTotal.toLocaleString()} samples)
        </Typography>
      </Stack>
      {/* Percentile summary */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" mt={1} sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 0.75 }}>
        {[5, 25, 50, 90, 95].map((p) => (
          <Box key={p} textAlign="center">
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 9, fontWeight: 700 }}>P{p}</Typography>
            <Typography variant="caption" fontWeight={600} sx={{ fontSize: 11 }}>
              {pcts[`p${p}`] != null ? `${pcts[`p${p}`]} ${metricCfg.unit}` : '—'}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

// ── Auto remarks ─────────────────────────────────────────────────────────────
function RemarksPanel({ samples, tech, cluster, operatorNames, techCfg, invSites = [], operators = [] }) {
  const cfg = techCfg;
  const primary = cfg?.primary;
  const secondary = cfg?.secondary;

  if (!samples?.length || !primary) return null;

  const { pass: primaryPass, total: primaryTotal } = passCount(samples, primary);
  const primaryPct = primaryTotal ? ((primaryPass / primaryTotal) * 100).toFixed(1) : '?';
  const primaryMet = Number(primaryPct) >= 70;

  let secText = '';
  if (secondary) {
    const secVals = samples.map((s) => s[secondary.key]).filter((v) => v != null).map(Number);
    if (secVals.length) {
      const minSec = Math.min(...secVals).toFixed(1);
      const maxSec = Math.max(...secVals).toFixed(1);
      const { pass: secPass, total: secTotal } = passCount(samples, secondary);
      const secPct = secTotal ? ((secPass / secTotal) * 100).toFixed(1) : '?';
      secText = ` ${secondary.label} between ${minSec} ${secondary.unit} and ${maxSec} ${secondary.unit}, accounts for ${secPct}% meeting threshold (${secondary.passLabel}).`;
    }
  }

  const opList = operatorNames.join(', ');

  let problemAreaText = '';
  if (!primaryMet) {
    const problemAreas = findProblemAreas(samples, primary);
    const opIds = operatorNames.map((name) => {
      const found = operators.find((op) => op.operator_name.toLowerCase() === name.toLowerCase());
      return found ? found.operator_id : null;
    }).filter(Boolean);
    const filteredInv = invSites.filter((s) => opIds.includes(s.operator_id));
    problemAreas.forEach((a) => {
      a.locationName = nearestSiteName(a.lat, a.lon, filteredInv, 50) || '';
    });

    if (problemAreas.length > 0) {
      const list = problemAreas.slice(0, 3).map((a) => {
        const loc = a.locationName && a.locationName !== '—' && a.locationName !== 'Unknown'
          ? a.locationName
          : `coordinates (${a.lat}, ${a.lon})`;
        return `${loc} (avg ${a.avgVal} ${primary.unit || ''})`;
      }).join(', ');
      problemAreaText = ` Coverage falls short of threshold — improvement is needed at: ${list}.`;
    } else {
      problemAreaText = ' Coverage falls short of threshold — improvement is needed in areas shown in red/orange on the map.';
    }
  } else {
    problemAreaText = ' Coverage meets regulatory threshold.';
  }

  return (
    <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2, mt: 1 }}>
      <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Remarks</Typography>
      <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
        <strong>{tech} network coverage in {cluster || 'the selected cluster'}.</strong>{' '}
        {opList} — coverage signal strength ({primary.label} {primary.passMin != null ? `≥ ${primary.passMin}` : `≤ ${primary.passMax}`} {primary.unit} → <strong>{primaryPct}%</strong>).{' '}
        <strong>{problemAreaText}</strong>
        {secText}
        {' '}{primary.passLabel} is required for quality connection.
      </Typography>
    </Box>
  );
}

// ── Report helpers ────────────────────────────────────────────────────────────
function buildDistRows(samples, metricCfg) {
  if (!metricCfg || !samples?.length) return [];
  const vals = samples.map((s) => s[metricCfg.key]).filter((v) => v != null).map(Number);
  const total = vals.length;
  if (!total) return [];
  return metricCfg.bins.map((bin, i) => {
    let count;
    if (bin.max != null) {
      const prevMax = metricCfg.bins[i - 1]?.max ?? -Infinity;
      count = vals.filter((v) => v <= bin.max && v > prevMax).length;
    } else {
      const nextMin = i > 0 ? metricCfg.bins[i - 1].min : Infinity;
      count = vals.filter((v) => v >= bin.min && v < nextMin).length;
    }
    return { label: bin.label, tier: bin.tier, color: bin.color, count, pct: ((count / total) * 100).toFixed(1) };
  });
}

function getSampleColor(val, metricCfg) {
  if (val == null || isNaN(Number(val))) return '#888888';
  const v = Number(val);
  const bins = metricCfg.bins;
  for (let i = 0; i < bins.length; i++) {
    const bin = bins[i];
    if (bin.max != null) {
      const prevMax = i > 0 ? bins[i - 1].max : -Infinity;
      if (v <= bin.max && v > prevMax) return bin.color;
    } else {
      const nextMin = i > 0 ? bins[i - 1].min : Infinity;
      if (v >= bin.min && v < nextMin) return bin.color;
    }
  }
  return bins[bins.length - 1].color;
}

function findProblemAreas(opSamples, metricCfg, maxAreas = 10) {
  const key = metricCfg.key;
  const grid = {};
  for (const s of opSamples) {
    const val = s[key];
    if (val == null) continue;
    const lat = Number(s.latitude), lon = Number(s.longitude);
    if (!lat || !lon) continue;
    const cellKey = `${Math.round(lat / 0.001) * 0.001},${Math.round(lon / 0.001) * 0.001}`;
    if (!grid[cellKey]) grid[cellKey] = { vals: [], sumLat: 0, sumLon: 0, n: 0 };
    grid[cellKey].vals.push(Number(val));
    grid[cellKey].sumLat += lat; grid[cellKey].sumLon += lon; grid[cellKey].n++;
  }
  const higherBetter = metricCfg.bins[0].max == null;
  return Object.values(grid)
    .filter((g) => g.n >= 3)
    .map((g) => {
      const avg = g.vals.reduce((a, b) => a + b, 0) / g.vals.length;
      return { lat: (g.sumLat / g.n).toFixed(5), lon: (g.sumLon / g.n).toFixed(5), avgVal: avg.toFixed(1), samples: g.n, color: getSampleColor(avg, metricCfg) };
    })
    .sort((a, b) => higherBetter ? Number(a.avgVal) - Number(b.avgVal) : Number(b.avgVal) - Number(a.avgVal))
    .slice(0, maxAreas);
}

function findDeadZones(opSamples, metricCfg) {
  const key = metricCfg.key;
  const bins = metricCfg.bins;
  const secondLast = bins[bins.length - 2];
  if (!secondLast) return [];
  const isDeadZone = (v) => secondLast.max != null ? v > secondLast.max : v < secondLast.min;
  const grid = {};
  for (const s of opSamples) {
    const val = s[key];
    if (val == null || !isDeadZone(Number(val))) continue;
    const lat = Number(s.latitude), lon = Number(s.longitude);
    if (!lat || !lon) continue;
    const cellKey = `${Math.round(lat / 0.002) * 0.002},${Math.round(lon / 0.002) * 0.002}`;
    if (!grid[cellKey]) grid[cellKey] = { vals: [], sumLat: 0, sumLon: 0, n: 0 };
    grid[cellKey].vals.push(Number(val));
    grid[cellKey].sumLat += lat; grid[cellKey].sumLon += lon; grid[cellKey].n++;
  }
  return Object.values(grid)
    .filter((g) => g.n >= 2)
    .map((g) => {
      const avg = g.vals.reduce((a, b) => a + b, 0) / g.vals.length;
      return { lat: (g.sumLat / g.n).toFixed(5), lon: (g.sumLon / g.n).toFixed(5), avgVal: avg.toFixed(1), samples: g.n };
    })
    .sort((a, b) => b.samples - a.samples);
}

function thinSamples(arr, max = 2500) {
  if (arr.length <= max) return arr;
  const step = Math.ceil(arr.length / max);
  return arr.filter((_, i) => i % step === 0);
}

// Strip leading operator name from cluster (e.g. "Africell_Bo_CL01" → "Bo_CL01")
export function geoCluster(clusterName) {
  if (!clusterName) return clusterName;
  const idx = clusterName.indexOf('_');
  return idx >= 0 ? clusterName.slice(idx + 1) : clusterName;
}

// Sierra Leone district / region lookup keyed by city name extracted from cluster
const SL_GEO_DB = {
  Bo:        { district: 'Bo District',        region: 'Southern Province',  country: 'Sierra Leone' },
  Kenema:    { district: 'Kenema District',     region: 'Eastern Province',   country: 'Sierra Leone' },
  Makeni:    { district: 'Bombali District',    region: 'Northern Province',  country: 'Sierra Leone' },
  Freetown:  { district: 'Western Area Urban',  region: 'Western Area',       country: 'Sierra Leone' },
  Kono:      { district: 'Kono District',       region: 'Eastern Province',   country: 'Sierra Leone' },
  Koidu:     { district: 'Kono District',       region: 'Eastern Province',   country: 'Sierra Leone' },
  Kailahun:  { district: 'Kailahun District',   region: 'Eastern Province',   country: 'Sierra Leone' },
  Lunsar:    { district: 'Port Loko District',  region: 'North West Province',country: 'Sierra Leone' },
  Portloko:  { district: 'Port Loko District',  region: 'North West Province',country: 'Sierra Leone' },
  Magburaka: { district: 'Tonkolili District',  region: 'Northern Province',  country: 'Sierra Leone' },
  Moyamba:   { district: 'Moyamba District',    region: 'Southern Province',  country: 'Sierra Leone' },
  Bonthe:    { district: 'Bonthe District',     region: 'Southern Province',  country: 'Sierra Leone' },
  Pujehun:   { district: 'Pujehun District',    region: 'Southern Province',  country: 'Sierra Leone' },
  Kabala:    { district: 'Koinadugu District',  region: 'Northern Province',  country: 'Sierra Leone' },
  Kambia:    { district: 'Kambia District',     region: 'North West Province',country: 'Sierra Leone' },
  Waterloo:  { district: 'Western Area Rural',  region: 'Western Area',       country: 'Sierra Leone' },
};

function buildGeoInfo(geo) {
  // geo looks like "Bo_CL01" — extract city as first segment
  const city = geo.split('_')[0];
  const key = Object.keys(SL_GEO_DB).find((k) => k.toLowerCase() === city.toLowerCase());
  const info = key ? SL_GEO_DB[key] : null;
  return {
    city,
    clusterNum: geo.split('_').slice(1).join(' '),
    district: info?.district || `${city} District`,
    region: info?.region || 'Sierra Leone',
    country: info?.country || 'Sierra Leone',
  };
}

// Dead-zone severity colour + radius based on sample count (matching blackspot map style)
function dzSeverityColor(samples) {
  if (samples >= 10) return '#5C0000'; // Critical — dark maroon
  if (samples >= 5)  return '#C0392B'; // Severe   — dark red
  return '#E87722';                     // Poor     — orange
}
function dzRadius(samples) {
  return Math.min(22, Math.max(6, Math.sqrt(samples) * 3.5));
}

function buildRemarks(opName, tech, cfg, pPct, pPass, pTotal, sPct, secPass, deadZoneCount, problemAreas) {
  const pNum = Number(pPct);
  const sNum = Number(sPct);
  const primLabel = cfg.primary.label;
  const secLabel = cfg.secondary?.label || '';
  const primThresh = cfg.primary.passLabel || '';
  const secThresh = cfg.secondary?.passLabel || '';

  let status, statusColor, lead;
  if (pNum >= 80) {
    status = 'SATISFACTORY'; statusColor = '#1a7a40';
    lead = `${opName}'s ${tech} network coverage in this cluster meets the regulatory target. ${pNum}% of measured samples achieve the minimum ${primLabel} threshold (${primThresh}), indicating adequate signal availability across the surveyed route.`;
  } else if (pNum >= 60) {
    status = 'BELOW TARGET'; statusColor = '#b36c00';
    lead = `${opName}'s ${tech} coverage is below the regulatory target. Only ${pNum}% of samples meet the ${primLabel} threshold (${primThresh}). Improvement is required in the identified problem areas before the next audit period.`;
  } else {
    status = 'CRITICAL'; statusColor = '#c0392b';
    lead = `${opName}'s ${tech} coverage is critically below regulatory requirements. Only ${pNum}% of ${pTotal.toLocaleString()} samples meet the minimum ${primLabel} threshold (${primThresh}). Immediate network optimisation is required.`;
  }

  const secRemark = cfg.secondary && secPass?.total
    ? ` ${secLabel} compliance stands at ${sNum}% against the threshold of ${secThresh}.`
    : '';

  const dzRemark = deadZoneCount > 0
    ? ` <strong>${deadZoneCount}</strong> dead zone cluster${deadZoneCount > 1 ? 's' : ''} were identified where signal falls below the worst-tier threshold — these locations should be prioritised for site survey and remediation (antenna tilt adjustment, additional nodes, or repeater deployment).`
    : ' No dead zones were detected on the measured route.';

  let paRemark = '';
  if (problemAreas.length > 0) {
    const list = problemAreas.slice(0, 3).map((a) => {
      const loc = a.locationName && a.locationName !== '—' && a.locationName !== 'Unknown'
        ? a.locationName
        : `coordinates (${a.lat}, ${a.lon})`;
      return `${loc} (avg ${a.avgVal} ${cfg.primary.unit || ''})`;
    }).join(', ');
    paRemark = ` Signal improvements are needed at: <strong>${list}</strong>.`;
  }

  return `
    <div style="margin-top:10px;padding:8px 12px;border-left:4px solid ${statusColor};background:#fafafa;font-size:10px;color:#222;">
      <div style="font-weight:bold;font-size:11px;color:${statusColor};margin-bottom:5px;">
        Remarks — <span style="text-transform:uppercase;">${status}</span>
      </div>
      <p style="margin:0 0 4px 0;">${lead}${secRemark}</p>
      <p style="margin:0 0 4px 0;">${dzRemark}${paRemark}</p>
      <p style="margin:0;color:#555;">
        <em>Note: Measurements are based on drive test samples collected along the defined cluster route.
        Results reflect point-in-time signal conditions and may vary with network load, time of day, and environmental factors.</em>
      </p>
    </div>`;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestSiteName(lat, lon, sites, maxKm = 50) {
  let best = null, bestDist = Infinity;
  for (const s of sites) {
    if (!s.latitude || !s.longitude) continue;
    const d = haversineKm(Number(lat), Number(lon), Number(s.latitude), Number(s.longitude));
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return best && bestDist <= maxKm ? best.site_name : null;
}

export async function generateFullReport(cluster, allTests, thresholdCfg, options = {}) {
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const geo = geoCluster(cluster);
  const geoInfo = buildGeoInfo(geo);
  const TECHS = ['3G', '4G', '2G'];

  // Match ALL operator-cluster variants sharing the same geographic cluster
  const availableTechs = TECHS.filter((t) =>
    allTests.some((dt) => dt.technology === t && geoCluster(clusterFromName(dt.test_name)) === geo)
  );

  // Fetch samples for every tech — all operators combined
  const techSamples = {};
  for (const tech of availableTechs) {
    const ids = allTests
      .filter((dt) => dt.technology === tech && geoCluster(clusterFromName(dt.test_name)) === geo)
      .map((dt) => dt.drive_test_id);
    if (!ids.length) continue;
    try {
      const r = await get(`/drive-tests/cluster-samples?testIds=${ids.join(',')}`);
      techSamples[tech] = r.data || [];
    } catch { techSamples[tech] = []; }
  }

  const allOpNames = [...new Set(
    Object.values(techSamples).flat().map((s) => s.operator_name).filter(Boolean)
  )].sort();

  // Fetch all inventory sites for nearest-site location lookup
  let invSites = [];
  try {
    const invRes = await get('/inventory/map');
    invSites = invRes.data || [];
  } catch { /* silent — fall back to '—' */ }

  // Map operator_name → operator_id for filtering sites by operator
  const opNameToId = {};
  for (const dt of allTests) {
    if (dt.operator_name && dt.operator_id) opNameToId[dt.operator_name] = dt.operator_id;
  }

  const mapData = {};
  // Dead zone markers: [lat, lon, color, tooltip, radius]
  const deadZoneMarkers = [];
  let allDeadZones = [];

  const techSectionParts = await Promise.all(availableTechs.map(async (tech) => {
    const cfg = thresholdCfg?.[tech] || thresholdCfg?.['4G'];
    if (!cfg) return '';
    const samples = techSamples[tech] || [];
    const opNames = [...new Set(samples.map((s) => s.operator_name).filter(Boolean))].sort();
    if (!opNames.length) return '';

    const classRows = [...cfg.primary.bins].reverse().map((b) =>
      `<tr>
        <td style="padding:4px 8px;border:1px solid #ccc;">${b.tier}</td>
        <td style="padding:4px 8px;border:1px solid #ccc;">${b.label} ${cfg.primary.unit || ''}</td>
        <td style="padding:4px 8px;border:1px solid #ccc;"><span style="display:inline-block;width:12px;height:12px;background:${b.color};border-radius:50%;vertical-align:middle;"></span></td>
      </tr>`
    ).join('');

    const opParts = await Promise.all(opNames.map(async (opName) => {
      const opSamples = samples.filter((s) => s.operator_name === opName);
      const primRows = buildDistRows(opSamples, cfg.primary);
      const secRows = cfg.secondary ? buildDistRows(opSamples, cfg.secondary) : [];
      const { pass: pPass, total: pTotal } = passCount(opSamples, cfg.primary);
      const pPct = pTotal ? ((pPass / pTotal) * 100).toFixed(1) : '—';
      const secPass = cfg.secondary ? passCount(opSamples, cfg.secondary) : null;
      const sPct = secPass?.total ? ((secPass.pass / secPass.total) * 100).toFixed(1) : '—';

      const problemAreas = findProblemAreas(opSamples, cfg.primary);
      const opId = opNameToId[opName];
      const opInventory = opId ? invSites.filter((s) => s.operator_id === opId) : [];
      problemAreas.forEach((a) => {
        a.locationName = nearestSiteName(a.lat, a.lon, opInventory) || '—';
      });
      const deadZones = findDeadZones(opSamples, cfg.primary);
      deadZones.forEach((dz) => {
        allDeadZones.push({ tech, operator: opName, metric: cfg.primary.label, ...dz });
        deadZoneMarkers.push([
          dz.lat, dz.lon,
          dzSeverityColor(dz.samples),
          `${opName} ${tech}: ${dz.avgVal} ${cfg.primary.unit || ''} (${dz.samples} samples)`,
          dzRadius(dz.samples),
        ]);
      });

      const safeKey = `${tech}_${opName.replace(/\s/g, '_')}`;
      const primThin = thinSamples(opSamples).map((s) => [
        Number(s.latitude).toFixed(6), Number(s.longitude).toFixed(6),
        getSampleColor(s[cfg.primary.key], cfg.primary),
      ]);
      const secThin = cfg.secondary ? thinSamples(opSamples).map((s) => [
        Number(s.latitude).toFixed(6), Number(s.longitude).toFixed(6),
        getSampleColor(s[cfg.secondary.key], cfg.secondary),
      ]) : [];
      const problemMarkers = problemAreas.map((a) => [
        a.lat, a.lon, a.color, `${a.locationName} (${a.avgVal} ${cfg.primary.unit || ''})`, 8
      ]);
      mapData[safeKey] = { primary: primThin, secondary: secThin, problems: problemMarkers };

      const distTable = (rows, label, unit, passLabel, passPct, passCount_) => `
        <div style="flex:1;min-width:0;">
          <div style="font-weight:bold;font-size:11px;margin-bottom:4px;color:#1565c0;">${label}${unit ? ` (${unit})` : ''}</div>
          <table style="border-collapse:collapse;width:100%;font-size:10px;">
            <thead><tr>
              <th style="background:#1565c0;color:#fff;padding:4px 6px;text-align:left;">Range</th>
              <th style="background:#1565c0;color:#fff;padding:4px 6px;text-align:left;">Rating</th>
              <th style="background:#1565c0;color:#fff;padding:4px 6px;text-align:right;">Samples</th>
              <th style="background:#1565c0;color:#fff;padding:4px 6px;text-align:right;">%</th>
            </tr></thead>
            <tbody>
              ${[...rows].reverse().map((r, i) => `<tr style="background:${i % 2 === 0 ? '#f4f7fb' : '#fff'}">
                <td style="padding:3px 6px;border:1px solid #ddd;">${r.label}</td>
                <td style="padding:3px 6px;border:1px solid #ddd;"><span style="display:inline-block;width:8px;height:8px;background:${r.color};border-radius:50%;margin-right:4px;vertical-align:middle;"></span>${r.tier}</td>
                <td style="padding:3px 6px;border:1px solid #ddd;text-align:right;">${r.count.toLocaleString()}</td>
                <td style="padding:3px 6px;border:1px solid #ddd;text-align:right;">${r.pct}%</td>
              </tr>`).join('')}
              <tr style="background:#e8eef8;font-weight:bold;">
                <td colspan="2" style="padding:3px 6px;border:1px solid #ddd;">Total</td>
                <td style="padding:3px 6px;border:1px solid #ddd;text-align:right;">${rows.reduce((s, r) => s + r.count, 0).toLocaleString()}</td>
                <td style="padding:3px 6px;border:1px solid #ddd;text-align:right;">100%</td>
              </tr>
            </tbody>
          </table>
          <p style="font-size:10px;margin:4px 0 0 0;"><strong>${passLabel}:</strong>
            <span style="color:${Number(passPct) >= 80 ? '#1a7a40' : Number(passPct) >= 60 ? '#b36c00' : '#c0392b'};font-weight:bold;"> ${passPct}%</span>
            (${passCount_.toLocaleString()} / ${pTotal.toLocaleString()} samples)
          </p>
        </div>`;

      const problemTable = problemAreas.length ? `
        <div style="margin-top:10px;">
          <div style="font-weight:bold;font-size:11px;margin-bottom:4px;color:#c0392b;">Top Problem Areas — ${cfg.primary.label}</div>
          <div style="display:flex;gap:12px;margin-bottom:8px;">
            <div style="flex:1;">
              <table style="border-collapse:collapse;width:100%;font-size:10px;">
                <thead><tr>
                  <th style="background:#c0392b;color:#fff;padding:4px 6px;">#</th>
                  <th style="background:#c0392b;color:#fff;padding:4px 6px;">Location Name</th>
                  <th style="background:#c0392b;color:#fff;padding:4px 6px;">Latitude</th>
                  <th style="background:#c0392b;color:#fff;padding:4px 6px;">Longitude</th>
                  <th style="background:#c0392b;color:#fff;padding:4px 6px;text-align:right;">Avg ${cfg.primary.label}</th>
                  <th style="background:#c0392b;color:#fff;padding:4px 6px;text-align:right;">Samples</th>
                </tr></thead>
                <tbody>
                  ${problemAreas.map((a, i) => `<tr style="background:${i % 2 === 0 ? '#fff5f5' : '#fff'}">
                    <td style="padding:3px 6px;border:1px solid #ddd;">${i + 1}</td>
                    <td style="padding:3px 6px;border:1px solid #ddd;">${a.locationName || '—'}</td>
                    <td style="padding:3px 6px;border:1px solid #ddd;">${a.lat}</td>
                    <td style="padding:3px 6px;border:1px solid #ddd;">${a.lon}</td>
                    <td style="padding:3px 6px;border:1px solid #ddd;text-align:right;">
                      <span style="color:${a.color};font-weight:bold;">${a.avgVal} ${cfg.primary.unit || ''}</span>
                    </td>
                    <td style="padding:3px 6px;border:1px solid #ddd;text-align:right;">${a.samples}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
            <div style="flex:1;">
               <div id="map_${safeKey}_prob" style="height:100%;min-height:180px;border:1px solid #ccc;border-radius:3px;"></div>
            </div>
          </div>
        </div>` : '';

      const remarks = buildRemarks(opName, tech, cfg, pPct, pPass, pTotal, sPct, secPass, deadZones.length, problemAreas);

      return `
        <div style="margin-bottom:20px;page-break-inside:avoid;">
          <div style="background:#1565c0;color:#fff;padding:6px 10px;font-size:12px;font-weight:bold;border-radius:3px 3px 0 0;">
            ${opName} — ${tech}
          </div>
          <div style="border:1px solid #1565c0;border-top:none;padding:10px;">
            <div style="display:flex;gap:8px;margin-bottom:10px;">
              <div style="flex:1;">
                <div style="font-size:10px;font-weight:bold;margin-bottom:3px;color:#333;">${cfg.primary.label}${cfg.primary.unit ? ` (${cfg.primary.unit})` : ''}</div>
                <div id="map_${safeKey}_p" style="height:230px;border:1px solid #ccc;border-radius:3px;"></div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">
                  ${[...cfg.primary.bins].reverse().map((b) => `<span style="font-size:9px;display:flex;align-items:center;gap:3px;"><span style="width:8px;height:8px;background:${b.color};border-radius:50%;display:inline-block;"></span>${b.label}</span>`).join('')}
                </div>
              </div>
              ${cfg.secondary ? `<div style="flex:1;">
                <div style="font-size:10px;font-weight:bold;margin-bottom:3px;color:#333;">${cfg.secondary.label}${cfg.secondary.unit ? ` (${cfg.secondary.unit})` : ''}</div>
                <div id="map_${safeKey}_s" style="height:230px;border:1px solid #ccc;border-radius:3px;"></div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">
                  ${[...cfg.secondary.bins].reverse().map((b) => `<span style="font-size:9px;display:flex;align-items:center;gap:3px;"><span style="width:8px;height:8px;background:${b.color};border-radius:50%;display:inline-block;"></span>${b.label}</span>`).join('')}
                </div>
              </div>` : ''}
            </div>
            <div style="display:flex;gap:12px;margin-bottom:8px;">
              ${distTable(primRows, cfg.primary.label, cfg.primary.unit, cfg.primary.passLabel, pPct, pPass)}
              ${cfg.secondary && secRows.length ? distTable(secRows, cfg.secondary.label, cfg.secondary.unit, cfg.secondary.passLabel, sPct, secPass.pass) : ''}
            </div>
            ${problemTable}
            ${remarks}
          </div>
        </div>`;
    }));
    const opHtml = opParts.join('');

    return `
      <div style="page-break-before:auto;margin-bottom:24px;">
        <h2 style="font-size:14px;color:#fff;background:#0d3c7a;padding:8px 12px;margin:0 0 10px 0;border-radius:3px;">
          ${tech} Network Coverage
        </h2>
        <div style="display:flex;gap:16px;margin-bottom:12px;">
          <div style="flex:1;">
            <div style="font-size:11px;font-weight:bold;margin-bottom:4px;">Signal Classification</div>
            <table style="border-collapse:collapse;width:100%;font-size:10px;">
              <thead><tr>
                <th style="background:#0d3c7a;color:#fff;padding:4px 8px;">Rating</th>
                <th style="background:#0d3c7a;color:#fff;padding:4px 8px;">Range</th>
                <th style="background:#0d3c7a;color:#fff;padding:4px 8px;">Color</th>
              </tr></thead>
              <tbody>${classRows}</tbody>
            </table>
          </div>
          <div style="flex:1;font-size:10px;color:#444;padding-top:20px;">
            <strong>Total samples (${tech}):</strong> ${samples.length.toLocaleString()}<br/>
            <strong>Operators:</strong> ${opNames.join(', ')}<br/>
            <strong>Pass threshold (${cfg.primary.label}):</strong> ${cfg.primary.passLabel}
            ${cfg.secondary ? `<br/><strong>Pass threshold (${cfg.secondary.label}):</strong> ${cfg.secondary.passLabel}` : ''}
          </div>
        </div>
        ${opHtml}
      </div>`;
  }));
  const techSections = techSectionParts.join('<hr style="border:none;border-top:2px dashed #ccc;margin:20px 0;"/>');

  const dzCritCount = allDeadZones.filter((d) => d.samples >= 10).length;
  const dzSevCount  = allDeadZones.filter((d) => d.samples >= 5 && d.samples < 10).length;
  const dzPoorCount = allDeadZones.filter((d) => d.samples < 5).length;

  // Build dead zone threshold description from actual configured thresholds
  const dzThreshParts = availableTechs.map((t) => {
    const c = thresholdCfg?.[t]?.primary;
    if (!c?.bins?.length) return null;
    const secondLast = c.bins[c.bins.length - 2];
    if (!secondLast) return null;
    const dir = secondLast.max != null
      ? `&gt; ${secondLast.max} ${c.unit || ''}`.trim()
      : `&lt; ${secondLast.min} ${c.unit || ''}`.trim();
    return `${c.label} ${dir} (${t})`;
  }).filter(Boolean).join(', ');

  const deadZoneSection = allDeadZones.length ? `
    <div style="page-break-before:always;">
      <h2 style="font-size:14px;color:#fff;background:#7b1c1c;padding:8px 12px;margin:0 0 8px 0;border-radius:3px;">
        Dead Zone Analysis — ${geoInfo.city} (${geoInfo.district}, ${geoInfo.region})
      </h2>
      <p style="font-size:11px;color:#444;margin-bottom:10px;">
        Dead zones are geographic locations where signal strength falls into the worst measurable tier, representing areas with severely
        degraded or completely unusable network coverage. Clusters (~200m × 200m grid cells) were identified where measured signal
        consistently breached worst-tier thresholds: ${dzThreshParts}.
        Circle size is proportional to sample density. Hover a circle for operator, technology, and signal value detail.
        Priority remediation: antenna tilt adjustment, additional macro/micro sites, or repeater/booster deployment.
      </p>
      <div id="map_deadzones" style="height:400px;border:1px solid #aaa;border-radius:4px;margin-bottom:8px;"></div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:12px;font-size:10px;align-items:center;">
        <span style="display:flex;align-items:center;gap:5px;"><span style="width:12px;height:12px;background:#5C0000;border-radius:50%;display:inline-block;"></span><strong>Critical</strong> — ≥ 10 samples</span>
        <span style="display:flex;align-items:center;gap:5px;"><span style="width:12px;height:12px;background:#C0392B;border-radius:50%;display:inline-block;"></span><strong>Severe</strong> — 5–9 samples</span>
        <span style="display:flex;align-items:center;gap:5px;"><span style="width:12px;height:12px;background:#E87722;border-radius:50%;display:inline-block;"></span><strong>Poor</strong> — 2–4 samples</span>
        <span style="color:#888;">| Circle size ∝ sample density</span>
      </div>
      <div style="padding:8px 12px;border-left:4px solid #7b1c1c;background:#fff5f5;font-size:10px;color:#222;">
        <div style="font-weight:bold;font-size:11px;color:#7b1c1c;margin-bottom:5px;">Remarks — Dead Zone Summary</div>
        <p style="margin:0 0 4px 0;">
          A total of <strong>${allDeadZones.length}</strong> dead zone cluster${allDeadZones.length > 1 ? 's' : ''} were identified
          across ${availableTechs.join(', ')} technologies and ${allOpNames.length} operator${allOpNames.length > 1 ? 's' : ''} in
          <strong>${geoInfo.city}</strong>, ${geoInfo.district}, ${geoInfo.region}.
          Severity breakdown: <strong style="color:#5C0000;">${dzCritCount} Critical</strong>,
          <strong style="color:#C0392B;">${dzSevCount} Severe</strong>,
          <strong style="color:#E87722;">${dzPoorCount} Poor</strong>.
          ${allDeadZones.filter((d) => d.tech === '3G').length > 0 ? `3G dead zones (${allDeadZones.filter((d) => d.tech === '3G').length} clusters) indicate areas beyond effective macro coverage or suffering from pilot pollution and inter-cell interference. ` : ''}
          ${allDeadZones.filter((d) => d.tech === '4G').length > 0 ? `4G dead zones (${allDeadZones.filter((d) => d.tech === '4G').length} clusters) suggest handover gaps between LTE sites or excessive path loss in dense urban and indoor environments. ` : ''}
          ${allDeadZones.filter((d) => d.tech === '2G').length > 0 ? `2G dead zones (${allDeadZones.filter((d) => d.tech === '2G').length} clusters) reflect poor voice-quality areas requiring frequency optimisation or additional TRX capacity. ` : ''}
        </p>
        <p style="margin:0;color:#555;">
          <em>All identified locations must be submitted to the respective operators for mandatory corrective action within the stipulated regulatory timeframe. Critical clusters (≥ 10 samples) should be treated as priority escalation items.</em>
        </p>
      </div>
    </div>` : `
    <div style="page-break-before:always;">
      <h2 style="font-size:14px;color:#fff;background:#7b1c1c;padding:8px 12px;margin:0 0 8px 0;border-radius:3px;">
        Dead Zone Analysis — ${geoInfo.city} (${geoInfo.district}, ${geoInfo.region})
      </h2>
      <p style="font-size:11px;color:#2e9e5b;padding:10px;border:1px solid #2e9e5b;border-radius:3px;">
        No dead zones were identified in this cluster. All measured locations maintain signal above the worst-tier thresholds across all technologies and operators.
      </p>
    </div>`;

  const mapDataJson = JSON.stringify(mapData);
  const deadZoneMarkersJson = JSON.stringify(deadZoneMarkers);

  const htmlStr = `<!DOCTYPE html>
<html>
<head>
  <title>Drive Test Report — ${geoInfo.city} ${geoInfo.clusterNum}</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 15mm 18mm; }
    @media print { body { margin: 10mm 12mm; } .no-print { display: none; } }
    .cover-bar { background: #1565c0; color: #fff; padding: 12px 16px; margin-bottom: 4px; border-radius: 3px 3px 0 0; }
    .cover-bar h1 { margin: 0; font-size: 18px; }
    .cover-bar .sub { font-size: 11px; opacity: 0.85; margin-top: 4px; }
    .geo-bar { background: #0d3c7a; color: #cfe2ff; font-size: 10px; padding: 5px 16px; margin-bottom: 14px; border-radius: 0 0 3px 3px; display: flex; gap: 24px; }
    .geo-bar span { display: flex; align-items: center; gap: 5px; }
  </style>
</head>
<body>
  <div class="cover-bar">
    <h1>Drive Test Coverage Report — ${geoInfo.city} ${geoInfo.clusterNum}</h1>
    <div class="sub">Generated: ${dateStr} &nbsp;|&nbsp; Technologies: ${availableTechs.join(', ')} &nbsp;|&nbsp; Operators: ${allOpNames.join(', ')}</div>
  </div>
  <div class="geo-bar">
    <span>📍 <strong>Area:</strong>&nbsp;${geoInfo.city}</span>
    <span>🏛 <strong>District:</strong>&nbsp;${geoInfo.district}</span>
    <span>🗺 <strong>Region:</strong>&nbsp;${geoInfo.region}</span>
    <span>🌍 <strong>Country:</strong>&nbsp;${geoInfo.country}</span>
    <span>📋 <strong>Cluster:</strong>&nbsp;${geo}</span>
  </div>
  <button class="no-print" onclick="window.print()" style="margin-bottom:16px;padding:8px 20px;background:#1565c0;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
    🖨 Print / Save as PDF
  </button>
  ${techSections}
  ${deadZoneSection}
  <script>
    var __mapData = ${mapDataJson};
    var __dzMarkers = ${deadZoneMarkersJson};
    var TILE = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    var ATTR = '&copy; OpenStreetMap &copy; CARTO';

    function initMap(divId, markers, defaultRadius) {
      var el = document.getElementById(divId);
      if (!el || !markers || !markers.length) return;
      var lats = markers.map(function(m){ return parseFloat(m[0]); });
      var lons = markers.map(function(m){ return parseFloat(m[1]); });
      var map = L.map(divId, { zoomControl: true, attributionControl: true });
      L.tileLayer(TILE, { attribution: ATTR, subdomains: 'abcd', maxZoom: 18 }).addTo(map);
      var bounds = [];
      for (var i = 0; i < markers.length; i++) {
        var mk = markers[i];
        var lat = parseFloat(mk[0]), lon = parseFloat(mk[1]);
        var r = (mk[4] != null) ? mk[4] : (defaultRadius || 3);
        var tip = mk[3] || null;
        var cm = L.circleMarker([lat, lon], {
          radius: r, color: mk[2], fillColor: mk[2], fillOpacity: 0.85, weight: 0.5, stroke: true
        });
        if (tip) cm.bindTooltip(tip, { sticky: true });
        cm.addTo(map);
        bounds.push([lat, lon]);
      }
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
      return map;
    }

    window.addEventListener('load', function() {
      Object.keys(__mapData).forEach(function(key) {
        initMap('map_' + key + '_p', __mapData[key].primary, 3);
        if (__mapData[key].secondary && __mapData[key].secondary.length) {
          initMap('map_' + key + '_s', __mapData[key].secondary, 3);
        }
        if (__mapData[key].problems && __mapData[key].problems.length) {
          initMap('map_' + key + '_prob', __mapData[key].problems, 8);
        }
      });
      if (__dzMarkers && __dzMarkers.length) {
        initMap('map_deadzones', __dzMarkers, 8);
      }
    });
  <\/script>
</body>
</html>`;

  if (options.download) {
    try {
      const pdfFilename = `DT_Report_${geo}_${dateStr.replace(/\s/g, '_')}.pdf`;
      const res = await api.post('/drive-tests/report/cluster/pdf', {
        html: htmlStr,
        filename: pdfFilename,
      }, { responseType: 'blob' });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to export PDF: ' + e.message);
    }
  } else {
    const win = window.open('', '_blank');
    win.document.write(htmlStr);
    win.document.close();
  }
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function DriveTestCluster() {
  const [allTests, setAllTests]     = useState(null);
  const [operators, setOperators]   = useState([]);
  const [selectedTech, setSelectedTech] = useState('3G');
  const [selectedCluster, setSelectedCluster] = useState('');
  const [selectedOps, setSelectedOps] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('all');
  const [mapMode, setMapMode]       = useState('primary');   // primary | secondary
  const [samples, setSamples]       = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [flyTarget, setFlyTarget]   = useState(null);
  const [thresholdCfg, setThresholdCfg] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [invSites, setInvSites] = useState([]);


  useEffect(() => {
    get('/drive-tests').then((r) => setAllTests(r.data)).catch(() => setAllTests([]));
    get('/operators').then((r) => setOperators(r.data?.rows || r.data || [])).catch(() => setOperators([]));
    get('/drive-tests/signal-thresholds').then((r) => setThresholdCfg(buildTechCfg(r.data || []))).catch(() => setThresholdCfg(buildTechCfg([])));
    get('/inventory/map').then((r) => setInvSites(r.data || [])).catch(() => {});
  }, []);

  // Derive unique clusters from test names
  const clusters = useMemo(() => {
    if (!allTests) return [];
    const seen = new Set();
    for (const t of allTests) {
      const c = clusterFromName(t.test_name);
      if (c) seen.add(c);
    }
    return [...seen].sort();
  }, [allTests]);

  // Tests matching selected technology + cluster
  const matchingTests = useMemo(() => {
    if (!allTests || !selectedTech || !selectedCluster) return [];
    return allTests.filter((t) => {
      const techMatch = selectedTech === 'all' || t.technology === selectedTech;
      const clusterMatch = clusterFromName(t.test_name) === selectedCluster;
      const opMatch = selectedOps.length === 0 || selectedOps.includes(t.operator_id);
      return techMatch && clusterMatch && opMatch;
    });
  }, [allTests, selectedTech, selectedCluster, selectedOps]);

  // Operator list that have data for the selected cluster + tech
  const availableOps = useMemo(() => {
    if (!allTests || !selectedTech || !selectedCluster) return [];
    const opIds = new Set(
      allTests
        .filter((t) => (selectedTech === 'all' || t.technology === selectedTech) && clusterFromName(t.test_name) === selectedCluster)
        .map((t) => t.operator_id),
    );
    return operators.filter((o) => opIds.has(o.operator_id));
  }, [allTests, selectedTech, selectedCluster, operators]);

  // Auto-select all available operators when cluster/tech changes
  useEffect(() => {
    setSelectedOps(availableOps.map((o) => o.operator_id));
  }, [availableOps]);

  // Load samples when matchingTests or selectedFileId changes
  const loadSamples = useCallback(async () => {
    const idArr = selectedFileId === 'all' 
      ? matchingTests.map((t) => t.drive_test_id)
      : [selectedFileId];
    if (!idArr.length) { setSamples([]); return; }
    setLoadingSamples(true);
    try {
      const ids = idArr.join(',');
      const r = await get(`/drive-tests/cluster-samples?testIds=${ids}`);
      const data = r.data || [];
      setSamples(data);
      if (data.length) {
        const mid = data[Math.floor(data.length / 2)];
        setFlyTarget([Number(mid.latitude), Number(mid.longitude)]);
      }
    } catch { setSamples([]); }
    finally { setLoadingSamples(false); }
  }, [matchingTests, selectedFileId]);

  useEffect(() => { loadSamples(); }, [loadSamples]);

  useEffect(() => { setSelectedFileId('all'); }, [selectedTech, selectedCluster, selectedOps]);

  const cfg = thresholdCfg?.[selectedTech] || thresholdCfg?.['4G'];
  const metricCfg = mapMode === 'primary' ? cfg?.primary : cfg?.secondary;

  const uniqueOpNames = useMemo(() => {
    const names = new Set(samples.map((s) => s.operator_name).filter(Boolean));
    return [...names];
  }, [samples]);

  if (!allTests || !thresholdCfg) return <Loading height={400} />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Stack direction="row" spacing={1} alignItems="center">
        <LayersIcon color="primary" />
        <Typography variant="h5">Cluster Coverage Map</Typography>
        {samples.length > 0 && (
          <Chip size="small" label={`${samples.length.toLocaleString()} samples`} variant="outlined" />
        )}
        <Box sx={{ flex: 1 }} />
        {samples.length > 0 && selectedCluster && (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PrintIcon />}
              disabled={generating}
              onClick={async () => {
                setGenerating(true);
                try { await generateFullReport(selectedCluster, allTests, thresholdCfg); }
                finally { setGenerating(false); }
              }}
            >
              {generating ? 'Generating…' : 'Print Report'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              disabled={generating}
              onClick={async () => {
                setGenerating(true);
                try { await generateFullReport(selectedCluster, allTests, thresholdCfg, { download: true }); }
                finally { setGenerating(false); }
              }}
            >
              {generating ? 'Generating…' : 'Download HTML'}
            </Button>
          </>
        )}
      </Stack>

      {/* Filter bar */}
      <Card>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Technology</InputLabel>
                <Select label="Technology" value={selectedTech}
                  onChange={(e) => { setSelectedTech(e.target.value); setSelectedCluster(''); }}>
                  {['2G', '3G', '4G'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small" disabled={!clusters.length}>
                <InputLabel>Cluster</InputLabel>
                <Select label="Cluster" value={selectedCluster}
                  onChange={(e) => setSelectedCluster(e.target.value)}>
                  <MenuItem value="">— select —</MenuItem>
                  {clusters.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={6}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Operators
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {availableOps.length === 0
                  ? <Typography variant="caption" color="text.disabled">
                      {selectedCluster ? 'No operators for this selection' : 'Select a cluster first'}
                    </Typography>
                  : availableOps.map((op) => {
                    const checked = selectedOps.includes(op.operator_id);
                    return (
                      <FormControlLabel key={op.operator_id}
                        control={
                          <Checkbox size="small" checked={checked}
                            sx={{ color: colorFor(op.operator_name), '&.Mui-checked': { color: colorFor(op.operator_name) } }}
                            onChange={(e) => {
                              setSelectedOps((prev) =>
                                e.target.checked
                                  ? [...prev, op.operator_id]
                                  : prev.filter((id) => id !== op.operator_id),
                              );
                            }}
                          />
                        }
                        label={<Typography variant="caption">{op.operator_name}</Typography>}
                      />
                    );
                  })
                }
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* No cluster selected */}
      {!selectedCluster && (
        <EmptyState icon={<RouteIcon sx={{ fontSize: 48 }} />}
          message="Select a cluster to view coverage."
          hint="Cluster names are derived from imported drive test names (e.g. 'Bo CL01')." />
      )}

      {selectedCluster && matchingTests.length === 0 && (
        <Alert severity="info">
          No drive tests match {selectedTech} · {selectedCluster} for the selected operators.
        </Alert>
      )}

      {selectedCluster && matchingTests.length > 0 && (
        <>
          {loadingSamples && <LinearProgress />}

          {/* Metric toggle */}
          <Card>
            <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Typography variant="caption" color="text.secondary" fontWeight={700}>Map Color:</Typography>
                <ToggleButtonGroup size="small" exclusive value={mapMode}
                  onChange={(_, v) => { if (v) setMapMode(v); }}>
                  <ToggleButton value="primary">
                    {cfg.primary?.label} ({cfg.primary?.unit || 'value'})
                  </ToggleButton>
                  {cfg.secondary && (
                    <ToggleButton value="secondary">
                      {cfg.secondary.label} ({cfg.secondary.unit})
                    </ToggleButton>
                  )}
                </ToggleButtonGroup>
                <Divider orientation="vertical" flexItem />
                <FormControl size="small" sx={{ minWidth: 220, flex: 1, maxWidth: 400 }}>
                  <InputLabel>Filter by File</InputLabel>
                  <Select
                    label="Filter by File"
                    value={selectedFileId}
                    onChange={(e) => setSelectedFileId(e.target.value)}
                  >
                    <MenuItem value="all">All Files in Cluster ({matchingTests.length})</MenuItem>
                    {matchingTests.map((t) => (
                      <MenuItem key={t.drive_test_id} value={t.drive_test_id}>
                        <Typography variant="caption">{t.test_name.split(' — ')[0]}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </CardContent>
          </Card>

          {/* Map */}
          <Card sx={{ height: 520 }}>
            <CardContent sx={{ height: '100%', p: '0 !important', position: 'relative' }}>
              <MapContainer center={[8.4, -11.8]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                {flyTarget && <FlyTo center={flyTarget} zoom={14} />}

                {samples.map((s) => {
                  const color = metricCfg ? binColor(s[metricCfg.key], metricCfg) : '#888';
                  return (
                    <CircleMarker key={s.sample_id}
                      center={[Number(s.latitude), Number(s.longitude)]}
                      radius={4}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.88, weight: 0.5 }}>
                      <Popup>
                        <div style={{ minWidth: 170, fontSize: 12 }}>
                          <strong>{s.operator_name}</strong> · {s.technology}<br />
                          {cfg.primary && <><strong>{cfg.primary.label}:</strong> {s[cfg.primary.key] ?? 'N/A'} {cfg.primary.unit}<br /></>}
                          {cfg.secondary && <><strong>{cfg.secondary.label}:</strong> {s[cfg.secondary.key] ?? 'N/A'} {cfg.secondary.unit}<br /></>}
                          {s.sinr != null && <><strong>SINR:</strong> {s.sinr} dB<br /></>}
                          <span style={{ color: '#888', fontSize: 11 }}>
                            {Number(s.latitude).toFixed(5)}, {Number(s.longitude).toFixed(5)}
                          </span>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>

              {/* Legend */}
              {metricCfg && (
                <Box sx={{
                  position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
                  bgcolor: 'background.paper', borderRadius: 2, p: 1.5,
                  boxShadow: 2, opacity: 0.95, minWidth: 200,
                }}>
                  <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
                    {metricCfg.label} {metricCfg.unit ? `(${metricCfg.unit})` : ''}
                  </Typography>
                  {[...metricCfg.bins].filter((b) => b.tier !== 'N/A').reverse().map((bin) => (
                    <Stack key={bin.label} direction="row" spacing={0.5} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: bin.color, flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontSize: 10 }}>{bin.label}</Typography>
                    </Stack>
                  ))}
                  {/* operator dots */}
                  <Divider sx={{ my: 0.5 }} />
                  {uniqueOpNames.map((name) => (
                    <Stack key={name} direction="row" spacing={0.5} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: colorFor(name), flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontSize: 10 }}>{name}</Typography>
                    </Stack>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Distribution tables — one per operator */}
          {uniqueOpNames.length > 0 && (
            <Grid container spacing={2}>
              {uniqueOpNames.map((opName) => {
                const opSamples = samples.filter((s) => s.operator_name === opName);
                return (
                  <Grid item xs={12} md={uniqueOpNames.length > 1 ? 6 : 12} key={opName}>
                    <Card>
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                          <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: colorFor(opName) }} />
                          <Typography variant="subtitle2" fontWeight={700}>{opName}</Typography>
                          <Chip size="small" label={`${opSamples.length} samples`}
                            sx={{ bgcolor: colorFor(opName) + '22', fontSize: 10 }} />
                        </Stack>

                        <DistributionTable
                          samples={opSamples}
                          tech={selectedTech}
                          mapMode={mapMode}
                          techCfg={cfg}
                        />

                        {/* Secondary metric distribution if available */}
                        {cfg.secondary && mapMode === 'primary' && (
                          <>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>
                              {cfg.secondary.label} Distribution
                            </Typography>
                            <DistributionTable
                              samples={opSamples}
                              tech={selectedTech}
                              mapMode="secondary"
                              techCfg={cfg}
                            />
                          </>
                        )}

                        {/* CDF curve for primary metric */}
                        {cfg.primary && opSamples.some((s) => s[cfg.primary.key] != null) && (
                          <>
                            <Divider sx={{ my: 2 }} />
                            <CdfChart
                              samplesByOp={{ [opName]: opSamples }}
                              metricKey={cfg.primary.key}
                              label={cfg.primary.label}
                              unit={cfg.primary.unit}
                              passMin={cfg.primary.passMin}
                            />
                          </>
                        )}

                        {/* CSSR / CDR cards */}
                        {(() => {
                          const drops = opSamples.filter((s) => s.event_type === 'CALL_DROP').length;
                          const attempts = opSamples.filter((s) => s.event_type === 'CALL_ATTEMPT' || s.call_status === 'CONNECTING').length;
                          const established = opSamples.filter((s) => s.call_status === 'CONNECTED' || s.event_type === 'CALL_ESTABLISH').length;
                          if (!drops && !attempts && !established) return null;
                          const cssr = attempts ? ((1 - opSamples.filter((s) => s.event_type === 'CALL_FAIL' || s.call_status === 'FAILED').length / attempts) * 100).toFixed(1) : null;
                          const cdr = established ? ((drops / established) * 100).toFixed(2) : null;
                          return (
                            <>
                              <Divider sx={{ my: 1.5 }} />
                              <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.75}>
                                Call Quality (ITU-T E.800)
                              </Typography>
                              <Stack direction="row" spacing={2}>
                                {cssr != null && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10 }}>CSSR</Typography>
                                    <Typography variant="body2" fontWeight={700} color={Number(cssr) >= 95 ? 'success.main' : 'warning.main'}>{cssr}%</Typography>
                                  </Box>
                                )}
                                {cdr != null && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10 }}>CDR</Typography>
                                    <Typography variant="body2" fontWeight={700} color={Number(cdr) <= 2 ? 'success.main' : 'error.main'}>{cdr}%</Typography>
                                  </Box>
                                )}
                                {drops > 0 && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10 }}>Call Drops</Typography>
                                    <Typography variant="body2" fontWeight={700}>{drops}</Typography>
                                  </Box>
                                )}
                              </Stack>
                            </>
                          );
                        })()}

                        <RemarksPanel
                          samples={opSamples}
                          tech={selectedTech}
                          cluster={selectedCluster}
                          operatorNames={[opName]}
                          techCfg={cfg}
                          invSites={invSites}
                          operators={operators}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
}
