import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, AlertTitle, Box, Button, Card, CardContent, Chip, FormControl, Grid,
  InputLabel, LinearProgress, MenuItem, Select, Stack, TextField, Typography,
  useTheme, Paper, ToggleButton, ToggleButtonGroup, Divider, IconButton, CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LanIcon from '@mui/icons-material/Lan';
import RouterIcon from '@mui/icons-material/Router';
import SpeedIcon from '@mui/icons-material/Speed';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LinkIcon from '@mui/icons-material/Link';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BarChartIcon from '@mui/icons-material/BarChart';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Tooltip as MapTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { get } from '../api/client';
import { Loading, EmptyState } from '../components/ui';
import { useColorMode } from '../theme/ColorMode';

const OP_COLORS = ['#f97316', '#4c8ef7', '#22c55e', '#a855f7'];
const SEV_COLOR = { CRITICAL: 'error', MAJOR: 'warning', MINOR: 'info' };
const SEV_ICON  = { CRITICAL: 'error', MAJOR: 'warning', MINOR: 'info' };

// Map constants
const SL_CENTER = [8.4, -11.8];
const SL_ZOOM   = 7;
const STATUS_CHIP = { ACTIVE: 'success', DEGRADED: 'warning', DOWN: 'error' };
const NODE_RADIUS = { CORE: 10, HUB: 7, OLT: 5, AGGREGATION: 6, POP: 6 };
const LINK_WEIGHT = { BACKBONE: 3.5, METRO: 2.5, ACCESS: 1.5, CROSS_CONNECT: 2 };
const LINK_DASH   = { BACKBONE: null, METRO: null, ACCESS: null, CROSS_CONNECT: '8 4' };

function toDateStr(d) {
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
}
function defaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: toDateStr(from), to: toDateStr(to) };
}
function fmtDay(d) {
  if (!d) return '';
  const [, m, day] = d.split('-');
  return `${m}/${day}`;
}
function timeAgo(dt) {
  const d = new Date(dt);
  const h = Math.round((Date.now() - d.getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
function utilColor(pct) {
  const p = Number(pct ?? 0);
  if (p >= 80) return '#ef4444';
  if (p >= 60) return '#f97316';
  if (p >= 40) return '#eab308';
  return '#22c55e';
}

function getStatus(value, threshold) {
  if (!threshold || value == null) return 'N/A';
  const req = Number(threshold.required_value);
  if (threshold.comparator === '>=' || threshold.comparator === '>') {
    if (value >= req) return 'PASS';
    if (value >= req * 0.95) return 'WARN';
    return 'FAIL';
  }
  if (value <= req) return 'PASS';
  if (value <= req * 1.1) return 'WARN';
  return 'FAIL';
}

const STATUS_COLOR = { PASS: 'success', WARN: 'warning', FAIL: 'error', 'N/A': 'default' };
const STATUS_RANK  = { FAIL: 0, WARN: 1, PASS: 2, 'N/A': 3 };
function worstStatus(statuses) {
  return statuses.reduce((w, s) => STATUS_RANK[s] < STATUS_RANK[w] ? s : w, 'N/A');
}

function mergeByDay(operators) {
  const map = {};
  for (const op of operators) {
    for (const pt of op.series) {
      if (!map[pt.day]) map[pt.day] = { day: pt.day };
      map[pt.day][op.operator_name] = pt.value;
    }
  }
  return Object.values(map).sort((a, b) => a.day.localeCompare(b.day));
}

function StatCard({ icon, label, value, color, sub }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 140 }}>
      <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
        <Box sx={{ color: color ?? 'primary.main' }}>{icon}</Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </Stack>
      <Typography variant="h5" fontWeight={500}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.disabled">{sub}</Typography>}
    </Paper>
  );
}

