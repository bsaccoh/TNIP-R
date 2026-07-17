import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box, Card, CardContent, Typography, Stack, Grid, Chip, FormControl,
  InputLabel, Select, MenuItem, Table, TableHead, TableBody, TableRow,
  TableCell, TableContainer, Paper, LinearProgress, Alert, Tooltip,
  IconButton, ToggleButtonGroup, ToggleButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Button,
} from '@mui/material';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import TrendingDownIcon  from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon  from '@mui/icons-material/TrendingFlat';
import EmojiEventsIcon   from '@mui/icons-material/EmojiEvents';
import TimelineIcon      from '@mui/icons-material/Timeline';
import DownloadIcon      from '@mui/icons-material/Download';
import MapIcon           from '@mui/icons-material/Map';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import CloseIcon         from '@mui/icons-material/Close';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { get } from '../api/client';
import { Loading } from '../components/ui';
import { colorFor, opColor } from '../theme';
import { exportCsv } from '../utils/csv';

const METRICS = [
  { key: 'score',       label: 'QoS Score',  unit: '',     fmt: (v) => v?.toFixed(1) },
  { key: 'avgRsrp',    label: 'RSRP (dBm)', unit: ' dBm', fmt: (v) => v?.toFixed(1) },
  { key: 'avgSinr',    label: 'SINR (dB)',  unit: ' dB',  fmt: (v) => v?.toFixed(1) },
  { key: 'avgDl',      label: 'DL (kbps)',  unit: ' kbps',fmt: (v) => v?.toLocaleString() },
  { key: 'avgUl',      label: 'UL (kbps)',  unit: ' kbps',fmt: (v) => v?.toLocaleString() },
  { key: 'coveragePct',label: 'Coverage %', unit: '%',    fmt: (v) => v?.toFixed(1) },
];

const QUALITY_COLOR = {
  good: '#2e7d32', fair: '#f9a825', poor: '#e65100', dead: '#880e4f', unknown: '#9e9e9e',
};

function qualityOf(rsrp) {
  if (rsrp == null) return 'unknown';
  if (rsrp >= -90)  return 'good';
  if (rsrp >= -100) return 'fair';
  if (rsrp >= -110) return 'poor';
  return 'dead';
}

function scoreColor(s) {
  if (s == null) return '#9e9e9e';
  if (s >= 70)   return '#2e7d32';
  if (s >= 50)   return '#e65100';
  return '#c62828';
}

function ScoreCell({ score }) {
  const color = scoreColor(score);
  return (
    <Box component="span" sx={{
      display: 'inline-block', px: 0.8, py: 0.15, borderRadius: 0.8,
      bgcolor: `${color}18`, fontWeight: 700, color, fontSize: '0.78rem',
    }}>
      {score != null ? score.toFixed(1) : '—'}
    </Box>
  );
}

function TrendBadge({ trend }) {
  const cfg = {
    improving: { Icon: TrendingUpIcon,   color: '#2e7d32', label: 'Improving' },
    declining: { Icon: TrendingDownIcon, color: '#c62828', label: 'Declining' },
    stable:    { Icon: TrendingFlatIcon, color: '#757575', label: 'Stable'    },
  }[trend] || { Icon: TrendingFlatIcon, color: '#757575', label: 'Stable' };
  return (
    <Stack direction="row" spacing={0.4} alignItems="center">
      <cfg.Icon sx={{ fontSize: 18, color: cfg.color }} />
      <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 600 }}>{cfg.label}</Typography>
    </Stack>
  );
}

function KpiCard({ label, value, sub, color, icon }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              {label}
            </Typography>
            <Typography variant="h6" fontWeight={800} sx={{ color: color || 'text.primary', lineHeight: 1.1 }}>
              {value ?? '—'}
            </Typography>
            {sub && <Typography variant="caption" color="text.secondary" display="block" mt={0.3}>{sub}</Typography>}
          </Box>
          {icon && <Box sx={{ color: color || 'action.active', opacity: 0.5, mt: 0.3 }}>{icon}</Box>}
        </Stack>
      </CardContent>
    </Card>
  );
}

