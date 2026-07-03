import { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet';
import {
  Box, Card, CardContent, Typography, Button, Stack, Grid, Chip, Alert,
  FormControl, InputLabel, Select, MenuItem, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Tooltip, LinearProgress, Divider, TablePagination,
  ToggleButtonGroup, ToggleButton, Slider,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MapIcon from '@mui/icons-material/Map';
import DeleteIcon from '@mui/icons-material/Delete';
import RouteIcon from '@mui/icons-material/Route';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { get } from '../api/client';
import { Loading, EmptyState } from '../components/ui';
import { colorFor } from '../theme';
import { useColorMode } from '../theme/ColorMode';
import { exportCsv } from '../utils/csv';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const RSRP_COLORS = [
  { min: -80, color: '#2e9e5b', label: 'Excellent (≥ -80)' },
  { min: -90, color: '#8bc34a', label: 'Good (-90 to -80)' },
  { min: -100, color: '#e6a700', label: 'Fair (-100 to -90)' },
  { min: -110, color: '#ef6c00', label: 'Poor (-110 to -100)' },
  { min: -Infinity, color: '#e0413b', label: 'No Signal (< -110)' },
];

const METRIC_THRESHOLDS = {
  rsrp: RSRP_COLORS,
  rsrq: [
    { min: -10, color: '#2e9e5b', label: 'Excellent (≥ -10 dB)' },
    { min: -15, color: '#8bc34a', label: 'Good (-15 to -10)' },
    { min: -20, color: '#e6a700', label: 'Fair (-20 to -15)' },
    { min: -25, color: '#ef6c00', label: 'Poor (-25 to -20)' },
    { min: -Infinity, color: '#e0413b', label: 'Critical (< -25)' },
  ],
  sinr: [
    { min: 20, color: '#2e9e5b', label: 'Excellent (≥ 20 dB)' },
    { min: 13, color: '#8bc34a', label: 'Good (13–20)' },
    { min: 0, color: '#e6a700', label: 'Fair (0–13)' },
    { min: -5, color: '#ef6c00', label: 'Poor (-5–0)' },
    { min: -Infinity, color: '#e0413b', label: 'Critical (< -5)' },
  ],
  dl: [
    { min: 10000, color: '#2e9e5b', label: 'Excellent (≥ 10 Mbps)' },
    { min: 5000, color: '#8bc34a', label: 'Good (5–10 Mbps)' },
    { min: 1000, color: '#e6a700', label: 'Fair (1–5 Mbps)' },
    { min: 500, color: '#ef6c00', label: 'Poor (< 1 Mbps)' },
    { min: -Infinity, color: '#e0413b', label: 'Very Low (< 500 kbps)' },
  ],
};

const METRIC_CONFIG = {
  rsrp: { label: 'RSRP', unit: 'dBm', yDomain: [-130, -50], lineColor: '#3da9fc' },
  rsrq: { label: 'RSRQ', unit: 'dB', yDomain: [-35, 0], lineColor: '#ef6c00' },
  sinr: { label: 'SINR', unit: 'dB', yDomain: [-20, 45], lineColor: '#2e9e5b' },
  dl: { label: 'DL Throughput', unit: 'kbps', yDomain: [0, 'auto'], lineColor: '#9c27b0' },
};

function rsrpColor(val) {
  if (val == null) return '#888';
  for (const r of RSRP_COLORS) { if (val >= r.min) return r.color; }
  return '#e0413b';
}

function sampleColor(s, metric) {
  const raw = metric === 'rsrp' ? s.rsrp
    : metric === 'rsrq' ? s.rsrq
    : metric === 'sinr' ? s.sinr
    : s.dl_throughput;
  if (raw == null) return '#888';
  const v = Number(raw);
  const thresholds = METRIC_THRESHOLDS[metric] || METRIC_THRESHOLDS.rsrp;
  for (const r of thresholds) { if (v >= r.min) return r.color; }
  return '#e0413b';
}

function haversineDist(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeGrade(stats) {
  const total = Number(stats.total_samples) || 1;
  const good = Number(stats.rsrp_excellent || 0) + Number(stats.rsrp_good || 0);
  const pct = (good / total) * 100;
  if (pct >= 90) return { grade: 'A', color: '#2e9e5b', label: 'Excellent' };
  if (pct >= 75) return { grade: 'B', color: '#8bc34a', label: 'Good' };
  if (pct >= 60) return { grade: 'C', color: '#e6a700', label: 'Fair' };
  if (pct >= 45) return { grade: 'D', color: '#ef6c00', label: 'Poor' };
  return { grade: 'F', color: '#e0413b', label: 'Critical' };
}

function exportTestPdf(analysis) {
  const { meta, stats } = analysis;
  const total = Number(stats.total_samples) || 1;
  const grade = computeGrade(stats);
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Drive Test Report', 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(`Operator: ${meta.operator_name}`, 14, 30);
  doc.text(`Test: ${meta.test_name}`, 14, 37);
  doc.text(
    `Date: ${meta.test_date || '—'}  |  Route: ${meta.route_type || '—'}  |  Tech: ${meta.technology || '—'}`,
    14, 44,
  );
  doc.setTextColor(30, 30, 30);
  doc.text(`Overall Grade: ${grade.grade} — ${grade.label}`, 14, 52);

  autoTable(doc, {
    startY: 58,
    head: [['Metric', 'Value']],
    body: [
      ['Total Samples', stats.total_samples?.toLocaleString() || '—'],
      ['Distance', meta.distance_km ? `${meta.distance_km} km` : '—'],
      ['Avg RSRP', stats.avg_rsrp != null ? `${stats.avg_rsrp} dBm` : 'N/A'],
      ['Avg RSRQ', stats.avg_rsrq != null ? `${stats.avg_rsrq} dB` : 'N/A'],
      ['Avg SINR', stats.avg_sinr != null ? `${stats.avg_sinr} dB` : 'N/A'],
      ['Avg DL Throughput', stats.avg_dl ? `${Math.round(stats.avg_dl)} kbps` : 'N/A'],
      ['Max DL Throughput', stats.max_dl ? `${Math.round(stats.max_dl)} kbps` : 'N/A'],
      ['Tester', meta.tester_name || '—'],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [61, 169, 252] },
  });

  const coverageY = (doc.lastAutoTable?.finalY || 120) + 10;
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text('RSRP Coverage Distribution', 14, coverageY);

  autoTable(doc, {
    startY: coverageY + 5,
    head: [['Band', 'Samples', '% of Total']],
    body: [
      ['Excellent (≥ -80 dBm)', String(stats.rsrp_excellent || 0), `${((Number(stats.rsrp_excellent || 0) / total) * 100).toFixed(1)}%`],
      ['Good (-90 to -80 dBm)', String(stats.rsrp_good || 0), `${((Number(stats.rsrp_good || 0) / total) * 100).toFixed(1)}%`],
      ['Fair (-100 to -90 dBm)', String(stats.rsrp_fair || 0), `${((Number(stats.rsrp_fair || 0) / total) * 100).toFixed(1)}%`],
      ['Poor (-110 to -100 dBm)', String(stats.rsrp_poor || 0), `${((Number(stats.rsrp_poor || 0) / total) * 100).toFixed(1)}%`],
      ['No Signal (< -110 dBm)', String(stats.rsrp_no_signal || 0), `${((Number(stats.rsrp_no_signal || 0) / total) * 100).toFixed(1)}%`],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [61, 169, 252] },
  });

  const filename = `DriveTest_${meta.operator_name}_${meta.test_name}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${filename}.pdf`);
}

// ─── Leaflet helpers ──────────────────────────────────────────────────────────
function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom || 13, { duration: 1 }); }, [center, zoom, map]);
  return null;
}