function LinkHealthBar({ linkHealth }) {
  if (!linkHealth?.length) return null;
  const byStatus = {};
  for (const r of linkHealth) byStatus[r.status] = r;
  const active   = Number(byStatus.ACTIVE?.cnt ?? 0);
  const degraded = Number(byStatus.DEGRADED?.cnt ?? 0);
  const down     = Number(byStatus.DOWN?.cnt ?? 0);
  const total    = active + degraded + down;
  if (!total) return null;

  const avgUtil = linkHealth.reduce((s, r) => s + Number(r.avg_util ?? 0) * Number(r.cnt), 0) / total;
  const totalKm = linkHealth.reduce((s, r) => s + Number(r.total_km ?? 0), 0);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2.5 }}>
      <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
        <LinkIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" fontWeight={600}>Backbone Link Health</Typography>
        <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
          {total} links · {totalKm.toLocaleString()} km
        </Typography>
      </Stack>

      <Stack direction="row" gap={0.5} mb={1} sx={{ height: 8, borderRadius: 1, overflow: 'hidden' }}>
        {active > 0 && <Box sx={{ flex: active, bgcolor: 'success.main', borderRadius: 0.5 }} />}
        {degraded > 0 && <Box sx={{ flex: degraded, bgcolor: 'warning.main', borderRadius: 0.5 }} />}
        {down > 0 && <Box sx={{ flex: down, bgcolor: 'error.main', borderRadius: 0.5 }} />}
      </Stack>

      <Stack direction="row" gap={3}>
        <Stack direction="row" alignItems="center" gap={0.5}>
          <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
          <Typography variant="caption" fontWeight={600} color="success.main">{active} Active</Typography>
        </Stack>
        {degraded > 0 && (
          <Stack direction="row" alignItems="center" gap={0.5}>
            <ReportProblemIcon sx={{ fontSize: 14, color: 'warning.main' }} />
            <Typography variant="caption" fontWeight={600} color="warning.main">{degraded} Degraded</Typography>
          </Stack>
        )}
        {down > 0 && (
          <Stack direction="row" alignItems="center" gap={0.5}>
            <ReportProblemIcon sx={{ fontSize: 14, color: 'error.main' }} />
            <Typography variant="caption" fontWeight={600} color="error.main">{down} Down</Typography>
          </Stack>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          Avg utilization: <strong>{avgUtil.toFixed(1)}%</strong>
        </Typography>
      </Stack>
    </Paper>
  );
}

function OutageAlerts({ outages }) {
  const active = outages?.filter((o) => o.status !== 'RESOLVED') ?? [];
  if (!active.length) return null;

  return (
    <Box sx={{ mb: 2.5 }}>
      <Stack direction="row" alignItems="center" gap={1} mb={1}>
        <ReportProblemIcon fontSize="small" color="warning" />
        <Typography variant="subtitle2" fontWeight={600}>Active Incidents ({active.length})</Typography>
      </Stack>
      <Stack gap={1}>
        {active.map((o) => (
          <Alert key={o.outage_id} severity={SEV_ICON[o.severity]} variant="outlined"
            sx={{ '& .MuiAlert-message': { width: '100%' } }}>
            <AlertTitle sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              {o.title}
              <Chip label={o.status} size="small" sx={{ height: 18, fontSize: 10, ml: 'auto' }}
                color={o.status === 'ACTIVE' ? 'error' : 'warning'} />
            </AlertTitle>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              {o.description}
            </Typography>
            <Stack direction="row" gap={2}>
              <Typography variant="caption" color="text.disabled">
                {o.operator_name} · {o.city_a}→{o.city_b} · {o.affected_km} km
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                Started {timeAgo(o.started_at)}
              </Typography>
            </Stack>
          </Alert>
        ))}
      </Stack>
    </Box>
  );
}

