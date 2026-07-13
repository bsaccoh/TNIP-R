import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Stack, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Select, MenuItem, FormControl, InputLabel, Tab, Tabs,
  CircularProgress, Alert, LinearProgress, Divider,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';
import { opColor } from '../theme';

/* ── Meta ────────────────────────────────────────────────────────────────── */
const RISK_META = {
  HIGH:   { color: '#c62828', bg: 'rgba(198,40,40,0.10)',   chip: 'error'   },
  MEDIUM: { color: '#e65100', bg: 'rgba(230,81,0,0.10)',    chip: 'warning' },
  LOW:    { color: '#2e7d32', bg: 'rgba(46,125,50,0.08)',   chip: 'success' },
};

const GRADE_COLOR = { A: '#2e7d32', B: '#558b2f', C: '#f57f17', D: '#e65100', F: '#c62828' };



function TrendIcon({ trend }) {
  if (trend === 'UP')   return <TrendingUpIcon   sx={{ fontSize: 18, color: '#2e7d32' }} />;
  if (trend === 'DOWN') return <TrendingDownIcon sx={{ fontSize: 18, color: '#c62828' }} />;
  return <TrendingFlatIcon sx={{ fontSize: 18, color: '#757575' }} />;
}

/* ── Sparkline (SVG) ─────────────────────────────────────────────────────── */
function Sparkline({ history, width = 100, height = 32, color = '#1565c0' }) {
  if (!history || history.length < 2) return <Box sx={{ width, height }} />;
  const vals = history.map((h) => h.value);
  const min  = Math.min(...vals);
  const max  = Math.max(...vals);
  const range = max - min || 1;
  const pts   = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts.split(' ').pop().split(',')[0]}
              cy={pts.split(' ').pop().split(',')[1]}
              r={3} fill={color} />
    </svg>
  );
}

/* ── Mini projection bar ─────────────────────────────────────────────────── */
function ProjectionBar({ current, proj30, proj60, proj90, threshold, thresholdDir }) {
  const all   = [current, proj30, proj60, proj90, threshold].filter((v) => v != null);
  const min   = Math.min(...all);
  const max   = Math.max(...all);
  const range = max - min || 1;
  const pct   = (v) => ((v - min) / range) * 100;
  const thPct = threshold != null ? pct(threshold) : null;

  return (
    <Box sx={{ position: 'relative', height: 8, bgcolor: 'action.hover', borderRadius: 4 }}>
      {/* Threshold line */}
      {thPct != null && (
        <Box sx={{ position: 'absolute', left: `${thPct}%`, top: -2, bottom: -2,
                   width: 2, bgcolor: '#f44336', borderRadius: 1, zIndex: 2 }} />
      )}
      {/* Projection fill */}
      <Box sx={{
        position: 'absolute', left: `${pct(current)}%`, right: `${100 - pct(proj90)}%`,
        top: 0, bottom: 0, bgcolor: 'rgba(25,118,210,0.25)', borderRadius: 4,
      }} />
      {/* Current dot */}
      <Box sx={{ position: 'absolute', left: `${pct(current)}%`,
                 top: '50%', transform: 'translate(-50%,-50%)',
                 width: 10, height: 10, bgcolor: '#1565c0', borderRadius: '50%', zIndex: 3 }} />
    </Box>
  );
}

/* ── Health score gauge ──────────────────────────────────────────────────── */
function ScoreGauge({ score, grade, size = 80 }) {
  const color  = GRADE_COLOR[grade] || '#757575';
  const radius = size / 2 - 8;
  const circ   = 2 * Math.PI * radius;
  const dash   = (score / 100) * circ;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex',
                 flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" fontWeight={800} sx={{ color, lineHeight: 1 }}>{grade}</Typography>
        <Typography variant="caption" color="text.secondary">{score}</Typography>
      </Box>
    </Box>
  );
}

/* ── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, sub }) {
  return (
    <Paper elevation={2} sx={{ p: 2, borderTop: `4px solid ${color}`, height: '100%' }}>
      <Typography variant="h4" fontWeight={700} color={color}>{value ?? '—'}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {sub && <Typography variant="caption" color="text.disabled">{sub}</Typography>}
    </Paper>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function PredictiveAnalytics() {
  const [tab, setTab]             = useState(0);
  const [summary, setSummary]     = useState({});
  const [trends, setTrends]       = useState([]);
  const [scores, setScores]       = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading]     = useState(true);

  const [trendDays, setTrendDays]   = useState(90);
  const [riskFilter, setRiskFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, trendRes, scoreRes, watchRes] = await Promise.all([
        api.get('/predictive/summary'),
        api.get('/predictive/kpi-trends', { params: { days: trendDays } }),
        api.get('/predictive/health-scores'),
        api.get('/predictive/obligation-risks'),
      ]);
      setSummary(sumRes.data.data    || {});
      setTrends(trendRes.data.data   || []);
      setScores(scoreRes.data.data   || []);
      setWatchlist(watchRes.data.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [trendDays]);

  useEffect(() => { load(); }, [load]);

  const filteredTrends = trends.filter((t) =>
    riskFilter === 'ALL' || t.breachRisk === riskFilter);

  const highRiskTrends = trends.filter((t) => t.breachRisk === 'HIGH');

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <PageHeader
        icon={<TrendingUpIcon />}
        title="Predictive Analytics"
        subtitle="KPI trend forecasting · operator health scores · obligation risk watchlist"
      />

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard label="High-Risk KPI Trends" value={summary.highRiskKpis}
            color="#c62828" sub="breach predicted <30d" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Critical Obligations" value={summary.criticalObls}
            color="#e65100" sub="due within 14 days" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Avg Health Score" value={summary.avgHealthScore}
            color="#1565c0" sub="across all operators" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Worst Performer"
            value={summary.worstOperator ? `${summary.worstOperator.grade}` : '—'}
            color={summary.worstOperator ? GRADE_COLOR[summary.worstOperator.grade] : '#757575'}
            sub={summary.worstOperator?.name}
          />
        </Grid>
      </Grid>

      {/* High risk alert banner */}
      {highRiskTrends.length > 0 && (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
          <strong>{highRiskTrends.length} KPI{highRiskTrends.length > 1 ? 's' : ''}</strong> projected
          to breach compliance thresholds within 30 days —
          {' '}{highRiskTrends.slice(0, 3).map((t) => `${t.kpiName} (${t.operatorName})`).join(', ')}
          {highRiskTrends.length > 3 ? ` +${highRiskTrends.length - 3} more` : ''}.
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="KPI Trends" />
        <Tab label="Health Scores" />
        <Tab label="Obligation Watchlist" />
      </Tabs>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      )}

      {/* ── Tab 0: KPI Trends ── */}
      {!loading && tab === 0 && (
        <>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>History</InputLabel>
              <Select value={trendDays} label="History"
                onChange={(e) => setTrendDays(e.target.value)}>
                {[30, 60, 90, 180].map((d) => (
                  <MenuItem key={d} value={d}>Last {d}d</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Risk Filter</InputLabel>
              <Select value={riskFilter} label="Risk Filter"
                onChange={(e) => setRiskFilter(e.target.value)}>
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="HIGH">High Risk</MenuItem>
                <MenuItem value="MEDIUM">Medium Risk</MenuItem>
                <MenuItem value="LOW">Low Risk</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {filteredTrends.length} trends
            </Typography>
          </Stack>

          {filteredTrends.length === 0
            ? (
              <Alert severity="info">
                {trends.length === 0
                  ? 'No KPI time-series data found. Push KPI measurements via the API gateway or upload PM files to see trend predictions.'
                  : 'No trends match the current filter.'}
              </Alert>
            )
            : (
              <TableContainer component={Paper} elevation={2}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell>KPI</TableCell>
                      <TableCell>Operator</TableCell>
                      <TableCell>Trend</TableCell>
                      <TableCell align="right">Current</TableCell>
                      <TableCell align="right">+30d</TableCell>
                      <TableCell align="right">+90d</TableCell>
                      <TableCell>Projection</TableCell>
                      <TableCell>Risk</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTrends.map((t, i) => {
                      const rm   = RISK_META[t.breachRisk] || {};
                      const col  = opColor(t.operatorName);
                      const unit = t.unit ? ` ${t.unit}` : '';
                      return (
                        <TableRow key={i} hover
                          sx={{ bgcolor: t.breachRisk === 'HIGH' ? 'rgba(198,40,40,0.04)' : 'inherit' }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{t.kpiName}</Typography>
                            {t.technology && (
                              <Chip label={t.technology} size="small" variant="outlined"
                                sx={{ fontSize: '0.65rem', height: 16, mt: 0.25 }} />
                            )}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: col, flexShrink: 0 }} />
                              <Typography variant="body2">{t.operatorName}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <TrendIcon trend={t.trend} />
                              <Sparkline history={t.history} color={col} />
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {t.lastValue}{unit}
                            </Typography>
                            {t.threshold != null && (
                              <Typography variant="caption" color="text.disabled">
                                thr: {t.threshold}{unit}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2"
                              color={t.breachRisk === 'HIGH' ? 'error.main' : 'text.primary'}>
                              {t.projections.days30}{unit}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {t.projections.days90}{unit}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ minWidth: 120 }}>
                            <ProjectionBar
                              current={t.lastValue}
                              proj30={t.projections.days30}
                              proj60={t.projections.days60}
                              proj90={t.projections.days90}
                              threshold={t.threshold}
                              thresholdDir={t.thresholdDir}
                            />
                            {t.daysToBreachEst != null && (
                              <Typography variant="caption" color="error">
                                ~{t.daysToBreachEst}d to breach
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {t.breachRisk
                              ? <Chip size="small" label={t.breachRisk} color={rm.chip}
                                  sx={{ fontSize: '0.68rem' }} />
                              : <Typography variant="caption" color="text.disabled">—</Typography>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
        </>
      )}

      {/* ── Tab 1: Health Scores ── */}
      {!loading && tab === 1 && (
        <Grid container spacing={2}>
          {scores.length === 0
            ? (
              <Grid item xs={12}>
                <Alert severity="info">No operators found or insufficient data to score.</Alert>
              </Grid>
            )
            : scores.map((op) => (
              <Grid item xs={12} md={6} key={op.operatorId}>
                <Paper elevation={2} sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                    <ScoreGauge score={op.score} grade={op.grade} />
                    <Box>
                      <Typography variant="h6" fontWeight={700}>{op.operatorName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Health Score: <strong style={{ color: GRADE_COLOR[op.grade] }}>{op.score}/100</strong>
                      </Typography>
                    </Box>
                  </Stack>
                  <Divider sx={{ mb: 1.5 }} />
                  <Grid container spacing={1}>
                    {[
                      { l: 'KPI Compliance',     v: `${op.components.kpiCompliance}%`,     color: op.components.kpiCompliance >= 80 ? '#2e7d32' : '#c62828' },
                      { l: 'Obligation Health',  v: `${op.components.obligationHealth}%`,  color: op.components.obligationHealth >= 80 ? '#2e7d32' : '#c62828' },
                      { l: 'Active Alarms',      v: op.components.activeAlarms,             color: op.components.criticalAlarms > 0 ? '#c62828' : '#757575' },
                      { l: 'Open Fines',         v: op.components.openFines,                color: op.components.openFines > 0 ? '#e65100' : '#757575' },
                      { l: 'Complaints (30d)',   v: op.components.complaints30d,            color: op.components.seriousComplaints > 0 ? '#e65100' : '#757575' },
                      { l: 'Critical Alarms',    v: op.components.criticalAlarms,           color: op.components.criticalAlarms > 0 ? '#c62828' : '#2e7d32' },
                    ].map(({ l, v, color }) => (
                      <Grid item xs={6} key={l}>
                        <Typography variant="caption" color="text.secondary">{l}</Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color }}>{v}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                  {/* Score bar */}
                  <Box sx={{ mt: 1.5 }}>
                    <LinearProgress variant="determinate" value={op.score}
                      sx={{ height: 6, borderRadius: 3,
                            '& .MuiLinearProgress-bar': { bgcolor: GRADE_COLOR[op.grade] } }} />
                  </Box>
                </Paper>
              </Grid>
            ))}
        </Grid>
      )}

      {/* ── Tab 2: Obligation Watchlist ── */}
      {!loading && tab === 2 && (
        watchlist.length === 0
          ? <Alert severity="success">No at-risk obligations found.</Alert>
          : (
            <TableContainer component={Paper} elevation={2}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>Obligation</TableCell>
                    <TableCell>Operator</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell align="right">Days Left</TableCell>
                    <TableCell align="right">Required Rate</TableCell>
                    <TableCell>Risk</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {watchlist.map((obl) => {
                    const rm  = RISK_META[obl.risk] || {};
                    const col = opColor(obl.operator_name);
                    return (
                      <TableRow key={obl.obligation_id} hover
                        sx={{ bgcolor: obl.risk === 'CRITICAL' ? 'rgba(198,40,40,0.04)' : 'inherit' }}>
                        <TableCell>
                          <Typography variant="caption" color="text.disabled">{obl.obligation_ref}</Typography>
                          <Typography variant="body2" fontWeight={600}>{obl.title}</Typography>
                          <Chip label={obl.type} size="small" variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 16, mt: 0.25 }} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: col, flexShrink: 0 }} />
                            <Typography variant="body2">{obl.operator_name}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ minWidth: 140 }}>
                          {obl.progress != null
                            ? (
                              <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                                  <Typography variant="caption">
                                    {obl.current_value} / {obl.target_value} {obl.unit}
                                  </Typography>
                                  <Typography variant="caption" fontWeight={700}>
                                    {obl.progress.toFixed(0)}%
                                  </Typography>
                                </Box>
                                <LinearProgress variant="determinate" value={obl.progress}
                                  sx={{ height: 5, borderRadius: 3,
                                        '& .MuiLinearProgress-bar': {
                                          bgcolor: obl.progress >= 80 ? '#2e7d32'
                                                 : obl.progress >= 50 ? '#ed6c02' : '#c62828' } }} />
                              </Box>
                            )
                            : <Typography variant="caption" color="text.disabled">No progress data</Typography>}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700}
                            color={obl.daysLeft != null && obl.daysLeft <= 14 ? 'error.main'
                                 : obl.daysLeft != null && obl.daysLeft <= 30 ? 'warning.main'
                                 : 'text.primary'}>
                            {obl.daysLeft != null ? `${obl.daysLeft}d` : '—'}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {obl.due_date ? new Date(obl.due_date).toLocaleDateString() : ''}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {obl.requiredRate
                            ? <Typography variant="body2">{obl.requiredRate} {obl.unit}/day</Typography>
                            : <Typography variant="caption" color="text.disabled">—</Typography>}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={obl.risk} color={rm.chip}
                            sx={{ fontSize: '0.68rem' }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )
      )}
    </Box>
  );
}
