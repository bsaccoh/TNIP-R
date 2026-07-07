import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Card, CardContent, Chip, FormControl, Grid, InputLabel,
  MenuItem, Select, Stack, TextField, Typography, useTheme,
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts';
import { get } from '../api/client';
import { Loading, EmptyState } from '../components/ui';

const TECH_TABS = ['2G', '3G', '4G'];

const TECH_KPIS = {
  '2G': ['CELL_AVAILABILITY', 'CSSR', 'CALL_SUCCESS_RATE', 'CALL_DROP_RATE'],
  '3G': ['CELL_AVAILABILITY', 'VOICE_CALL_SETUP_SSR', 'VOICE_CALL_SSR', 'VOICE_CALL_DROP_RATE', 'DATA_ACCESS_SSR', 'DATA_DROP_RATE_3G', 'DL_HS_THROUGHPUT'],
  '4G': ['CELL_AVAILABILITY', 'DATA_SERVICE_ACCESS_SSR', 'DATA_SERVICE_DROP_RATE', 'DL_SPEED_MBPS'],
};

const OP_COLORS = ['#4c8ef7', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#14b8a6'];

function toDateStr(d) {
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
}

function defaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: toDateStr(from), to: toDateStr(to) };
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
const STATUS_RANK = { FAIL: 0, WARN: 1, PASS: 2, 'N/A': 3 };

function worstStatus(statuses) {
  return statuses.reduce((w, s) => STATUS_RANK[s] < STATUS_RANK[w] ? s : w, 'N/A');
}

function fmtDay(d) {
  if (!d) return '';
  const [, m, day] = d.split('-');
  return `${m}/${day}`;
}

/** Merge per-operator series arrays into [{day, OpA, OpB, ...}] for recharts */
function mergeSeriesByDay(operators) {
  const dayMap = {};
  for (const op of operators) {
    for (const pt of op.series) {
      if (!dayMap[pt.day]) dayMap[pt.day] = { day: pt.day };
      dayMap[pt.day][op.operator_name] = pt.value;
    }
  }
  return Object.values(dayMap).sort((a, b) => a.day.localeCompare(b.day));
}

function KpiCard({ kpi, opColorMap }) {
  const theme = useTheme();
  const chartData = useMemo(() => mergeSeriesByDay(kpi.operators), [kpi.operators]);
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
                <Line
                  key={op.operator_name}
                  type="monotone"
                  dataKey={op.operator_name}
                  stroke={opColorMap[op.operator_name] ?? OP_COLORS[i % OP_COLORS.length]}
                  dot={false}
                  strokeWidth={1.5}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ height: 90, display: 'flex', alignItems: 'center' }}>
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

export default function PmKpiDashboard() {
  const { from: defFrom, to: defTo } = defaultDates();
  const [operators, setOperators] = useState([]);
  const [operatorId, setOperatorId] = useState('');   // '' = all operators
  const [tech, setTech] = useState('2G');
  const [from, setFrom] = useState(defFrom);
  const [to, setTo] = useState(defTo);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    get('/operators').then((r) => setOperators(r.data ?? [])).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = { technology: tech, from, to };
    if (operatorId) params.operatorId = operatorId;
    get('/kpis/pm-timeseries', params)
      .then((r) => setData(r.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [operatorId, tech, from, to]);

  useEffect(() => { load(); }, [load]);

  // Stable color map: operator_name → color
  const opColorMap = useMemo(() => {
    const map = {};
    operators.forEach((op, i) => { map[op.operator_name] = OP_COLORS[i % OP_COLORS.length]; });
    return map;
  }, [operators]);

  const visibleKpis = useMemo(() => {
    if (!data) return [];
    const keys = TECH_KPIS[tech] ?? [];
    const map = Object.fromEntries(data.map((k) => [k.kpi_key, k]));
    return keys.map((key) => map[key]).filter(Boolean);
  }, [data, tech]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={500} mb={2}>PM KPI Dashboard</Typography>

      {/* filters */}
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
        <TextField
          size="small" type="date" label="From" value={from} sx={{ width: 150 }}
          onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small" type="date" label="To" value={to} sx={{ width: 150 }}
          onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }}
        />
      </Stack>

      {/* operator color legend */}
      {operators.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={1.5} mb={2}>
          {(operatorId ? operators.filter((o) => o.operator_id === Number(operatorId)) : operators).map((op, i) => (
            <Stack key={op.operator_id} direction="row" alignItems="center" gap={0.5}>
              <Box sx={{ width: 12, height: 3, borderRadius: 2, bgcolor: opColorMap[op.operator_name] ?? OP_COLORS[i] }} />
              <Typography variant="caption" color="text.secondary">{op.operator_name}</Typography>
            </Stack>
          ))}
        </Stack>
      )}

      {/* technology tabs */}
      <Stack direction="row" gap={1} mb={2}>
        {TECH_TABS.map((t) => (
          <Chip
            key={t} label={t} clickable
            color={tech === t ? 'primary' : 'default'}
            variant={tech === t ? 'filled' : 'outlined'}
            onClick={() => setTech(t)}
          />
        ))}
      </Stack>

      {loading ? (
        <Loading />
      ) : visibleKpis.length === 0 ? (
        <EmptyState message={`No ${tech} KPI data found for the selected period`} />
      ) : (
        <Grid container spacing={2}>
          {visibleKpis.map((kpi) => (
            <Grid item xs={12} sm={6} key={kpi.kpi_key}>
              <KpiCard kpi={kpi} opColorMap={opColorMap} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