function KpiCard({ kpi, opColorMap }) {
  const theme = useTheme();
  const chartData = useMemo(() => mergeByDay(kpi.operators), [kpi.operators]);
  const threshVal = kpi.threshold ? Number(kpi.threshold.required_value) : null;

  const opStatuses = kpi.operators.map((op) => {
    const last = op.series.length ? op.series[op.series.length - 1].value : null;
    return { name: op.operator_name, value: last, status: getStatus(last, kpi.threshold) };
  });
  const worst = worstStatus(opStatuses.map((s) => s.status));

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ p: '20px !important', pb: '16px !important' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="body1" color="text.secondary" fontWeight={500} lineHeight={1.3} sx={{ maxWidth: '72%' }}>
            {kpi.kpi_name}
          </Typography>
          <Chip label={worst} size="small" color={STATUS_COLOR[worst]} sx={{ height: 22, fontSize: 12, fontWeight: 600 }} />
        </Stack>

        {/* per-operator latest values */}
        <Stack direction="row" flexWrap="wrap" gap={1} mb={1.5}>
          {opStatuses.map((op, i) => (
            <Box key={op.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: opColorMap[op.name] ?? OP_COLORS[i] }} />
              <Typography variant="body2" color="text.secondary" lineHeight={1}>
                {op.name}:&nbsp;
              </Typography>
              <Typography variant="body2" fontWeight={600} color={theme.palette[STATUS_COLOR[op.status]]?.main ?? 'text.primary'}>
                {op.value != null ? `${Number(op.value).toFixed(1)}${kpi.unit}` : '—'}
              </Typography>
            </Box>
          ))}
        </Stack>

        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={42} />
              <Tooltip
                formatter={(v, name) => [`${Number(v).toFixed(2)} ${kpi.unit}`, name]}
                labelFormatter={fmtDay}
                contentStyle={{ fontSize: 11 }}
              />
              {threshVal != null && (
                <ReferenceLine y={threshVal} stroke={theme.palette.error.main} strokeDasharray="4 3" strokeWidth={1} />
              )}
              {kpi.operators.map((op, i) => (
                <Line key={op.operator_name} type="monotone" dataKey={op.operator_name}
                  stroke={opColorMap[op.operator_name] ?? OP_COLORS[i % OP_COLORS.length]}
                  dot={false} strokeWidth={1.5} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ height: 130, display: 'flex', alignItems: 'center' }}>
            <Typography variant="caption" color="text.disabled">Not enough data</Typography>
          </Box>
        )}

        {kpi.threshold && (
          <Typography variant="caption" color="text.disabled" display="block" mt={0.5}>
            Threshold: {kpi.threshold.comparator} {Number(kpi.threshold.required_value).toFixed(1)} {kpi.unit}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function FiberDashboard() {
  const { mode } = useColorMode();
  const { from: defFrom, to: defTo } = defaultDates();
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'map'
  const [operators, setOperators] = useState([]);
  const [operatorId, setOperatorId] = useState('');
  const [from, setFrom]       = useState(defFrom);
  const [to, setTo]           = useState(defTo);
  const [kpis, setKpis]       = useState(null);
  const [summary, setSummary]  = useState(null);
  const [outages, setOutages]  = useState([]);
  const [loading, setLoading]  = useState(false);

  // Topology state
  const [topology, setTopology] = useState(null);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [mapColorMode, setMapColorMode] = useState('operator');
  const [selectedMapItem, setSelectedMapItem] = useState(null);

  useEffect(() => {
    get('/operators').then((r) => setOperators(r.data ?? [])).catch(() => {});
    get('/fiber/outages').then((r) => setOutages(r.data ?? [])).catch(() => {});
    get('/fiber/topology').then((r) => setTopology(r.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = { from, to };
    if (operatorId) params.operatorId = operatorId;
    Promise.all([
      get('/fiber/timeseries', params),
      get('/fiber/summary', operatorId ? { operatorId } : {}),
    ])
      .then(([ts, sum]) => { setKpis(ts.data ?? []); setSummary(sum.data); })
      .catch(() => { setKpis([]); })
      .finally(() => setLoading(false));
  }, [operatorId, from, to]);

  useEffect(() => { load(); }, [load]);

  const opColorMap = useMemo(() => {
    const map = {};
    operators.forEach((op, i) => { map[op.operator_name] = OP_COLORS[i % OP_COLORS.length]; });
    return map;
  }, [operators]);

  // Topology Map Specific filtering (mirrors topology filters but keeps operator bound)
  const filteredNodes = useMemo(() => {
    if (!topology) return [];
    return topology.nodes.filter((n) =>
      (!operatorId || n.operator_id === Number(operatorId)) && n.lat != null
    );
  }, [topology, operatorId]);

  const filteredLinks = useMemo(() => {
    if (!topology) return [];
    return topology.links.filter((l) =>
      (!operatorId || l.operator_id === Number(operatorId)) &&
      (typeFilter === 'ALL' || l.link_type === typeFilter) &&
      (statusFilter === 'ALL' || l.status === statusFilter) &&
      l.lat_a != null && l.lat_b != null
    );
  }, [topology, operatorId, typeFilter, statusFilter]);

  const mapStats = useMemo(() => {
    if (!topology) return {};
    const links = operatorId ? filteredLinks : topology.links;
    return {
      nodes: filteredNodes.length,
      links: filteredLinks.length,
      active:   links.filter((l) => l.status === 'ACTIVE').length,
      degraded: links.filter((l) => l.status === 'DEGRADED').length,
      down:     links.filter((l) => l.status === 'DOWN').length,
      km:       Math.round(links.reduce((s, l) => s + Number(l.distance_km || 0), 0)),
      avgUtil:  links.length ? (links.reduce((s, l) => s + Number(l.utilization_pct || 0), 0) / links.length).toFixed(1) : '0',
    };
  }, [topology, filteredNodes, filteredLinks, operatorId, typeFilter, statusFilter]);

  const visibleOps = operatorId
    ? operators.filter((o) => o.operator_id === Number(operatorId))
    : operators;

  const tileUrl = mode === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const activeOutages = outages.filter((o) => o.status !== 'RESOLVED');

  return (
    <Box sx={{ p: 3 }}>
      {/* Header view toggle */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
        <Stack direction="row" alignItems="center" gap={1}>
          <LanIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Fiber Network Control Center</Typography>
        </Stack>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_, v) => v && setView(v)}
          size="small"
          sx={{ height: 36, bgcolor: 'rgba(255,255,255,0.05)' }}
        >
          <ToggleButton value="dashboard" sx={{ px: 2.5, fontWeight: 600 }}>KPI Dashboard</ToggleButton>
          <ToggleButton value="map" sx={{ px: 2.5, fontWeight: 600 }}>Topology Map</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Global filter block */}
      <Stack direction="row" flexWrap="wrap" gap={2} mb={3} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Operator</InputLabel>
          <Select value={operatorId} label="Operator" onChange={(e) => setOperatorId(e.target.value)}>
            <MenuItem value="">All Operators</MenuItem>
            {operators.map((o) => (
              <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {view === 'dashboard' && (
          <>
            <TextField size="small" type="date" label="From" value={from} sx={{ width: 150 }}
              onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="date" label="To" value={to} sx={{ width: 150 }}
              onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          </>
        )}
      </Stack>

      {/* ── DASHBOARD VIEW ── */}
      {view === 'dashboard' && (
        <Box>
          <OutageAlerts outages={outages} />

          {summary && (
            <>
              <Stack direction="row" flexWrap="wrap" gap={1.5} mb={2}>
                <StatCard icon={<RouterIcon />} label="OLT Nodes" value={summary.nodes?.olt_count ?? '—'} />
                <StatCard icon={<LanIcon />} label="Total Nodes" value={summary.nodes?.total ?? '—'} />
                <StatCard icon={<SignalCellularAltIcon />} label="Avg Availability"
                  value={`${(summary.latest?.find(r => r.kpi_key === 'FIBER_AVAILABILITY')?.avg_value ?? 0).toFixed(1)}%`}
                  color="success.main" />
                <StatCard icon={<SpeedIcon />} label="Avg DL Throughput"
                  value={`${(summary.latest?.find(r => r.kpi_key === 'FIBER_DL_THROUGHPUT')?.avg_value ?? 0).toFixed(1)} Mbps`}
                  color="info.main" />
              </Stack>

              <LinkHealthBar linkHealth={summary.linkHealth} />
            </>
          )}

          {visibleOps.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={1.5} mb={2}>
              {visibleOps.map((op, i) => (
                <Stack key={op.operator_id} direction="row" alignItems="center" gap={0.5}>
                  <Box sx={{ width: 12, height: 3, borderRadius: 2, bgcolor: opColorMap[op.operator_name] ?? OP_COLORS[i] }} />
                  <Typography variant="caption" color="text.secondary">{op.operator_name}</Typography>
                </Stack>
              ))}
            </Stack>
          )}

          {loading ? (
            <Loading />
          ) : !kpis?.length ? (
            <EmptyState message="No fiber KPI data found for the selected period" />
          ) : (
            <Grid container spacing={2}>
              {kpis.map((kpi) => (
                <Grid item xs={12} sm={6} key={kpi.kpi_key}>
                  <KpiCard kpi={kpi} opColorMap={opColorMap} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* ── TOPOLOGY MAP VIEW ── */}
      {view === 'map' && (
        <Box sx={{ display: 'flex', height: 600, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2 }}>
          {/* Map Sidebar */}
          <Box sx={{ width: 280, flexShrink: 0, overflowY: 'auto', p: 2, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Stack direction="row" alignItems="center" gap={1} mb={2}>
              <AccountTreeIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700}>Backbone Infrastructure</Typography>
            </Stack>

            {/* Sidebar Stats */}
            <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5, mb: 2.5 }}>
              {[
                { label: 'Nodes shown',     value: mapStats.nodes },
                { label: 'Links shown',     value: mapStats.links },
                { label: 'Active Links',    value: mapStats.active,   color: 'success.main' },
                { label: 'Degraded Links',  value: mapStats.degraded, color: 'warning.main' },
                { label: 'Down Links',      value: mapStats.down,     color: 'error.main' },
                { label: 'Total Route',     value: `${mapStats.km?.toLocaleString()} km` },
                { label: 'Avg Utilization', value: `${mapStats.avgUtil}%` },
              ].map((s) => (
                <Stack key={s.label} direction="row" justifyContent="space-between" alignItems="center" py={0.4}>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  <Typography variant="caption" fontWeight={700} color={s.color ?? 'text.primary'}>{s.value}</Typography>
                </Stack>
              ))}
            </Box>

            {/* Active outages list */}
            {activeOutages.length > 0 && (
              <>
                <Stack direction="row" alignItems="center" gap={0.5} mb={1}>
                  <ReportProblemIcon sx={{ fontSize: 14, color: 'error.main' }} />
                  <Typography variant="caption" fontWeight={700} color="error.main">
                    {activeOutages.length} Active Incident{activeOutages.length > 1 ? 's' : ''}
                  </Typography>
                </Stack>
                <Stack gap={1} mb={2.5}>
                  {activeOutages.slice(0, 3).map((o) => (
                    <Box key={o.outage_id} sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1, borderLeft: 3,
                      borderColor: o.severity === 'CRITICAL' ? 'error.main' : o.severity === 'MAJOR' ? 'warning.main' : 'info.main' }}>
                      <Typography variant="caption" fontWeight={600} display="block" lineHeight={1.2}>{o.title}</Typography>
                      <Typography variant="caption" color="text.disabled">{o.operator_name} · {timeAgo(o.started_at)}</Typography>
                    </Box>
                  ))}
                </Stack>
              </>
            )}

            <Divider sx={{ mb: 2 }} />

            {/* Local Map Filters */}
            <Typography variant="caption" color="text.disabled" fontWeight={700} display="block" mb={1} letterSpacing={0.5}>MAP FILTERS</Typography>
            <Stack gap={1.5} mb={2.5}>
              <FormControl size="small" fullWidth>
                <InputLabel>Link Type</InputLabel>
                <Select value={typeFilter} label="Link Type" onChange={(e) => setTypeFilter(e.target.value)}>
                  {['ALL','BACKBONE','METRO','ACCESS','CROSS_CONNECT'].map((t) => (
                    <MenuItem key={t} value={t}>{t === 'ALL' ? 'All Types' : t.replace('_', ' ')}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Link Status</InputLabel>
                <Select value={statusFilter} label="Link Status" onChange={(e) => setStatusFilter(e.target.value)}>
                  {['ALL','ACTIVE','DEGRADED','DOWN'].map((s) => (
                    <MenuItem key={s} value={s}>{s === 'ALL' ? 'All Status' : s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {/* Link coloring */}
            <Typography variant="caption" color="text.disabled" fontWeight={700} display="block" mb={1} letterSpacing={0.5}>LINK COLORING</Typography>
            <ToggleButtonGroup value={mapColorMode} exclusive onChange={(_, v) => v && setMapColorMode(v)} size="small" fullWidth>
              <ToggleButton value="operator" sx={{ fontSize: 11, textTransform: 'none' }}>By Operator</ToggleButton>
              <ToggleButton value="utilization" sx={{ fontSize: 11, textTransform: 'none' }}>By Utilization</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Leaflet Map Content */}
          <Box sx={{ flex: 1, position: 'relative' }}>
            {topology?.nodes?.length ? (
              <MapContainer center={SL_CENTER} zoom={SL_ZOOM} style={{ width: '100%', height: '100%' }}>
                <TileLayer url={tileUrl} attribution="&copy; CartoDB" />

                {/* Render Links */}
                {filteredLinks.map((link) => {
                  const opColor = opColorMap[link.operator_name]?.color ?? '#64748b';
                  let lineColor;
                  if (link.status === 'DOWN') lineColor = '#ef4444';
                  else if (link.status === 'DEGRADED') lineColor = '#f97316';
                  else lineColor = mapColorMode === 'utilization' ? utilColor(link.utilization_pct) : opColor;

                  return (
                    <Polyline
                      key={link.link_id}
                      positions={[[Number(link.lat_a), Number(link.lng_a)], [Number(link.lat_b), Number(link.lng_b)]]}
                      pathOptions={{
                        color:     lineColor,
                        weight:    LINK_WEIGHT[link.link_type] ?? 2,
                        opacity:   link.status === 'DOWN' ? 0.4 : 0.8,
                        dashArray: link.status === 'DOWN' ? '6 6' : LINK_DASH[link.link_type],
                      }}
                      eventHandlers={{ click: () => setSelectedMapItem({ type: 'link', data: link }) }}
                    >
                      <MapTooltip direction="center" opacity={0.9}>
                        <span style={{ fontSize: 11 }}>
                          {link.city_a}→{link.city_b} · {link.utilization_pct}% · {link.status}
                        </span>
                      </MapTooltip>
                    </Polyline>
                  );
                })}

                {/* Render Nodes */}
                {filteredNodes.map((node) => {
                  const opColor = opColorMap[node.operator_name]?.color ?? '#64748b';
                  const radius  = NODE_RADIUS[node.node_type] ?? 5;
                  return (
                    <CircleMarker
                      key={node.node_id}
                      center={[Number(node.lat), Number(node.lng)]}
                      radius={radius}
                      pathOptions={{ color: '#fff', weight: 1.5, fillColor: opColor, fillOpacity: 0.92 }}
                      eventHandlers={{ click: () => setSelectedMapItem({ type: 'node', data: node }) }}
                    >
                      <MapTooltip direction="top" offset={[0, -radius]} opacity={0.95} permanent={node.node_type === 'CORE'}>
                        <span style={{ fontSize: 10, fontWeight: node.node_type === 'CORE' ? 700 : 500 }}>
                          {node.city}
                        </span>
                      </MapTooltip>
                      <Popup>
                        <strong>{node.node_name}</strong><br />
                        {node.city} · {node.node_type}<br />
                        {node.operator_name} · {node.vendor || '—'}
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            ) : (
              <Box display="grid" sx={{ placeItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            )}

            {/* Selected item overlay card */}
            {selectedMapItem && (
              <Box sx={{ position: 'absolute', bottom: 12, right: 12, zIndex: 1000, width: 280 }}>
                <Card sx={{ bgcolor: 'background.paper', boxShadow: 3, border: 1, borderColor: 'divider' }}>
                  <CardContent sx={{ p: '14px !important' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="body2" fontWeight={700}>
                        {selectedMapItem.type === 'node' ? 'Node Detail' : 'Link Detail'}
                      </Typography>
                      <IconButton size="small" onClick={() => setSelectedMapItem(null)} sx={{ p: 0 }}>
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                    
                    {selectedMapItem.type === 'node' ? (
                      <Stack gap={0.5}>
                        <Typography variant="body2" fontWeight={700} color="primary">{selectedMapItem.data.node_name}</Typography>
                        <Typography variant="caption">{selectedMapItem.data.city} · {selectedMapItem.data.location}</Typography>
                        <Stack direction="row" gap={0.5} flexWrap="wrap" mt={0.5}>
                          <Chip label={selectedMapItem.data.node_type} size="small" sx={{ height: 18, fontSize: 10 }} />
                          <Chip label={selectedMapItem.data.operator_name} size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />
                        </Stack>
                        <Typography variant="caption" color="text.disabled" mt={0.5}>Vendor: {selectedMapItem.data.vendor || '—'}</Typography>
                      </Stack>
                    ) : (
                      <Stack gap={0.5}>
                        <Typography variant="body2" fontWeight={700} color="primary">
                          {selectedMapItem.data.city_a} → {selectedMapItem.data.city_b}
                        </Typography>
                        <Typography variant="caption">{selectedMapItem.data.node_a_name} ↔ {selectedMapItem.data.node_b_name}</Typography>
                        <Stack direction="row" gap={0.5} flexWrap="wrap" mt={0.5}>
                          <Chip label={selectedMapItem.data.link_type.replace('_', ' ')} size="small" sx={{ height: 18, fontSize: 10 }} />
                          <Chip label={selectedMapItem.data.status} size="small" color={STATUS_CHIP[selectedMapItem.data.status] ?? 'default'} sx={{ height: 18, fontSize: 10 }} />
                        </Stack>
                        <Stack gap={0.25} mt={1}>
                          {[
                            ['Operator',    selectedMapItem.data.operator_name],
                            ['Distance',    `${selectedMapItem.data.distance_km} km`],
                            ['Capacity',    `${selectedMapItem.data.capacity_gbps} Gbps`],
                            ['Utilization', `${selectedMapItem.data.utilization_pct}%`],
                          ].map(([k, v]) => (
                            <Stack key={k} direction="row" justifyContent="space-between">
                              <Typography variant="caption" color="text.secondary">{k}</Typography>
                              <Typography variant="caption" fontWeight={600}>{v}</Typography>
                            </Stack>
                          ))}
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(Number(selectedMapItem.data.utilization_pct), 100)}
                          sx={{
                            mt: 1, height: 6, borderRadius: 1, bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': { bgcolor: utilColor(selectedMapItem.data.utilization_pct), borderRadius: 1 },
                          }}
                        />
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
