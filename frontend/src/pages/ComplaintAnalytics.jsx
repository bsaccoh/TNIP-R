import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Stack, CircularProgress, Chip, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
  LinearProgress, Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SpeedIcon from '@mui/icons-material/Speed';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { get } from '../api/client';
import { useColorMode } from '../theme/ColorMode';
import { colorFor } from '../theme';

const COLORS = ['#4c8ef7', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#f97316', '#ec4899'];
const SEVERITY_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#22c55e' };
const STATUS_COLORS = { OPEN: '#ef4444', INVESTIGATING: '#f59e0b', ESCALATED: '#a855f7', RESOLVED: '#22c55e', CLOSED: '#64748b' };

function KpiCard({ title, value, subtitle, icon, color, trend }) {
  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="overline" color="text.secondary" fontSize={11}>{title}</Typography>
          <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <Box sx={{ color: color || 'primary.main', opacity: 0.7 }}>{icon}</Box>
      </Stack>
      {trend !== undefined && (
        <LinearProgress variant="determinate" value={Math.min(trend, 100)}
          sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
      )}
    </Paper>
  );
}

export default function ComplaintAnalytics() {
  const { mode } = useColorMode();
  const [metrics, setMetrics] = useState(null);
  const [trend, setTrend] = useState([]);
  const [benchmark, setBenchmark] = useState([]);
  const [categories, setCategories] = useState([]);
  const [breaches, setBreaches] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [m, t, b, c, br, w] = await Promise.all([
        get('/complaint-analytics/metrics'),
        get('/complaint-analytics/trend'),
        get('/complaint-analytics/benchmark'),
        get('/complaint-analytics/categories'),
        get('/complaint-analytics/sla-breaches'),
        get('/complaint-analytics/weekly'),
      ]);
      setMetrics(m.data);
      setTrend(t.data);
      setBenchmark(b.data);
      setCategories(c.data);
      setBreaches(br.data);
      setWeekly(w.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading && !metrics) {
    return <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}><CircularProgress /></Box>;
  }

  const resRate = metrics ? Math.round((metrics.resolved / Math.max(metrics.total, 1)) * 100) : 0;

  const trendFormatted = trend.map((r) => ({
    ...r,
    day: new Date(r.day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    avg_hours: Number(r.avg_hours) || 0,
    filed: Number(r.filed),
    resolved: Number(r.resolved),
  }));

  const weeklyByOp = {};
  weekly.forEach((r) => {
    const wk = new Date(r.week_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    if (!weeklyByOp[wk]) weeklyByOp[wk] = { week: wk };
    weeklyByOp[wk][r.operator_name] = Number(r.cnt);
  });
  const weeklyData = Object.values(weeklyByOp);
  const operatorNames = [...new Set(weekly.map((r) => r.operator_name))];

  const catRadar = categories.map((c) => ({
    category: c.category.replace(/_/g, ' '),
    total: Number(c.total),
    resolved: Number(c.resolved),
    avgHours: Number(c.avg_hours) || 0,
  }));

  const gridColor = mode === 'dark' ? '#333' : '#e0e0e0';
  const textColor = mode === 'dark' ? '#ccc' : '#555';

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Consumer Complaint Analytics</Typography>
          <Typography variant="body2" color="text.secondary">
            Resolution performance, SLA compliance, and operator benchmarking
          </Typography>
        </Box>
        <IconButton onClick={load}><RefreshIcon /></IconButton>
      </Stack>

      {/* KPI cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <KpiCard title="Avg Resolution Time" value={`${metrics?.avgResolutionHours || 0}h`}
            subtitle="Hours to resolve" icon={<AccessTimeIcon fontSize="large" />}
            color="#4c8ef7" trend={Math.min(100 - (metrics?.avgResolutionHours || 0) / 0.48, 100)} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard title="SLA Compliance" value={`${metrics?.slaComplianceRate || 0}%`}
            subtitle="Within target" icon={<CheckCircleIcon fontSize="large" />}
            color={metrics?.slaComplianceRate >= 90 ? '#22c55e' : metrics?.slaComplianceRate >= 75 ? '#f59e0b' : '#ef4444'}
            trend={metrics?.slaComplianceRate || 0} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard title="Avg First Response" value={`${metrics?.avgFirstResponseMin || 0}m`}
            subtitle="Minutes to first response" icon={<SpeedIcon fontSize="large" />}
            color="#a855f7" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard title="Resolution Rate" value={`${resRate}%`}
            subtitle={`${metrics?.resolved || 0} of ${metrics?.total || 0} resolved`}
            icon={<CheckCircleIcon fontSize="large" />}
            color={resRate >= 80 ? '#22c55e' : '#f59e0b'} trend={resRate} />
        </Grid>
      </Grid>

      {/* Charts row 1 */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Resolution Time Trend (Daily)</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendFormatted}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: textColor }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: textColor }} label={{ value: 'Count', angle: -90, position: 'insideLeft', fontSize: 11, fill: textColor }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: textColor }} label={{ value: 'Hours', angle: 90, position: 'insideRight', fontSize: 11, fill: textColor }} />
                <RTooltip contentStyle={{ backgroundColor: mode === 'dark' ? '#1e1e1e' : '#fff', border: '1px solid #555' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="filed" fill="#4c8ef7" name="Filed" opacity={0.6} />
                <Bar yAxisId="left" dataKey="resolved" fill="#22c55e" name="Resolved" opacity={0.6} />
                <Line yAxisId="right" type="monotone" dataKey="avg_hours" stroke="#f59e0b" name="Avg Hours" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" gutterBottom>By Category</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={catRadar}>
                <PolarGrid stroke={gridColor} />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: textColor }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: textColor }} />
                <Radar dataKey="total" stroke="#4c8ef7" fill="#4c8ef7" fillOpacity={0.2} name="Total" />
                <Radar dataKey="resolved" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} name="Resolved" />
                <RTooltip contentStyle={{ backgroundColor: mode === 'dark' ? '#1e1e1e' : '#fff', border: '1px solid #555' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts row 2: Operator benchmark + Weekly trend */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Operator Benchmark</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={benchmark.map((b) => ({
                ...b,
                avg_resolution_hours: Number(b.avg_resolution_hours) || 0,
                sla_pct: Number(b.sla_pct) || 0,
                avg_response_min: Number(b.avg_response_min) || 0,
              }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" tick={{ fontSize: 11, fill: textColor }} />
                <YAxis dataKey="operator_name" type="category" width={80} tick={{ fontSize: 11, fill: textColor }} />
                <RTooltip contentStyle={{ backgroundColor: mode === 'dark' ? '#1e1e1e' : '#fff', border: '1px solid #555' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="avg_resolution_hours" name="Avg Res. (hrs)">
                  {benchmark.map((b, i) => (
                    <Cell key={i} fill={colorFor(b.operator_name, i)} />
                  ))}
                </Bar>
                <Bar dataKey="sla_pct" name="SLA %">
                  {benchmark.map((b, i) => (
                    <Cell key={i} fill={colorFor(b.operator_name, i)} fillOpacity={0.55} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Weekly Complaint Volume by Operator</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: textColor }} />
                <YAxis tick={{ fontSize: 11, fill: textColor }} />
                <RTooltip contentStyle={{ backgroundColor: mode === 'dark' ? '#1e1e1e' : '#fff', border: '1px solid #555' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {operatorNames.map((name, i) => (
                  <Bar key={name} dataKey={name} stackId="a" fill={colorFor(name, i)} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Category breakdown table */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Category Performance</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="center">Total</TableCell>
                    <TableCell align="center">Resolved</TableCell>
                    <TableCell align="center">Avg Hours</TableCell>
                    <TableCell align="center">Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((c) => {
                    const rate = c.total > 0 ? Math.round((c.resolved / c.total) * 100) : 0;
                    return (
                      <TableRow key={c.category}>
                        <TableCell>
                          <Chip label={c.category.replace(/_/g, ' ')} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                        </TableCell>
                        <TableCell align="center">{c.total}</TableCell>
                        <TableCell align="center">{c.resolved}</TableCell>
                        <TableCell align="center">{Number(c.avg_hours) || '—'}</TableCell>
                        <TableCell align="center">
                          <Typography variant="caption" fontWeight={600}
                            color={rate >= 80 ? 'success.main' : rate >= 50 ? 'warning.main' : 'error.main'}>
                            {rate}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">SLA Breaches</Typography>
              <Chip label={`${breaches.length} active`} size="small" color={breaches.length > 0 ? 'error' : 'success'} />
            </Stack>
            {breaches.length === 0 ? (
              <Stack alignItems="center" py={4}>
                <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                <Typography color="text.secondary">No active SLA breaches</Typography>
              </Stack>
            ) : (
              <TableContainer sx={{ maxHeight: 340 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ref</TableCell>
                      <TableCell>Operator</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>SLA</TableCell>
                      <TableCell>Elapsed</TableCell>
                      <TableCell>Overdue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {breaches.map((b) => {
                      const overdue = Number(b.elapsed_hours) - Number(b.sla_hours);
                      return (
                        <TableRow key={b.complaint_id}>
                          <TableCell>
                            <Typography variant="caption" fontFamily="monospace">{b.reference_no}</Typography>
                          </TableCell>
                          <TableCell>{b.operator_name}</TableCell>
                          <TableCell>
                            <Chip label={b.severity} size="small"
                              sx={{ bgcolor: SEVERITY_COLORS[b.severity], color: '#fff', fontSize: 10 }} />
                          </TableCell>
                          <TableCell>{b.sla_hours}h</TableCell>
                          <TableCell>{Number(b.elapsed_hours)}h</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <ErrorOutlineIcon sx={{ fontSize: 14, color: 'error.main' }} />
                              <Typography variant="caption" color="error.main" fontWeight={600}>
                                +{overdue}h
                              </Typography>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Operator detail table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Operator Scorecard</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Operator</TableCell>
                <TableCell align="center">Total</TableCell>
                <TableCell align="center">Resolved</TableCell>
                <TableCell align="center">Critical</TableCell>
                <TableCell align="center">Avg Resolution</TableCell>
                <TableCell align="center">Avg Response</TableCell>
                <TableCell align="center">SLA Compliance</TableCell>
                <TableCell align="center">Grade</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {benchmark.map((op) => {
                const sla = Number(op.sla_pct) || 0;
                const grade = sla >= 90 ? 'A' : sla >= 80 ? 'B' : sla >= 70 ? 'C' : sla >= 60 ? 'D' : 'F';
                const gradeColor = sla >= 90 ? 'success' : sla >= 70 ? 'warning' : 'error';
                return (
                  <TableRow key={op.operator_name}>
                    <TableCell><Typography fontWeight={600}>{op.operator_name}</Typography></TableCell>
                    <TableCell align="center">{op.total}</TableCell>
                    <TableCell align="center">{op.resolved}</TableCell>
                    <TableCell align="center">
                      <Typography color={Number(op.critical_cnt) > 0 ? 'error.main' : 'text.primary'}>
                        {op.critical_cnt}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{Number(op.avg_resolution_hours) || '—'}h</TableCell>
                    <TableCell align="center">{Number(op.avg_response_min) || '—'}m</TableCell>
                    <TableCell align="center">
                      <Stack spacing={0.5}>
                        <Typography variant="body2" fontWeight={600}
                          color={sla >= 90 ? 'success.main' : sla >= 70 ? 'warning.main' : 'error.main'}>
                          {sla.toFixed(1)}%
                        </Typography>
                        <LinearProgress variant="determinate" value={sla}
                          sx={{ height: 4, borderRadius: 2,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: sla >= 90 ? '#22c55e' : sla >= 70 ? '#f59e0b' : '#ef4444',
                            },
                          }} />
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={grade} size="small" color={gradeColor} sx={{ fontWeight: 700, minWidth: 32 }} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
