import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, AlertTitle, Box, Button, Card, CardContent, Chip, FormControl, Grid,
  InputLabel, LinearProgress, MenuItem, Select, Stack, TextField, Typography,
  useTheme, Paper,
} from '@mui/material';
import LanIcon from '@mui/icons-material/Lan';
import RouterIcon from '@mui/icons-material/Router';
import SpeedIcon from '@mui/icons-material/Speed';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LinkIcon from '@mui/icons-material/Link';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { get } from '../api/client';
import { Loading, EmptyState } from '../components/ui';

const OP_COLORS = ['#f97316', '#4c8ef7', '#22c55e', '#a855f7'];
const SEV_COLOR = { CRITICAL: 'error', MAJOR: 'warning', MINOR: 'info' };
const SEV_ICON  = { CRITICAL: 'error', MAJOR: 'warning', MINOR: 'info' };

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

        <Stack direction="row" flexWrap="wrap" gap={1} mb={1.5}>
          {opStatuses.map((op, i) => (
            <Box key={op.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: opColorMap[op.name] ?? OP_COLORS[i] }} />
              <Typography variant="body2" color="text.secondary">{op.name}:&nbsp;</Typography>
              <Typography variant="body2" fontWeight={600}
                color={theme.palette[STATUS_COLOR[op.status]]?.main ?? 'text.primary'}>
                {op.value != null ? `${Number(op.value).toFixed(2)}${kpi.unit}` : '—'}
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
  const navigate = useNavigate();
  const { from: defFrom, to: defTo } = defaultDates();
  const [operators, setOperators] = useState([]);
  const [operatorId, setOperatorId] = useState('');
  const [from, setFrom]       = useState(defFrom);
  const [to, setTo]           = useState(defTo);
  const [kpis, setKpis]       = useState(null);
  const [summary, setSummary]  = useState(null);
  const [outages, setOutages]  = useState([]);
  const [loading, setLoading]  = useState(false);

  useEffect(() => {
    get('/operators').then((r) => setOperators(r.data ?? [])).catch(() => {});
    get('/fiber/outages').then((r) => setOutages(r.data ?? [])).catch(() => {});
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

  const visibleOps = operatorId
    ? operators.filter((o) => o.operator_id === Number(operatorId))
    : operators;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with link to topology map */}
      <Stack direction="row" alignItems="center" gap={1} mb={2}>
        <LanIcon color="primary" />
        <Typography variant="h5" fontWeight={500}>Fiber Performance Monitoring</Typography>
        <Button
          size="small" variant="outlined" startIcon={<AccountTreeIcon />}
          onClick={() => navigate('/fiber-topology')}
          sx={{ ml: 'auto', textTransform: 'none' }}
        >
          Backbone Map
        </Button>
      </Stack>

      {/* Outage alerts */}
      <OutageAlerts outages={outages} />

      {/* Filters */}
      <Stack direction="row" flexWrap="wrap" gap={2} mb={2} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Operator</InputLabel>
          <Select value={operatorId} label="Operator" onChange={(e) => setOperatorId(e.target.value)}>
            <MenuItem value="">All Operators</MenuItem>
            {operators.map((o) => (
              <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField size="small" type="date" label="From" value={from} sx={{ width: 150 }}
          onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="To" value={to} sx={{ width: 150 }}
          onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Stack>

      {/* Summary stats */}
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

          {/* Link health bar */}
          <LinkHealthBar linkHealth={summary.linkHealth} />
        </>
      )}

      {/* Operator legend */}
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
  );
}
