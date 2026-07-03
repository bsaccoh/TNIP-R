import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Stack, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  IconButton, Button, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert, Divider, Badge, LinearProgress,
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SpeedIcon from '@mui/icons-material/Speed';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import PageHeader from '../components/PageHeader';

/* ── Constants ──────────────────────────────────────────────────────────── */
const SEVERITY_META = {
  CRITICAL: { color: '#d32f2f', bg: 'rgba(211,47,47,0.12)', chip: 'error'   },
  MAJOR:    { color: '#e65100', bg: 'rgba(230,81,0,0.12)',   chip: 'warning' },
  MINOR:    { color: '#f9a825', bg: 'rgba(249,168,37,0.10)', chip: 'default' },
  WARNING:  { color: '#0277bd', bg: 'rgba(2,119,189,0.10)',  chip: 'info'    },
  INFO:     { color: '#558b2f', bg: 'rgba(85,139,47,0.10)',  chip: 'success' },
};

const STATUS_META = {
  ACTIVE:       { label: 'Active',       color: 'error'   },
  ACKNOWLEDGED: { label: 'Acknowledged', color: 'warning' },
  CLEARED:      { label: 'Cleared',      color: 'success' },
};

const REFRESH_INTERVAL = 30; // seconds

function timeSince(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString();
}

/* ── Live indicator ──────────────────────────────────────────────────────── */
function LiveBadge({ lastRefresh }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = lastRefresh ? Math.floor((Date.now() - lastRefresh) / 1000) : 0;
  const pct  = Math.min(100, (secs / REFRESH_INTERVAL) * 100);
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <FiberManualRecordIcon sx={{ color: '#4caf50', fontSize: 12,
        animation: 'pulse 2s infinite', '@keyframes pulse': {
          '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
      <Typography variant="caption" color="text.secondary">
        Live · refreshes in {REFRESH_INTERVAL - secs}s
      </Typography>
      <Box sx={{ width: 60 }}>
        <LinearProgress variant="determinate" value={pct} sx={{ height: 3, borderRadius: 2 }} />
      </Box>
    </Stack>
  );
}

/* ── Alarm severity badge ────────────────────────────────────────────────── */
function SeverityBadge({ severity }) {
  const m = SEVERITY_META[severity] || {};
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5,
               px: 1, py: 0.25, borderRadius: 1, bgcolor: m.bg }}>
      <FiberManualRecordIcon sx={{ fontSize: 8, color: m.color }} />
      <Typography variant="caption" fontWeight={700} sx={{ color: m.color }}>{severity}</Typography>
    </Box>
  );
}

/* ── Summary count card ──────────────────────────────────────────────────── */
function AlarmCountCard({ label, value, color, pulsing }) {
  return (
    <Paper elevation={2} sx={{ p: 2, borderLeft: `4px solid ${color}`,
                                position: 'relative', overflow: 'hidden' }}>
      {pulsing && value > 0 && (
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: color, opacity: 0.04,
                   animation: 'cardPulse 2s infinite',
                   '@keyframes cardPulse': { '0%,100%': { opacity: 0.04 }, '50%': { opacity: 0.1 } } }} />
      )}
      <Typography variant="h3" fontWeight={700} sx={{ color }}>{value ?? 0}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