/* ── Campaign route map dialog ──────────────────────────────────────────── */
function FitRoute({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    const lats = points.map((p) => p.lat);
    const lons = points.map((p) => p.lon);
    map.fitBounds([
      [Math.min(...lats) - 0.002, Math.min(...lons) - 0.002],
      [Math.max(...lats) + 0.002, Math.max(...lons) + 0.002],
    ], { padding: [20, 20] });
  }, [points, map]);
  return null;
}

function RouteMapDialog({ open, testId, testLabel, onClose }) {
  const [corridor, setCorridor] = useState(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!open || !testId) return;
    setCorridor(null);
    setLoading(true);
    get(`/drive-tests/corridor/${testId}`)
      .then((r) => setCorridor(r.data))
      .finally(() => setLoading(false));
  }, [open, testId]);

  const coloredSegs = useMemo(() =>
    corridor?.segments?.map((s) => ({
      positions: s.points.map((p) => [p.lat, p.lon]),
      color: QUALITY_COLOR[s.quality],
      label: `Seg ${s.segIndex} (${s.fromKm}–${s.toKm} km): ${s.avgRsrp} dBm`,
    })) ?? [],
  [corridor]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <MapIcon color="primary" />
            <Typography fontWeight={700}>Route Map — {testLabel}</Typography>
          </Stack>
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {loading && <LinearProgress />}
        {corridor && (
          <>
            <Box sx={{ height: 420 }}>
              <MapContainer center={[8.46, -11.78]} zoom={12}
                style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors' />
                <FitRoute points={corridor.routePoints} />
                {coloredSegs.map((s, i) =>
                  s.positions.length >= 2 && (
                    <Polyline key={i} positions={s.positions}
                      pathOptions={{ color: s.color, weight: 5, opacity: 0.85 }} />
                  )
                )}
                {corridor.routePoints.filter((_, i) => i % 10 === 0).map((pt, i) => (
                  <CircleMarker key={i} center={[pt.lat, pt.lon]} radius={3}
                    pathOptions={{ color: QUALITY_COLOR[qualityOf(pt.rsrp)], fillOpacity: 0.9, weight: 0 }} />
                ))}
              </MapContainer>
            </Box>
            {/* Legend + quick stats */}
            <Box px={2} py={1.5} bgcolor="action.hover">
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Typography variant="caption" fontWeight={700} color="text.secondary">Signal:</Typography>
                {Object.entries(QUALITY_COLOR).filter(([k]) => k !== 'unknown').map(([k, c]) => (
                  <Stack key={k} direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 18, height: 4, bgcolor: c, borderRadius: 1 }} />
                    <Typography variant="caption" textTransform="capitalize">{k}</Typography>
                  </Stack>
                ))}
                <Box ml="auto">
                  <Typography variant="caption" color="text.secondary">
                    {corridor.totalDistKm} km · {corridor.totalSamples} samples ·
                    Avg RSRP: <strong>{corridor.stats?.avgRsrp} dBm</strong>
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button size="small" onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Threshold violation badge ──────────────────────────────────────────── */
function ViolationDots({ violations }) {
  if (!violations.length) return null;
  return (
    <Tooltip title={violations.join(' · ')} arrow>
      <WarningAmberIcon sx={{ fontSize: 14, color: '#f57c00', ml: 0.5, verticalAlign: 'middle' }} />
    </Tooltip>
  );
}

function TrendChart({ campaigns, metricKey, metricUnit, fmtFn, thresholds }) {
  const opNames = useMemo(() => [...new Set(campaigns.map((c) => c.operator))], [campaigns]);

  // Group each operator's campaigns in their own sorted array, then align by
  // relative position (#1, #2 …) so all three lines start at the same X origin.
  const { merged, tooltipMeta, singleOp } = useMemo(() => {
    const byOp = {};
    for (const c of campaigns) {
      if (!byOp[c.operator]) byOp[c.operator] = [];
      byOp[c.operator].push(c);
    }
    // Sort each group by campaignIndex ascending
    for (const arr of Object.values(byOp)) arr.sort((a, b) => a.campaignIndex - b.campaignIndex);

    const maxLen    = Math.max(...Object.values(byOp).map((a) => a.length));
    const singleOp  = opNames.length === 1;
    const meta      = [];   // per-slot: { [op]: timeLabel }

    const rows = Array.from({ length: maxLen }, (_, i) => {
      // Single operator → show real time label; multi-operator → use relative #N
      const firstRun = byOp[opNames[0]]?.[i];
      const entry = { label: singleOp && firstRun ? firstRun.timeLabel : `#${i + 1}` };
      const m     = {};
      for (const op of opNames) {
        const run = byOp[op]?.[i];
        if (run) { entry[op] = run[metricKey]; m[op] = run.timeLabel; }
      }
      meta.push(m);
      return entry;
    });
    return { merged: rows, tooltipMeta: meta, singleOp };
  }, [campaigns, metricKey, opNames]);

  const refLine = {
    score:       50,
    avgRsrp:     thresholds?.rsrp_threshold ?? -100,
    avgSinr:     thresholds?.sinr_threshold ?? 0,
    avgDl:       thresholds?.dl_threshold   ?? 2000,
    avgUl:       thresholds?.ul_threshold   ?? 500,
    coveragePct: thresholds?.coverage_target ?? 95,
  }[metricKey];

  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={merged} margin={{ top: 4, right: 40, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10 }} width={54}
          tickFormatter={(v) => `${v}${metricUnit.replace(' ', '')}`} />
        <RTooltip
          formatter={(v, name) => [v != null ? `${fmtFn(v)}${metricUnit}` : '—', name]}
          labelFormatter={(label, payload) => {
            if (singleOp) return label;   // label is already the time
            const idx = merged.findIndex((r) => r.label === label);
            const meta = tooltipMeta[idx] ?? {};
            const times = opNames.filter((op) => meta[op]).map((op) => `${op}: ${meta[op]}`);
            return times.length ? `${label}  (${times.join(' · ')})` : label;
          }}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {refLine != null && (
          <ReferenceLine y={refLine} stroke="#e65100" strokeDasharray="4 2"
            label={{ value: '— threshold', fill: '#e65100', fontSize: 10, position: 'insideTopLeft' }} />
        )}
        {opNames.map((op, i) => (
          <Line key={op} type="monotone" dataKey={op} stroke={colorFor(op, i)}
            strokeWidth={2} dot={{ r: 2.5 }} activeDot={{ r: 5 }} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function DriveTestTrend() {
  const [data, setData]               = useState(null);
  const [thresholds, setThresholds]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [operatorFilter, setOpFilter] = useState('');
  const [tableOpFilter, setTableOp]   = useState('');
  const [activeMetric, setMetric]     = useState('score');
  const [mapOpen, setMapOpen]         = useState(false);
  const [mapTest, setMapTest]         = useState({ id: null, label: '' });

  useEffect(() => {
    get('/drive-tests/config').then((r) => setThresholds(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs = operatorFilter ? `?operatorId=${operatorFilter}` : '';
    get(`/drive-tests/trend${qs}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.error?.message || e.message))
      .finally(() => setLoading(false));
  }, [operatorFilter]);

  const opList = useMemo(() =>
    data?.summary.map((s) => ({ id: s.operatorId, name: s.operator })) ?? [], [data]);

  const metric = METRICS.find((m) => m.key === activeMetric) || METRICS[0];

  // Violation check helpers using fetched thresholds
  const violations = (c) => {
    const v = [];
    if (thresholds) {
      if (c.avgRsrp != null && c.avgRsrp < thresholds.rsrp_threshold) v.push(`RSRP ${c.avgRsrp} dBm < ${thresholds.rsrp_threshold}`);
      if (c.avgSinr != null && c.avgSinr < thresholds.sinr_threshold)  v.push(`SINR ${c.avgSinr} dB < ${thresholds.sinr_threshold}`);
      if (c.avgDl   != null && c.avgDl   < thresholds.dl_threshold)    v.push(`DL ${c.avgDl} kbps < ${thresholds.dl_threshold}`);
    }
    return v;
  };

  const handleExport = () => {
    if (!data) return;
    exportCsv(data.campaigns.map((c) => ({
      '#': c.campaignIndex, Time: c.timeLabel, Date: c.testDate, Operator: c.operator,
      'QoS Score': c.score, 'RSRP (dBm)': c.avgRsrp, 'SINR (dB)': c.avgSinr,
      'DL (kbps)': c.avgDl, 'UL (kbps)': c.avgUl, 'Coverage %': c.coveragePct,
      Samples: c.sampleCount, 'Distance (km)': c.distanceKm,
    })), 'campaign_trend');
  };

  if (loading) return <Loading />;
  if (error)   return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  if (!data?.campaigns.length)
    return <Alert severity="info" sx={{ m: 2 }}>No completed drive test campaigns found.</Alert>;

  const { campaigns, summary } = data;

  // Local table filter (client-side, no refetch)
  const visibleCampaigns = tableOpFilter
    ? campaigns.filter((c) => c.operator === tableOpFilter)
    : campaigns;

  // Global violation count across all campaigns
  const totalViolations = campaigns.reduce((n, c) => n + violations(c).length, 0);

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TimelineIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Campaign Trend Analysis</Typography>
          <Chip label={`${campaigns.length} campaigns`} size="small" color="primary" variant="outlined" />
          {totalViolations > 0 && (
            <Chip label={`${totalViolations} threshold violations`} size="small" color="warning" icon={<WarningAmberIcon />} />
          )}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Operator</InputLabel>
            <Select label="Operator" value={operatorFilter} onChange={(e) => setOpFilter(e.target.value)}>
              <MenuItem value="">All Operators</MenuItem>
              {opList.map((op) => <MenuItem key={op.id} value={op.id}>{op.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Tooltip title="Export CSV">
            <IconButton size="small" onClick={handleExport}><DownloadIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Per-operator summary cards */}
      {summary.map((s) => {
        const opViolations = campaigns.filter((c) => c.operator === s.operator)
          .reduce((n, c) => n + violations(c).length, 0);
        return (
          <Box key={s.operator} mb={3}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: opColor(s.operator), flexShrink: 0 }} />
              <Typography variant="subtitle1" fontWeight={700}>{s.operator}</Typography>
              <Chip label={`${s.campaignCount} runs`} size="small" />
              <TrendBadge trend={s.trend} />
              {opViolations > 0 && (
                <Chip label={`${opViolations} violations`} size="small" color="warning" variant="outlined"
                  icon={<WarningAmberIcon />} />
              )}
            </Stack>
            <Grid container spacing={2}>
              {[
                { label: 'Avg QoS Score', value: s.avgScore, color: '#1565c0', icon: <TimelineIcon /> },
                { label: 'Best Score', value: s.bestScore?.toFixed(1), sub: `Run ${s.bestCampaign.index} · ${s.bestCampaign.label}`, color: '#2e7d32', icon: <EmojiEventsIcon /> },
                { label: 'Worst Score', value: s.worstScore?.toFixed(1), sub: `Run ${s.worstCampaign.index} · ${s.worstCampaign.label}`, color: '#c62828' },
                { label: 'Avg RSRP', value: s.avgRsrp != null ? `${s.avgRsrp} dBm` : '—', color: s.avgRsrp != null && s.avgRsrp < (thresholds?.rsrp_threshold ?? -100) ? '#c62828' : undefined },
                { label: 'Avg DL', value: s.avgDl != null ? `${s.avgDl.toLocaleString()} kbps` : '—', color: s.avgDl != null && s.avgDl < (thresholds?.dl_threshold ?? 2000) ? '#c62828' : undefined },
                { label: 'Score Range', value: `${s.worstScore?.toFixed(0)} – ${s.bestScore?.toFixed(0)}` },
              ].map((card, i) => (
                <Grid key={i} item xs={6} sm={4} md={2}>
                  <KpiCard {...card} />
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      })}

      {/* KPI chart with threshold reference line */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap" gap={1}>
            <Typography variant="subtitle1" fontWeight={600}>KPI Over Campaigns</Typography>
            <ToggleButtonGroup size="small" exclusive value={activeMetric}
              onChange={(_, v) => { if (v) setMetric(v); }}>
              {METRICS.map((m) => (
                <ToggleButton key={m.key} value={m.key} sx={{ fontSize: '0.68rem', px: 1.2, py: 0.4 }}>
                  {m.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" ml="auto">
              Orange dashed line = configured threshold
            </Typography>
          </Stack>
          <TrendChart campaigns={campaigns} metricKey={metric.key}
            metricUnit={metric.unit} fmtFn={metric.fmt} thresholds={thresholds} />
        </CardContent>
      </Card>

      {/* Campaign table with violation badges + view route button */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center" mb={2} flexWrap="wrap" gap={1}>
            <Typography variant="subtitle1" fontWeight={600}>
              All Campaign Details
            </Typography>
            <Chip
              label="All"
              size="small"
              onClick={() => setTableOp('')}
              color={tableOpFilter === '' ? 'primary' : 'default'}
              variant={tableOpFilter === '' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
            {summary.map((s, i) => (
              <Chip
                key={s.operator}
                label={s.operator}
                size="small"
                onClick={() => setTableOp(tableOpFilter === s.operator ? '' : s.operator)}
                color={tableOpFilter === s.operator ? 'primary' : 'default'}
                variant={tableOpFilter === s.operator ? 'filled' : 'outlined'}
                sx={{
                  cursor: 'pointer',
                  borderColor: opColor(s.operator, i),
                  color: tableOpFilter === s.operator ? undefined : opColor(s.operator, i),
                }}
              />
            ))}
            <Typography variant="caption" color="text.secondary" ml="auto">
              {visibleCampaigns.length} of {campaigns.length} campaigns
            </Typography>
          </Stack>
          <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover', whiteSpace: 'nowrap' } }}>
                  <TableCell>#</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Operator</TableCell>
                  <TableCell align="right">Score</TableCell>
                  <TableCell align="right">RSRP (dBm)</TableCell>
                  <TableCell align="right">SINR (dB)</TableCell>
                  <TableCell align="right">DL (kbps)</TableCell>
                  <TableCell align="right">UL (kbps)</TableCell>
                  <TableCell align="right">Coverage</TableCell>
                  <TableCell align="right">Samples</TableCell>
                  <TableCell align="center">Route</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleCampaigns.map((c) => {
                  const v = violations(c);
                  return (
                    <TableRow key={c.id} hover
                      sx={{ bgcolor: v.length > 0 ? '#fff3e022' : undefined }}>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{c.campaignIndex}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.timeLabel}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.6} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: opColor(c.operator), flexShrink: 0 }} />
                          <Typography variant="body2">{c.operator}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.3} alignItems="center" justifyContent="flex-end">
                          <ScoreCell score={c.score} />
                          {v.length > 0 && <ViolationDots violations={v} />}
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontWeight: c.avgRsrp != null && c.avgRsrp < (thresholds?.rsrp_threshold ?? -100) ? 700 : 400,
                        color: c.avgRsrp != null && c.avgRsrp < (thresholds?.rsrp_threshold ?? -100) ? '#c62828' : '#2e7d32',
                      }}>
                        {c.avgRsrp ?? '—'}
                      </TableCell>
                      <TableCell align="right" sx={{
                        color: c.avgSinr != null && c.avgSinr < (thresholds?.sinr_threshold ?? 0) ? '#c62828' : undefined,
                      }}>
                        {c.avgSinr ?? '—'}
                      </TableCell>
                      <TableCell align="right" sx={{
                        color: c.avgDl != null && c.avgDl < (thresholds?.dl_threshold ?? 2000) ? '#c62828' : undefined,
                      }}>
                        {c.avgDl != null ? c.avgDl.toLocaleString() : '—'}
                      </TableCell>
                      <TableCell align="right">{c.avgUl != null ? c.avgUl.toLocaleString() : '—'}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                          <LinearProgress variant="determinate"
                            value={Math.min(100, Number(c.coveragePct) || 0)}
                            sx={{ width: 44, height: 5, borderRadius: 3 }} />
                          <Typography variant="caption">{c.coveragePct != null ? `${c.coveragePct}%` : '—'}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{c.sampleCount.toLocaleString()}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="View route map">
                          <IconButton size="small"
                            onClick={() => { setMapTest({ id: c.id, label: `${c.operator} ${c.timeLabel}` }); setMapOpen(true); }}>
                            <MapIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {thresholds && (
            <Typography variant="caption" color="text.secondary" mt={1} display="block">
              Thresholds: RSRP ≥ {thresholds.rsrp_threshold} dBm · SINR ≥ {thresholds.sinr_threshold} dB · DL ≥ {thresholds.dl_threshold.toLocaleString()} kbps
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Route map dialog */}
      <RouteMapDialog open={mapOpen} testId={mapTest.id} testLabel={mapTest.label}
        onClose={() => setMapOpen(false)} />
    </Box>
  );
}