function PlaybackCursor({ sample }) {
  if (!sample) return null;
  return (
    <CircleMarker
      center={[Number(sample.latitude), Number(sample.longitude)]}
      radius={11}
      pathOptions={{ color: '#ffffff', fillColor: '#ff1744', fillOpacity: 0.95, weight: 3 }}
    />
  );
}

// ─── Recharts tooltip ─────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const dataKey = payload[0]?.dataKey;
  const cfg = METRIC_CONFIG[dataKey] || {};
  return (
    <Box sx={{
      bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
      p: 1, borderRadius: 1, fontSize: 11, boxShadow: 3,
    }}>
      <Typography variant="caption" fontWeight={700} display="block">{Number(label).toFixed(2)} km</Typography>
      {payload.map((p) => (
        <Box key={p.dataKey} sx={{ color: p.color }}>
          {cfg.label || p.name}: {p.value} {cfg.unit || ''}
        </Box>
      ))}
    </Box>
  );
}

// ─── Signal profile chart ─────────────────────────────────────────────────────
function SignalProfileChart({ chartData, metric, onHoverChange }) {
  const cfg = METRIC_CONFIG[metric] || METRIC_CONFIG.rsrp;
  if (!chartData?.length) return null;
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle2" mb={1.5}>
          Signal Profile Along Route — {cfg.label} ({cfg.unit})
        </Typography>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={chartData}
            onMouseMove={(e) => { if (e?.activeTooltipIndex != null) onHoverChange(e.activeTooltipIndex); }}
            onMouseLeave={() => onHoverChange(null)}
            margin={{ top: 4, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
            <XAxis dataKey="km" tick={{ fontSize: 10 }} unit=" km"
              tickFormatter={(v) => Number(v).toFixed(1)} />
            <YAxis tick={{ fontSize: 10 }} unit={` ${cfg.unit}`}
              domain={cfg.yDomain} width={58} />
            <ChartTooltip content={<ChartTip />} />
            <Line
              type="monotone" dataKey={metric} name={cfg.label}
              stroke={cfg.lineColor} strokeWidth={1.5} dot={false}
              connectNulls isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          Hover the chart to highlight the matching position on the map.
        </Typography>
      </CardContent>
    </Card>
  );
}

// ─── Upload dialog ────────────────────────────────────────────────────────────
function UploadDialog({ open, onClose, operators, onUploaded }) {
  const [opId, setOpId] = useState('');
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [routeType, setRouteType] = useState('urban');
  const [technology, setTechnology] = useState('4G');
  const [deviceModel, setDeviceModel] = useState('');
  const [testerName, setTesterName] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (!opId || !file) { setError('Select operator and file'); return; }
    setUploading(true); setError(''); setResult(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('operator_id', opId);
    fd.append('test_name', testName || file.name);
    fd.append('test_date', testDate);
    fd.append('route_type', routeType);
    fd.append('technology', technology);
    fd.append('device_model', deviceModel);
    fd.append('tester_name', testerName);

    try {
      const token = localStorage.getItem('tnipr_access');
      const res = await fetch(`${BASE}/drive-tests/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Upload failed');
      setResult(json.data);
      onUploaded();
    } catch (err) { setError(err.message); }
    finally { setUploading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Drive Test Data</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <FormControl fullWidth size="small" required>
            <InputLabel>Operator</InputLabel>
            <Select label="Operator" value={opId} onChange={(e) => setOpId(e.target.value)}>
              {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Test Name" value={testName} onChange={(e) => setTestName(e.target.value)}
            placeholder="e.g. Western Area LTE Coverage" fullWidth />
          <Stack direction="row" spacing={2}>
            <TextField size="small" label="Test Date" type="date" InputLabelProps={{ shrink: true }}
              value={testDate} onChange={(e) => setTestDate(e.target.value)} fullWidth />
            <FormControl size="small" fullWidth>
              <InputLabel>Route Type</InputLabel>
              <Select label="Route Type" value={routeType} onChange={(e) => setRouteType(e.target.value)}>
                {['urban', 'suburban', 'rural', 'highway', 'indoor'].map((r) => (
                  <MenuItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <Stack direction="row" spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Technology</InputLabel>
              <Select label="Technology" value={technology} onChange={(e) => setTechnology(e.target.value)}>
                {['2G', '3G', '4G', '5G'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Device Model" value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)} fullWidth placeholder="e.g. Samsung S24" />
          </Stack>
          <TextField size="small" label="Tester Name" value={testerName}
            onChange={(e) => setTesterName(e.target.value)} fullWidth />
          <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} fullWidth>
            {file ? file.name : 'Select CSV / Excel File'}
            <input type="file" hidden accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files[0])} />
          </Button>
          {uploading && <LinearProgress />}
          {error && <Alert severity="error">{error}</Alert>}
          {result && (
            <Alert severity="success">
              Imported {result.samplesImported} samples ({result.distanceKm} km route).
              {result.samplesSkipped > 0 && ` ${result.samplesSkipped} rows skipped (no GPS).`}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={handleUpload} disabled={uploading || !opId || !file}>
          {uploading ? 'Uploading...' : 'Upload & Process'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Scorecard panel ──────────────────────────────────────────────────────────
function ScorecardPanel({ analysis, onExportPdf }) {
  if (!analysis) return null;
  const { meta, stats } = analysis;
  const total = Number(stats.total_samples) || 1;
  const grade = computeGrade(stats);
  const overallPass = stats.avg_rsrp != null && Number(stats.avg_rsrp) >= -100;
  const coverage = [
    { label: 'Excellent', count: Number(stats.rsrp_excellent || 0), color: RSRP_COLORS[0].color },
    { label: 'Good', count: Number(stats.rsrp_good || 0), color: RSRP_COLORS[1].color },
    { label: 'Fair', count: Number(stats.rsrp_fair || 0), color: RSRP_COLORS[2].color },
    { label: 'Poor', count: Number(stats.rsrp_poor || 0), color: RSRP_COLORS[3].color },
    { label: 'No Signal', count: Number(stats.rsrp_no_signal || 0), color: RSRP_COLORS[4].color },
  ];

  return (
    <Card>
      <CardContent>
        {/* Header strip: grade + identity + export */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} mb={2}>
          <Box sx={{
            width: 64, height: 64, borderRadius: 2,
            bgcolor: grade.color + '22', border: `2px solid ${grade.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Typography variant="h4" fontWeight={900} sx={{ color: grade.color, lineHeight: 1 }}>
              {grade.grade}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap">
              <Chip label={meta.operator_name} size="small"
                sx={{ bgcolor: colorFor(meta.operator_name) + '33', fontWeight: 700 }} />
              <Chip label={overallPass ? 'PASS' : 'FAIL'} size="small"
                color={overallPass ? 'success' : 'error'} variant="outlined" />
              <Chip label={grade.label} size="small"
                sx={{ bgcolor: grade.color + '22', color: grade.color, fontWeight: 700 }} />
            </Stack>
            <Typography variant="h6" fontWeight={700} noWrap>{meta.test_name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {meta.test_date} · {meta.route_type} · {meta.technology} · {meta.distance_km} km
            </Typography>
          </Box>
          <Button size="small" variant="outlined" startIcon={<PictureAsPdfIcon />}
            onClick={onExportPdf} sx={{ flexShrink: 0 }}>
            Export PDF
          </Button>
        </Stack>

        {/* Key metrics */}
        <Grid container spacing={2} mb={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Samples</Typography>
            <Typography variant="h6" fontWeight={700}>{stats.total_samples?.toLocaleString()}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Avg RSRP</Typography>
            <Typography variant="h6" fontWeight={700} sx={{ color: rsrpColor(stats.avg_rsrp) }}>
              {stats.avg_rsrp} dBm
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Avg SINR</Typography>
            <Typography variant="h6" fontWeight={700}>{stats.avg_sinr} dB</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Avg DL</Typography>
            <Typography variant="h6" fontWeight={700}>
              {stats.avg_dl ? `${Math.round(stats.avg_dl)} kbps` : 'N/A'}
            </Typography>
          </Grid>
        </Grid>

        {/* Coverage distribution bar */}
        <Typography variant="subtitle2" mb={0.5}>RSRP Coverage Distribution</Typography>
        <Box sx={{ display: 'flex', height: 20, borderRadius: 1, overflow: 'hidden', mb: 0.5 }}>
          {coverage.map((c) => (
            <Tooltip key={c.label} title={`${c.label}: ${c.count} (${((c.count / total) * 100).toFixed(1)}%)`}>
              <Box sx={{ width: `${(c.count / total) * 100}%`, bgcolor: c.color, transition: 'width 0.3s' }} />
            </Tooltip>
          ))}
        </Box>
        <Stack direction="row" spacing={2} flexWrap="wrap" mb={1.5}>
          {coverage.map((c) => (
            <Stack key={c.label} direction="row" spacing={0.3} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.color }} />
              <Typography variant="caption" sx={{ fontSize: 10 }}>
                {c.label}: {((c.count / total) * 100).toFixed(1)}%
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {/* Extended stats */}
        <Grid container spacing={1}>
          {[
            { label: 'RSRP Range', val: `${stats.min_rsrp} to ${stats.max_rsrp} dBm` },
            { label: 'RSRQ Range', val: `${stats.min_rsrq} to ${stats.max_rsrq} dB` },
            { label: 'SINR Range', val: `${stats.min_sinr} to ${stats.max_sinr} dB` },
            { label: 'Max DL', val: stats.max_dl ? `${Math.round(stats.max_dl)} kbps` : 'N/A' },
            { label: 'Avg UL', val: stats.avg_ul ? `${Math.round(stats.avg_ul)} kbps` : 'N/A' },
            { label: 'Tester', val: meta.tester_name || '—' },
          ].map((s) => (
            <Grid item xs={6} sm={4} key={s.label}>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              <Typography variant="body2" fontWeight={600}>{s.val}</Typography>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DriveTest() {
  const [tests, setTests] = useState(null);
  const [operators, setOperators] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [samples, setSamples] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [nearbySites, setNearbySites] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [filterOp, setFilterOp] = useState('all');
  const [filterTech, setFilterTech] = useState('all');
  const [page, setPage] = useState(0);

  // Map metric toggle
  const [mapMetric, setMapMetric] = useState('rsrp');
  // Route playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [playIdx, setPlayIdx] = useState(0);
  const [playSpeed, setPlaySpeed] = useState(5);
  // Chart-to-map hover sync
  const [hoveredChartIdx, setHoveredChartIdx] = useState(null);

  const { mode } = useColorMode();
  const tileVariant = mode === 'dark' ? 'dark_all' : 'light_all';

  const loadTests = useCallback(() => {
    get('/drive-tests').then((r) => setTests(r.data)).catch(() => setTests([]));
  }, []);

  useEffect(() => {
    loadTests();
    get('/operators').then((r) => setOperators(r.data?.rows || r.data || [])).catch(() => setOperators([]));
  }, [loadTests]);

  // Playback interval
  useEffect(() => {
    if (!isPlaying || !samples?.length) return;
    const id = setInterval(() => {
      setPlayIdx((prev) => {
        const next = prev + playSpeed;
        if (next >= samples.length - 1) { setIsPlaying(false); return 0; }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [isPlaying, samples, playSpeed]);

  // Reset playback when test changes
  useEffect(() => {
    setIsPlaying(false);
    setPlayIdx(0);
    setHoveredChartIdx(null);
  }, [selectedTest]);

  // Downsample samples for chart (max ~400 points)
  const chartData = useMemo(() => {
    if (!samples?.length) return [];
    const step = Math.max(1, Math.floor(samples.length / 400));
    const result = [];
    let cumDist = 0;
    for (let i = 0; i < samples.length; i++) {
      if (i > 0) {
        const prev = samples[i - 1];
        const cur = samples[i];
        cumDist += haversineDist(
          Number(prev.latitude), Number(prev.longitude),
          Number(cur.latitude), Number(cur.longitude),
        );
      }
      if (i % step === 0) {
        const s = samples[i];
        result.push({
          origIdx: i,
          km: parseFloat(cumDist.toFixed(2)),
          rsrp: s.rsrp != null ? Number(s.rsrp) : null,
          rsrq: s.rsrq != null ? Number(s.rsrq) : null,
          sinr: s.sinr != null ? Number(s.sinr) : null,
          dl: s.dl_throughput != null ? Math.round(Number(s.dl_throughput)) : null,
        });
      }
    }
    return result;
  }, [samples]);

  const filteredTests = useMemo(() => {
    if (!tests) return [];
    return tests.filter((t) => {
      if (filterOp !== 'all' && t.operator_id !== Number(filterOp)) return false;
      if (filterTech !== 'all' && t.technology !== filterTech) return false;
      return true;
    });
  }, [tests, filterOp, filterTech]);

  const viewTest = async (test) => {
    setSelectedTest(test);
    setLoading(true);
    setSamples(null); setAnalysis(null); setNearbySites([]);
    try {
      const [samplesRes, analysisRes, sitesRes] = await Promise.all([
        get(`/drive-tests/${test.drive_test_id}/samples`),
        get(`/drive-tests/${test.drive_test_id}/analysis`),
        get(`/drive-tests/${test.drive_test_id}/nearby-sites`),
      ]);
      setSamples(samplesRes.data);
      setAnalysis(analysisRes.data);
      setNearbySites(sitesRes.data || []);
      if (samplesRes.data?.length) {
        const mid = samplesRes.data[Math.floor(samplesRes.data.length / 2)];
        setFlyTarget({ center: [Number(mid.latitude), Number(mid.longitude)], zoom: 13 });
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem('tnipr_access');
    await fetch(`${BASE}/drive-tests/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadTests();
    if (selectedTest?.drive_test_id === id) {
      setSelectedTest(null); setSamples(null); setAnalysis(null);
    }
  };

  const routePath = useMemo(() => {
    if (!samples?.length) return [];
    return samples.map((s) => [Number(s.latitude), Number(s.longitude)]);
  }, [samples]);

  // Sample highlighted by chart hover
  const hoveredSample = hoveredChartIdx != null && chartData[hoveredChartIdx]
    ? samples?.[chartData[hoveredChartIdx].origIdx] ?? null
    : null;

  const playbackSample = samples?.[playIdx] ?? null;
  const currentThresholds = METRIC_THRESHOLDS[mapMetric] || METRIC_THRESHOLDS.rsrp;

  if (!tests) return <Loading height={400} />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Page header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1} alignItems="center">
          <RouteIcon color="primary" />
          <Typography variant="h5">Drive Testing</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<DownloadIcon />} disabled={!filteredTests?.length}
            onClick={() => exportCsv('drive_tests.csv', [
              { key: 'test_name', label: 'Test Name' }, { key: 'operator_name', label: 'Operator' },
              { key: 'test_date', label: 'Date' }, { key: 'route_type', label: 'Route Type' },
              { key: 'technology', label: 'Technology' }, { key: 'sample_count', label: 'Samples' },
            ], filteredTests)}>Export</Button>
          <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => setUploadOpen(true)}>
            Upload Drive Test
          </Button>
        </Stack>
      </Stack>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)}
        operators={operators} onUploaded={loadTests} />

      {/* Filters */}
      <Stack direction="row" spacing={2}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Operator</InputLabel>
          <Select label="Operator" value={filterOp} onChange={(e) => setFilterOp(e.target.value)}>
            <MenuItem value="all">All Operators</MenuItem>
            {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Technology</InputLabel>
          <Select label="Technology" value={filterTech} onChange={(e) => setFilterTech(e.target.value)}>
            <MenuItem value="all">All</MenuItem>
            {['2G', '3G', '4G', '5G'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <Chip label={`${filteredTests.length} of ${tests.length} tests`} variant="outlined" sx={{ alignSelf: 'center' }} />
      </Stack>

      {/* Test list */}
      {!filteredTests.length ? (
        <EmptyState icon={<RouteIcon sx={{ fontSize: 48 }} />}
          message="No drive tests uploaded yet."
          hint="Upload a CSV or Excel file with GPS coordinates and signal measurements." />
      ) : (
        <Card>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Test Name</TableCell>
                  <TableCell>Operator</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Tech</TableCell>
                  <TableCell align="right">Samples</TableCell>
                  <TableCell align="right">Distance</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTests.slice(page * 10, page * 10 + 10).map((t) => (
                  <TableRow key={t.drive_test_id}
                    selected={selectedTest?.drive_test_id === t.drive_test_id}
                    hover sx={{ cursor: 'pointer' }}
                    onClick={() => viewTest(t)}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 200 }}>
                        {t.test_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={t.operator_name}
                        sx={{ bgcolor: colorFor(t.operator_name) + '33', height: 22, fontSize: 11 }} />
                    </TableCell>
                    <TableCell>{t.test_date}</TableCell>
                    <TableCell><Chip size="small" label={t.route_type} variant="outlined" sx={{ height: 20, fontSize: 10 }} /></TableCell>
                    <TableCell>{t.technology || '—'}</TableCell>
                    <TableCell align="right">{t.total_samples?.toLocaleString()}</TableCell>
                    <TableCell align="right">{t.distance_km ? `${t.distance_km} km` : '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={t.status}
                        color={t.status === 'COMPLETED' ? 'success' : t.status === 'FAILED' ? 'error' : 'default'}
                        sx={{ height: 20, fontSize: 10 }} />
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="View on map">
                        <IconButton size="small" onClick={() => viewTest(t)}><MapIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(t.drive_test_id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination component="div" count={filteredTests.length} page={page} rowsPerPage={10}
              rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />
          </CardContent>
        </Card>
      )}

      {loading && <LinearProgress />}

      {/* Scorecard */}
      {analysis && (
        <ScorecardPanel analysis={analysis} onExportPdf={() => exportTestPdf(analysis)} />
      )}

      {/* Map + controls */}
      {selectedTest && samples && (
        <>
          {/* Metric toggle + playback controls */}
          <Card>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} flexWrap="wrap">
                {/* Map metric selector */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                    Map Color:
                  </Typography>
                  <ToggleButtonGroup size="small" exclusive value={mapMetric}
                    onChange={(_, v) => { if (v) setMapMetric(v); }}>
                    <ToggleButton value="rsrp">RSRP</ToggleButton>
                    <ToggleButton value="rsrq">RSRQ</ToggleButton>
                    <ToggleButton value="sinr">SINR</ToggleButton>
                    <ToggleButton value="dl">DL</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>

                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'flex' } }} />

                {/* Playback */}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                  <Tooltip title="Reset">
                    <IconButton size="small" onClick={() => { setPlayIdx(0); setIsPlaying(false); }}>
                      <ReplayIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" color="primary" onClick={() => setIsPlaying((p) => !p)}>
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                  </IconButton>
                  <Box sx={{ flex: 1, mx: 1 }}>
                    <Slider
                      size="small" value={playIdx}
                      min={0} max={Math.max(0, (samples?.length || 1) - 1)}
                      onChange={(_, v) => { setPlayIdx(v); setIsPlaying(false); }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {playIdx + 1} / {samples?.length || 0}
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 90 }}>
                    <Select value={playSpeed} onChange={(e) => setPlaySpeed(e.target.value)}>
                      <MenuItem value={1}>1×</MenuItem>
                      <MenuItem value={3}>3×</MenuItem>
                      <MenuItem value={5}>5×</MenuItem>
                      <MenuItem value={10}>10×</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                {/* Live playback readout */}
                {playbackSample && (
                  <Chip size="small" variant="outlined" sx={{ fontWeight: 600, fontFamily: 'monospace', flexShrink: 0 }}
                    label={`RSRP ${playbackSample.rsrp ?? '—'} dBm  |  SINR ${playbackSample.sinr ?? '—'} dB`} />
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Map */}
          <Card sx={{ height: 500 }}>
            <CardContent sx={{ height: '100%', p: '0 !important', position: 'relative' }}>
              <MapContainer center={[8.4, -11.8]} zoom={8} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; OpenStreetMap, &copy; CARTO'
                  url={`https://{s}.basemaps.cartocdn.com/${tileVariant}/{z}/{x}/{y}{r}.png`}
                />
                {flyTarget && <FlyTo center={flyTarget.center} zoom={flyTarget.zoom} />}

                {/* Route outline */}
                {routePath.length > 1 && (
                  <Polyline positions={routePath} pathOptions={{ color: '#3da9fc', weight: 3, opacity: 0.3 }} />
                )}

                {/* Sample dots colored by selected metric */}
                {samples.map((s) => (
                  <CircleMarker key={s.sample_id}
                    center={[Number(s.latitude), Number(s.longitude)]}
                    radius={4}
                    pathOptions={{
                      color: sampleColor(s, mapMetric),
                      fillColor: sampleColor(s, mapMetric),
                      fillOpacity: 0.85,
                      weight: 0.5,
                    }}>
                    <Popup>
                      <div style={{ minWidth: 160, fontSize: 12 }}>
                        <strong>RSRP:</strong> {s.rsrp ?? 'N/A'} dBm<br />
                        <strong>RSRQ:</strong> {s.rsrq ?? 'N/A'} dB<br />
                        <strong>SINR:</strong> {s.sinr ?? 'N/A'} dB<br />
                        {s.dl_throughput && <><strong>DL:</strong> {s.dl_throughput} kbps<br /></>}
                        <span style={{ color: '#888' }}>
                          {Number(s.latitude).toFixed(5)}, {Number(s.longitude).toFixed(5)}
                        </span>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* Chart hover crosshair on map */}
                {hoveredSample && (
                  <CircleMarker
                    center={[Number(hoveredSample.latitude), Number(hoveredSample.longitude)]}
                    radius={11}
                    pathOptions={{ color: '#ffffff', fillColor: '#ff6d00', fillOpacity: 0.9, weight: 2.5 }}
                  />
                )}

                {/* Playback cursor */}
                <PlaybackCursor sample={playbackSample} />

                {/* Nearby cell sites */}
                {nearbySites.map((site) => (
                  <CircleMarker key={`site-${site.site_id}`}
                    center={[Number(site.latitude), Number(site.longitude)]}
                    radius={8}
                    pathOptions={{ color: '#fff', fillColor: '#3da9fc', fillOpacity: 0.9, weight: 2 }}>
                    <Popup>
                      <div style={{ minWidth: 160, fontSize: 12 }}>
                        <strong>{site.site_code}</strong><br />
                        {site.site_name}<br />
                        <span style={{ color: '#888' }}>{site.operator_name} · {site.technologies}</span>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>

              {/* Legend — updates with metric */}
              <Box sx={{
                position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
                bgcolor: 'background.paper', borderRadius: 2, p: 1.5, boxShadow: 2, opacity: 0.92,
              }}>
                <Typography variant="caption" fontWeight={700} mb={0.5} display="block">
                  {METRIC_CONFIG[mapMetric]?.label} ({METRIC_CONFIG[mapMetric]?.unit})
                </Typography>
                {currentThresholds.map((r) => (
                  <Stack key={r.label} direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: r.color }} />
                    <Typography variant="caption" sx={{ fontSize: 10 }}>{r.label}</Typography>
                  </Stack>
                ))}
                {nearbySites.length > 0 && (
                  <Stack direction="row" spacing={0.5} alignItems="center" mt={0.5}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#3da9fc', border: '1.5px solid #fff' }} />
                    <Typography variant="caption" sx={{ fontSize: 10 }}>Cell Tower</Typography>
                  </Stack>
                )}
              </Box>

              {/* Reset view */}
              <Tooltip title="Reset view">
                <IconButton size="small"
                  onClick={() => {
                    if (samples?.length) {
                      const mid = samples[Math.floor(samples.length / 2)];
                      setFlyTarget({ center: [Number(mid.latitude), Number(mid.longitude)], zoom: 13 });
                    }
                  }}
                  sx={{
                    position: 'absolute', top: 80, right: 12, zIndex: 1000,
                    bgcolor: 'background.paper', boxShadow: 2,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}>
                  <MyLocationIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </CardContent>
          </Card>

          {/* Signal profile chart — hover highlights map position */}
          {chartData.length > 0 && (
            <SignalProfileChart
              chartData={chartData}
              metric={mapMetric}
              onHoverChange={setHoveredChartIdx}
            />
          )}
        </>
      )}
    </Box>
  );
}