/* ── Operator push status row ────────────────────────────────────────────── */
function OperatorPulseRow({ op }) {
  const secsSince = op.last_push
    ? Math.floor((Date.now() - new Date(op.last_push)) / 1000)
    : null;
  const online = secsSince !== null && secsSince < 3600;
  return (
    <Stack direction="row" alignItems="center" spacing={2}
           sx={{ py: 1, borderBottom: 1, borderColor: 'divider' }}>
      <FiberManualRecordIcon sx={{ fontSize: 10, color: online ? '#4caf50' : '#757575', flexShrink: 0 }} />
      <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>{op.operator_name}</Typography>
      <Chip size="small" label={`${op.pushes} pushes`} variant="outlined" sx={{ fontSize: '0.7rem' }} />
      <Chip size="small" label={`${Number(op.rows).toLocaleString()} rows`}
            color="primary" variant="outlined" sx={{ fontSize: '0.7rem' }} />
      {op.errors > 0 && <Chip size="small" label={`${op.errors} err`} color="error" variant="outlined" sx={{ fontSize: '0.7rem' }} />}
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60, textAlign: 'right' }}>
        {op.last_push ? timeSince(op.last_push) : 'No data'}
      </Typography>
    </Stack>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function RealtimeMonitor() {
  const { user } = useAuth();
  const isRegulator = ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'].includes(user?.role);

  const [alarmSummary, setAlarmSummary] = useState({});
  const [alarms, setAlarms]             = useState([]);
  const [pulse, setPulse]               = useState({});
  const [kpiSnap, setKpiSnap]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [lastRefresh, setLastRefresh]   = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const [alarmFilter, setAlarmFilter]   = useState('ACTIVE');
  const [pulseWindow, setPulseWindow]   = useState(60);

  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [sumRes, alarmRes, pulseRes, kpiRes] = await Promise.all([
        api.get('/realtime/alarm-summary'),
        api.get('/realtime/alarms', { params: {
          status: alarmFilter !== 'ALL' ? alarmFilter : undefined,
          limit: 100,
        }}),
        api.get('/realtime/pulse', { params: { minutes: pulseWindow } }),
        api.get('/realtime/kpi-snapshot'),
      ]);
      setAlarmSummary(sumRes.data.data || {});
      setAlarms(alarmRes.data.data || []);
      setPulse(pulseRes.data.data || {});
      setKpiSnap(kpiRes.data.data || []);
      setLastRefresh(Date.now());
    } catch { /* ignore — show stale data */ }
    finally { setLoading(false); }
  }, [alarmFilter, pulseWindow]);

  // Auto-refresh
  useEffect(() => {
    load();
    timerRef.current = setInterval(load, REFRESH_INTERVAL * 1000);
    return () => clearInterval(timerRef.current);
  }, [load]);

  const handleAck = async (alarmId) => {
    setActionLoading((p) => ({ ...p, [alarmId]: 'ack' }));
    try {
      await api.put(`/realtime/alarms/${alarmId}/acknowledge`);
      await load();
    } catch { /* ignore */ }
    finally { setActionLoading((p) => ({ ...p, [alarmId]: null })); }
  };

  const handleClear = async (alarmId) => {
    setActionLoading((p) => ({ ...p, [alarmId]: 'clear' }));
    try {
      await api.put(`/realtime/alarms/${alarmId}/clear`);
      await load();
    } catch { /* ignore */ }
    finally { setActionLoading((p) => ({ ...p, [alarmId]: null })); }
  };

  const counts = alarmSummary.counts || {};
  const pulseSummary = pulse.summary || {};

  // Group KPI snapshot by operator
  const kpiByOperator = {};
  for (const row of kpiSnap) {
    if (!kpiByOperator[row.operator_name]) kpiByOperator[row.operator_name] = [];
    kpiByOperator[row.operator_name].push(row);
  }

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <PageHeader
        icon={<WifiTetheringIcon />}
        title="Real-Time Network Monitor"
        subtitle="Live alarm board · operator push activity · latest KPI snapshots"
        actions={
          <>
            {lastRefresh && <LiveBadge lastRefresh={lastRefresh} />}
            <IconButton onClick={load} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </>
        }
      />

      {loading && !lastRefresh && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      )}

      {/* Alarm summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <AlarmCountCard label="Critical Active" value={counts.critical_active}
            color="#d32f2f" pulsing />
        </Grid>
        <Grid item xs={6} sm={3}>
          <AlarmCountCard label="Major Active" value={counts.major_active}
            color="#e65100" pulsing />
        </Grid>
        <Grid item xs={6} sm={3}>
          <AlarmCountCard label="Acknowledged" value={counts.acknowledged}
            color="#f9a825" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <AlarmCountCard label="Cleared (24h)" value={counts.cleared_24h}
            color="#2e7d32" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* LEFT — Alarm board */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={2} sx={{ overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center',
                       gap: 2, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                <NotificationsActiveIcon color="error" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>Alarm Board</Typography>
                <Chip size="small" label={alarms.length}
                  color={counts.critical_active > 0 ? 'error' : 'default'} />
              </Stack>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Status</InputLabel>
                <Select value={alarmFilter} label="Status"
                  onChange={(e) => setAlarmFilter(e.target.value)}>
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="ACKNOWLEDGED">Acknowledged</MenuItem>
                  <MenuItem value="CLEARED">Cleared</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {alarms.length === 0
              ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <CheckIcon sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
                  <Typography color="text.secondary">
                    {alarmFilter === 'ACTIVE' ? 'No active alarms — network is healthy' : 'No alarms found'}
                  </Typography>
                </Box>
              )
              : (
                <TableContainer sx={{ maxHeight: 500 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Severity</TableCell>
                        <TableCell>Alarm</TableCell>
                        <TableCell>Operator</TableCell>
                        <TableCell>Element</TableCell>
                        <TableCell>Raised</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {alarms.map((a) => {
                        const sm = SEVERITY_META[a.severity] || {};
                        const acting = actionLoading[a.alarm_id];
                        return (
                          <TableRow key={a.alarm_id} hover
                            sx={{ bgcolor: a.status === 'ACTIVE' ? sm.bg : 'transparent' }}>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              <SeverityBadge severity={a.severity} />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>{a.alarm_name}</Typography>
                              {a.description && (
                                <Typography variant="caption" color="text.secondary"
                                  sx={{ display: '-webkit-box', WebkitLineClamp: 1,
                                        WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {a.description}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>{a.operator_name}</TableCell>
                            <TableCell>
                              <Typography variant="caption" fontFamily="monospace">
                                {a.element_id || '—'}
                              </Typography>
                              {a.technology && (
                                <Chip label={a.technology} size="small" variant="outlined"
                                  sx={{ ml: 0.5, fontSize: '0.65rem', height: 18 }} />
                              )}
                            </TableCell>
                            <TableCell>
                              <Tooltip title={new Date(a.raised_at).toLocaleString()}>
                                <Typography variant="caption">{timeSince(a.raised_at)}</Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Chip size="small"
                                label={STATUS_META[a.status]?.label}
                                color={STATUS_META[a.status]?.color}
                                variant="outlined" sx={{ fontSize: '0.7rem' }} />
                              {a.ack_by_name && (
                                <Typography variant="caption" color="text.disabled" display="block">
                                  by {a.ack_by_name}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {a.status === 'ACTIVE' && (
                                <Tooltip title="Acknowledge">
                                  <span>
                                    <IconButton size="small" color="warning"
                                      disabled={Boolean(acting)}
                                      onClick={() => handleAck(a.alarm_id)}>
                                      {acting === 'ack'
                                        ? <CircularProgress size={14} />
                                        : <CheckIcon fontSize="small" />}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                              {['ACTIVE', 'ACKNOWLEDGED'].includes(a.status) && isRegulator && (
                                <Tooltip title="Clear alarm">
                                  <span>
                                    <IconButton size="small" color="success"
                                      disabled={Boolean(acting)}
                                      onClick={() => handleClear(a.alarm_id)}>
                                      {acting === 'clear'
                                        ? <CircularProgress size={14} />
                                        : <ClearIcon fontSize="small" />}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
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

        {/* RIGHT — Push pulse + alarm by operator */}
        <Grid item xs={12} lg={4}>
          {/* Push pulse panel */}
          <Paper elevation={2} sx={{ mb: 3 }}>
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center',
                       gap: 1, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
              <CloudUploadIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
                Push Activity
              </Typography>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select value={pulseWindow}
                  onChange={(e) => setPulseWindow(e.target.value)}>
                  <MenuItem value={15}>15 min</MenuItem>
                  <MenuItem value={60}>1 hour</MenuItem>
                  <MenuItem value={360}>6 hours</MenuItem>
                  <MenuItem value={1440}>24 hours</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ px: 2, py: 1.5 }}>
              {/* Mini stats */}
              <Grid container spacing={1} sx={{ mb: 1.5 }}>
                {[
                  { l: 'Pushes', v: Number(pulseSummary.total_pushes || 0).toLocaleString() },
                  { l: 'Rows',   v: Number(pulseSummary.total_rows   || 0).toLocaleString() },
                  { l: 'Errors', v: pulseSummary.errors || 0, err: (pulseSummary.errors || 0) > 0 },
                  { l: 'Active Ops', v: pulseSummary.active_operators || 0 },
                ].map(({ l, v, err }) => (
                  <Grid item xs={6} key={l}>
                    <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={700}
                        color={err ? 'error.main' : 'text.primary'}>{v}</Typography>
                      <Typography variant="caption" color="text.secondary">{l}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Per-operator rows */}
              {(pulse.byOperator || []).length === 0
                ? <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: 'center' }}>
                    No pushes in the selected window
                  </Typography>
                : (pulse.byOperator || []).map((op) => (
                    <OperatorPulseRow key={op.operator_id} op={op} />
                  ))}
            </Box>

            {/* Recent push feed */}
            {(pulse.recent || []).length > 0 && (
              <>
                <Divider />
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Recent Calls
                  </Typography>
                </Box>
                <Box sx={{ maxHeight: 220, overflowY: 'auto' }}>
                  {(pulse.recent || []).map((r, i) => (
                    <Box key={i} sx={{ px: 2, py: 0.75, display: 'flex', gap: 1,
                                       alignItems: 'center', borderBottom: 1,
                                       borderColor: 'divider', flexWrap: 'wrap' }}>
                      <FiberManualRecordIcon sx={{ fontSize: 8, flexShrink: 0,
                        color: r.status_code < 300 ? '#4caf50' : '#d32f2f' }} />
                      <Typography variant="caption" fontFamily="monospace" color="text.secondary"
                        sx={{ flex: 1 }}>
                        {r.endpoint}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{r.operator_name}</Typography>
                      <Typography variant="caption" color="text.disabled">{fmtTime(r.pushed_at)}</Typography>
                      {r.rows_accepted > 0 && (
                        <Typography variant="caption" color="primary">+{r.rows_accepted}</Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Paper>

          {/* Alarms by operator */}
          {(alarmSummary.byOperator || []).length > 0 && (
            <Paper elevation={2}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700}>Alarms by Operator</Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                {alarmSummary.byOperator.map((op) => (
                  <Box key={op.operator_id} sx={{ display: 'flex', alignItems: 'center',
                                                   gap: 1, mb: 1 }}>
                    <Typography variant="body2" sx={{ flex: 1 }}>{op.operator_name}</Typography>
                    {op.critical > 0 && (
                      <Chip size="small" label={`${op.critical} crit`} color="error"
                        sx={{ fontSize: '0.68rem' }} />
                    )}
                    <Chip size="small" label={`${op.active} active`}
                      color={op.active > 0 ? 'warning' : 'default'} variant="outlined"
                      sx={{ fontSize: '0.68rem' }} />
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* KPI Snapshot */}
      {Object.keys(kpiByOperator).length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            <SpeedIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
            Latest KPI Snapshot (from API Push)
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(kpiByOperator).map(([opName, kpis]) => (
              <Grid item xs={12} md={6} lg={3} key={opName}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                    {opName}
                  </Typography>
                  {kpis.slice(0, 8).map((k) => (
                    <Box key={`${k.kpi_name}-${k.technology}`}
                         sx={{ display: 'flex', justifyContent: 'space-between',
                               alignItems: 'baseline', py: 0.5,
                               borderBottom: 1, borderColor: 'divider' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {k.kpi_name}
                        </Typography>
                        {k.technology && (
                          <Chip label={k.technology} size="small" variant="outlined"
                            sx={{ ml: 0.5, fontSize: '0.6rem', height: 16 }} />
                        )}
                      </Box>
                      <Typography variant="body2" fontWeight={700}>
                        {Number(k.value).toLocaleString()}{k.unit ? ` ${k.unit}` : ''}
                      </Typography>
                    </Box>
                  ))}
                  {kpis.length > 8 && (
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                      +{kpis.length - 8} more KPIs
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {Object.keys(kpiByOperator).length === 0 && !loading && (
        <Alert severity="info" sx={{ mt: 3 }}>
          No KPI data pushed yet. Operators can push KPI measurements via the API Gateway
          using their API key.
        </Alert>
      )}
    </Box>
  );
}
