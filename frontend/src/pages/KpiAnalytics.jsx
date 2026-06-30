import { useEffect, useState, useMemo } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Table, TableHead, TableBody, TableRow,
  TableCell, Chip, Stack, FormControl, InputLabel, Select, MenuItem, ToggleButtonGroup,
  ToggleButton, useTheme, Button, TablePagination,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, CartesianGrid,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import DownloadIcon from '@mui/icons-material/Download';
import { get } from '../api/client';
import { Loading, EmptyState, StatusChip, fmt, useChartTip } from '../components/ui';
import { colorFor, OPERATOR_COLORS } from '../theme';
import { exportCsv } from '../utils/csv';

const STATUS_BG = { PASS: '#2e9e5b', WARNING: '#e6a700', FAIL: '#e0413b' };

export default function KpiAnalytics() {
  const [data, setData] = useState(null);
  const [selectedOp, setSelectedOp] = useState('ALL');
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [view, setView] = useState('table');
  const [page, setPage] = useState(0);
  const [kpiDefs, setKpiDefs] = useState([]);
  const [trendKpiKey, setTrendKpiKey] = useState('');
  const [trendOp, setTrendOp] = useState('');
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const tip = useChartTip();
  const theme = useTheme();
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    get('/kpis/analytics').then((r) => setData(r.data)).catch(() => setData([]));
    get('/kpis/definitions').then((r) => setKpiDefs(r.data || [])).catch(() => {});
  }, []);

  const operators = useMemo(() => {
    if (!data?.length) return [];
    return [...new Map(data.map((r) => [r.operator_id, r.operator_name])).entries()]
      .map(([id, name]) => ({ id, name }));
  }, [data]);

  const kpiKeys = useMemo(() => {
    if (!data?.length) return [];
    return [...new Set(data.map((r) => r.kpi_key))];
  }, [data]);

  const filtered = useMemo(() => {
    if (!data?.length) return [];
    let rows = data;
    if (selectedOp !== 'ALL') rows = rows.filter((r) => r.operator_id === Number(selectedOp));
    return rows;
  }, [data, selectedOp]);

  // Build comparison bar chart data: one group per KPI, one bar per operator
  const compBarData = useMemo(() => {
    if (!data?.length) return [];
    return kpiKeys.map((kpi) => {
      const row = { kpi: data.find((r) => r.kpi_key === kpi)?.kpi_name?.replace(/\(DEMO\)/g, '').trim() || kpi };
      operators.forEach((op) => {
        const match = data.find((r) => r.kpi_key === kpi && r.operator_id === op.id);
        row[op.name] = match ? Number(Number(match.avg_value).toFixed(2)) : null;
      });
      return row;
    });
  }, [data, kpiKeys, operators]);

  // Radar data for percentage KPIs
  const radarData = useMemo(() => {
    if (!data?.length) return [];
    return kpiKeys
      .filter((k) => (data.find((r) => r.kpi_key === k)?.unit || '') === '%')
      .map((k) => {
        const row = { kpi: data.find((r) => r.kpi_key === k)?.kpi_name?.replace(/\(DEMO\)/g, '').trim() || k };
        operators.forEach((op) => {
          const match = data.find((r) => r.kpi_key === k && r.operator_id === op.id);
          row[op.name] = match ? Number(Number(match.avg_value).toFixed(2)) : 0;
        });
        return row;
      });
  }, [data, kpiKeys, operators]);

  // Min/Max range bar data for selected operator
  const rangeData = useMemo(() => {
    const rows = selectedOp !== 'ALL' ? filtered : data || [];
    return kpiKeys.map((k) => {
      const match = rows.find((r) => r.kpi_key === k);
      if (!match) return null;
      return {
        kpi: match.kpi_name?.replace(/\(DEMO\)/g, '').trim() || k,
        avg: Number(Number(match.avg_value).toFixed(2)),
        min: Number(Number(match.min_value).toFixed(2)),
        max: Number(Number(match.max_value).toFixed(2)),
        threshold: match.required_value ? Number(match.required_value) : null,
      };
    }).filter(Boolean);
  }, [filtered, data, kpiKeys, selectedOp]);

  // Auto-select first KPI and operator when entering trend view
  useEffect(() => {
    if (view === 'trend' && kpiDefs.length && !trendKpiKey) {
      setTrendKpiKey(kpiDefs[0]?.kpi_key || '');
    }
  }, [view, kpiDefs]);

  useEffect(() => {
    if (view === 'trend' && operators.length && !trendOp) {
      setTrendOp(String(operators[0]?.id || ''));
    }
  }, [view, operators]);

  useEffect(() => {
    if (view !== 'trend' || !trendKpiKey || !trendOp) return;
    const kpiDef = kpiDefs.find((k) => k.kpi_key === trendKpiKey);
    if (!kpiDef) return;
    setForecastLoading(true);
    setForecast(null);
    get('/kpis/forecast', { operatorId: trendOp, kpiId: kpiDef.kpi_id, days: 30 })
      .then((r) => setForecast(r.data))
      .catch(() => setForecast({ historical: [], forecast: [], insufficient: true }))
      .finally(() => setForecastLoading(false));
  }, [view, trendKpiKey, trendOp, kpiDefs]);

  if (!data) return <Loading height={400} />;
  if (!data.length) return <EmptyState message="No KPI data yet." hint="Upload PM data and ensure KPI formulas are configured." />;

  return (
    <Box>
      {/* Filters */}
      <Stack direction="row" spacing={2} mb={3} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="h6" sx={{ mr: 'auto' }}>KPI Analytics by Operator</Typography>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Operator</InputLabel>
          <Select label="Operator" value={selectedOp} onChange={(e) => setSelectedOp(e.target.value)}>
            <MenuItem value="ALL">All Operators</MenuItem>
            {operators.map((op) => (
              <MenuItem key={op.id} value={String(op.id)}>{op.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button size="small" startIcon={<DownloadIcon />} disabled={!filtered?.length}
          onClick={() => exportCsv('kpi_analytics.csv', [
            { key: 'operator_name', label: 'Operator' }, { key: 'kpi_key', label: 'KPI Key' },
            { key: 'kpi_name', label: 'KPI Name' }, { key: 'value', label: 'Value' },
            { key: 'unit', label: 'Unit' }, { key: 'compliance_status', label: 'Status' },
          ], filtered)}>Export</Button>
        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
          <ToggleButton value="table">Table</ToggleButton>
          <ToggleButton value="bar">Bar Chart</ToggleButton>
          <ToggleButton value="radar">Radar</ToggleButton>
          <ToggleButton value="trend">Forecast</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Summary cards */}
      <Grid container spacing={2} mb={3}>
        {operators.map((op) => {
          const opRows = data.filter((r) => r.operator_id === op.id);
          const pass = opRows.filter((r) => r.compliance_status === 'PASS').length;
          const warn = opRows.filter((r) => r.compliance_status === 'WARNING').length;
          const fail = opRows.filter((r) => r.compliance_status === 'FAIL').length;
          const totalCells = opRows.reduce((s, r) => s + (r.cell_count || 0), 0);
          return (
            <Grid item xs={12} sm={6} md={3} key={op.id}>
              <Card sx={{
                borderLeft: 4,
                borderColor: colorFor(op.name),
                cursor: 'pointer',
                bgcolor: selectedOp === String(op.id) ? 'action.selected' : undefined,
              }} onClick={() => setSelectedOp(selectedOp === String(op.id) ? 'ALL' : String(op.id))}>
                <CardContent sx={{ pb: '12px !important' }}>
                  <Typography variant="subtitle2" gutterBottom>{op.name}</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={`${opRows.length} KPIs`} />
                    {pass > 0 && <Chip size="small" label={`${pass} Pass`} sx={{ bgcolor: STATUS_BG.PASS + '22', color: STATUS_BG.PASS }} />}
                    {warn > 0 && <Chip size="small" label={`${warn} Warn`} sx={{ bgcolor: STATUS_BG.WARNING + '22', color: STATUS_BG.WARNING }} />}
                    {fail > 0 && <Chip size="small" label={`${fail} Fail`} sx={{ bgcolor: STATUS_BG.FAIL + '22', color: STATUS_BG.FAIL }} />}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Main view */}
      {view === 'table' && (
        <Card>
          <CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Operator</TableCell>
                    <TableCell>KPI</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Tech</TableCell>
                    <TableCell align="right">Average</TableCell>
                    <TableCell align="right">Min</TableCell>
                    <TableCell align="right">Max</TableCell>
                    <TableCell align="right">Std Dev</TableCell>
                    <TableCell align="right">Cells</TableCell>
                    <TableCell align="right">Threshold</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.slice(page * 10, page * 10 + 10).map((r, i) => (
                    <TableRow key={`${r.operator_id}-${r.kpi_key}-${i}`} hover>
                      <TableCell>
                        <Chip size="small" label={r.operator_name}
                          sx={{ bgcolor: colorFor(r.operator_name) + '33' }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{r.kpi_name?.replace(/\(DEMO\)/g, '').trim()}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{r.kpi_key}</Typography>
                      </TableCell>
                      <TableCell>{r.category || '—'}</TableCell>
                      <TableCell><Chip size="small" label={r.tech_key || '—'} /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(r.avg_value)}{r.unit === '%' ? '%' : ''}</TableCell>
                      <TableCell align="right">{fmt(r.min_value)}</TableCell>
                      <TableCell align="right">{fmt(r.max_value)}</TableCell>
                      <TableCell align="right">{fmt(r.std_dev)}</TableCell>
                      <TableCell align="right">{r.cell_count?.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        {r.required_value != null ? (
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {r.comparator === 'GTE' ? '≥' : r.comparator === 'LTE' ? '≤' : r.comparator} {r.required_value}
                          </Typography>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="center">
                        {r.compliance_status ? <StatusChip status={r.compliance_status} /> : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <TablePagination component="div" count={filtered.length} page={page} rowsPerPage={10}
              rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />
          </CardContent>
        </Card>
      )}

      {view === 'bar' && (
        <Grid container spacing={2}>
          {/* Grouped bar chart: KPIs side-by-side per operator */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>KPI Averages — Operator Comparison</Typography>
                <ResponsiveContainer width="100%" height={Math.max(350, kpiKeys.length * 50)}>
                  <BarChart data={compBarData} layout="vertical" margin={{ left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="kpi" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip contentStyle={tip} />
                    <Legend />
                    {operators.map((op, i) => (
                      <Bar key={op.id} dataKey={op.name} fill={colorFor(op.name, i)} radius={[0, 4, 4, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Min / Avg / Max range chart */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Value Range (Min → Avg → Max) {selectedOp !== 'ALL' && `— ${operators.find((o) => String(o.id) === selectedOp)?.name}`}
                </Typography>
                <ResponsiveContainer width="100%" height={Math.max(300, rangeData.length * 45)}>
                  <BarChart data={rangeData} layout="vertical" margin={{ left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="kpi" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip contentStyle={tip} />
                    <Legend />
                    <Bar dataKey="min" fill={theme.palette.info.dark} name="Min" radius={[0, 2, 2, 0]} />
                    <Bar dataKey="avg" fill={theme.palette.primary.main} name="Avg" radius={[0, 2, 2, 0]} />
                    <Bar dataKey="max" fill={theme.palette.warning.main} name="Max" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {view === 'radar' && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>QoS Radar — Percentage KPIs</Typography>
                {!radarData.length ? (
                  <EmptyState message="No percentage KPIs available for radar chart." />
                ) : (
                  <ResponsiveContainer width="100%" height={420}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke={theme.palette.divider} />
                      <PolarAngleAxis dataKey="kpi" tick={{ fontSize: 10, fill: theme.palette.text.secondary }} />
                      {operators.map((op, i) => (
                        <Radar key={op.id} dataKey={op.name} stroke={colorFor(op.name, i)}
                          fill={colorFor(op.name, i)} fillOpacity={0.15} />
                      ))}
                      <Legend />
                      <Tooltip contentStyle={tip} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Compliance gauge per operator */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>Compliance Summary</Typography>
                <Stack spacing={2}>
                  {operators.map((op) => {
                    const opRows = data.filter((r) => r.operator_id === op.id && r.compliance_status);
                    const total = opRows.length || 1;
                    const pass = opRows.filter((r) => r.compliance_status === 'PASS').length;
                    const warn = opRows.filter((r) => r.compliance_status === 'WARNING').length;
                    const fail = opRows.filter((r) => r.compliance_status === 'FAIL').length;
                    return (
                      <Box key={op.id}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Chip size="small" label={op.name} sx={{ bgcolor: colorFor(op.name) + '33' }} />
                          <Typography variant="caption" color="text.secondary">
                            {pass}P / {warn}W / {fail}F of {opRows.length} KPIs
                          </Typography>
                        </Stack>
                        <Box sx={{ display: 'flex', height: 12, borderRadius: 1, overflow: 'hidden' }}>
                          {pass > 0 && <Box sx={{ flex: pass / total, bgcolor: STATUS_BG.PASS }} />}
                          {warn > 0 && <Box sx={{ flex: warn / total, bgcolor: STATUS_BG.WARNING }} />}
                          {fail > 0 && <Box sx={{ flex: fail / total, bgcolor: STATUS_BG.FAIL }} />}
                          {!opRows.length && <Box sx={{ flex: 1, bgcolor: 'action.disabledBackground' }} />}
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {view === 'trend' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Selectors */}
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>KPI</InputLabel>
                  <Select label="KPI" value={trendKpiKey} onChange={(e) => setTrendKpiKey(e.target.value)}>
                    {kpiDefs.map((k) => (
                      <MenuItem key={k.kpi_id} value={k.kpi_key}>{k.kpi_key} — {k.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Operator</InputLabel>
                  <Select label="Operator" value={trendOp} onChange={(e) => setTrendOp(e.target.value)}>
                    {operators.map((op) => (
                      <MenuItem key={op.id} value={String(op.id)}>{op.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {forecastLoading && (
                  <Typography variant="caption" color="text.secondary">Loading forecast…</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h6">KPI Trend &amp; 30-Day Forecast</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Historical (solid) · Linear regression forecast (dashed)
                  </Typography>
                </Box>
                {forecast && !forecast.insufficient && (
                  <Chip size="small" variant="outlined"
                    label={`Slope: ${forecast.slope > 0 ? '+' : ''}${Number(forecast.slope).toFixed(4)} / day`}
                    color={forecast.slope >= 0 ? 'success' : 'error'} />
                )}
              </Stack>

              {forecast?.insufficient ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography color="text.secondary">
                    Not enough data to forecast — need at least 5 historical data points for this KPI and operator.
                  </Typography>
                </Box>
              ) : !forecast || (!forecast.historical?.length && !forecastLoading) ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography color="text.secondary">Select a KPI and operator to view the trend forecast.</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
                    data={[
                      ...(forecast.historical || []).map((p) => ({
                        date: p.date?.slice(0, 10), historical: Number(Number(p.value).toFixed(3)), forecast: null,
                      })),
                      ...(forecast.forecast || []).map((p) => ({
                        date: p.date?.slice(0, 10), historical: null, forecast: Number(Number(p.value).toFixed(3)),
                      })),
                    ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tip}
                      formatter={(val, name) => [val != null ? val : '—', name === 'historical' ? 'Actual' : 'Forecast']} />
                    <Legend formatter={(v) => v === 'historical' ? 'Actual' : 'Forecast (linear)'} />
                    <ReferenceLine x={today} stroke={theme.palette.warning.main}
                      strokeDasharray="4 4" label={{ value: 'Today', fill: theme.palette.warning.main, fontSize: 11 }} />
                    <Line type="monotone" dataKey="historical" stroke={theme.palette.primary.main}
                      strokeWidth={2} dot={false} connectNulls={false} />
                    <Line type="monotone" dataKey="forecast" stroke={theme.palette.warning.main}
                      strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}
