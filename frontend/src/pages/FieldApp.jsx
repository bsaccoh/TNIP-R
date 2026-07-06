import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Divider,
  CircularProgress, Alert, Button, IconButton,
  TextField, Select, MenuItem, FormControl, InputLabel,
  BottomNavigation, BottomNavigationAction, Snackbar,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Slide, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import HistoryIcon from '@mui/icons-material/History';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';

/* ── Offline reading buffer (localStorage) ───────────────────────────────── */
const BUF_KEY = 'field_offline_readings';
function loadBuffer() {
  try { return JSON.parse(localStorage.getItem(BUF_KEY) || '[]'); } catch { return []; }
}
function saveBuffer(buf) { localStorage.setItem(BUF_KEY, JSON.stringify(buf)); }
function clearBuffer()   { localStorage.removeItem(BUF_KEY); }

const SESSION_KEY = 'field_active_session';
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
function saveSession(s) { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); }

/* ── Signal quality helpers ──────────────────────────────────────────────── */
const NEUTRAL = '#94a3b8';
function rsrpColor(v) {
  if (v == null) return NEUTRAL;
  if (v >= -85)  return '#16a34a';
  if (v >= -100) return '#d97706';
  if (v >= -110) return '#ea580c';
  return '#dc2626';
}
function rsrpLabel(v) {
  if (v == null) return 'No signal';
  if (v >= -85)  return 'Excellent';
  if (v >= -95)  return 'Good';
  if (v >= -110) return 'Fair';
  return 'Poor';
}
function pctOf(v, min, max) {
  if (v == null) return 0;
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
}

/* ── Circular signal gauge (SVG) ─────────────────────────────────────────── */
function SignalGauge({ rsrp, size = 168 }) {
  const pct   = pctOf(rsrp, -140, -44);
  const color = rsrpColor(rsrp);
  const r     = size / 2 - 12;
  const circ  = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;

  return (
    <Box sx={{ position: 'relative', width: size, height: size, mx: 'auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(148,163,184,0.20)" strokeWidth={11} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={11} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                 alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1 }}>RSRP</Typography>
        <Typography variant="h4" fontWeight={700} sx={{ color, lineHeight: 1.05 }}>
          {rsrp != null ? rsrp : '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary">dBm</Typography>
        <Chip size="small" label={rsrpLabel(rsrp)}
          sx={{ mt: 0.5, bgcolor: `${color}22`, color, fontWeight: 600, fontSize: '0.68rem' }} />
      </Box>
    </Box>
  );
}

/* ── Metric tile ─────────────────────────────────────────────────────────── */
function MetricTile({ label, value, unit, color }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.25, textAlign: 'center', borderRadius: 2 }}>
      <Typography variant="h6" fontWeight={700} sx={{ color: color || 'text.primary', lineHeight: 1.1 }}>
        {value ?? '—'}
        {value != null && unit && (
          <Typography component="span" variant="caption" color="text.secondary"> {unit}</Typography>
        )}
      </Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

/* ── GPS accuracy badge ──────────────────────────────────────────────────── */
function AccuracyBadge({ accuracy, dark }) {
  const color = accuracy == null ? NEUTRAL : accuracy <= 10 ? '#16a34a' : accuracy <= 30 ? '#d97706' : '#dc2626';
  return (
    <Chip size="small" icon={<MyLocationIcon sx={{ fontSize: 14, color: `${color} !important` }} />}
      label={accuracy != null ? `±${accuracy.toFixed(0)}m` : 'No GPS'}
      sx={{ bgcolor: dark ? 'rgba(255,255,255,0.10)' : `${color}1f`, color: dark ? '#e2e8f0' : color,
            fontWeight: 600, fontSize: '0.68rem', height: 24 }} />
  );
}

/* ── Reading capture dialog ──────────────────────────────────────────────── */
function ReadingDialog({ open, onClose, onCapture, gps }) {
  const [form, setForm] = useState({
    rsrp: '', rsrq: '', sinr: '', rssi: '', dl_throughput: '', ul_throughput: '',
    band: '4G', cell_id: '', event_type: 'NORMAL',
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    onCapture({
      ...form,
      rsrp: form.rsrp !== '' ? Number(form.rsrp) : null,
      rsrq: form.rsrq !== '' ? Number(form.rsrq) : null,
      sinr: form.sinr !== '' ? Number(form.sinr) : null,
      rssi: form.rssi !== '' ? Number(form.rssi) : null,
      dl_throughput: form.dl_throughput !== '' ? Number(form.dl_throughput) : null,
      ul_throughput: form.ul_throughput !== '' ? Number(form.ul_throughput) : null,
      latitude:  gps?.latitude  || null,
      longitude: gps?.longitude || null,
      accuracy:  gps?.accuracy  || null,
      technology: form.band,
      recorded_at: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"
      TransitionComponent={Slide} TransitionProps={{ direction: 'up' }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <SignalCellularAltIcon color="primary" />
          <Typography fontWeight={700}>Capture Reading</Typography>
        </Stack>
        {gps && (
          <Typography variant="caption" color="text.secondary">
            {gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)} · ±{gps.accuracy?.toFixed(0)}m
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Technology</InputLabel>
            <Select value={form.band} label="Technology" onChange={set('band')}>
              {['2G','3G','4G','5G'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <Stack direction="row" spacing={1}>
            <TextField size="small" fullWidth label="RSRP (dBm)" type="number"
              value={form.rsrp} onChange={set('rsrp')}
              inputProps={{ step: 0.1 }} placeholder="-85 to -140" />
            <TextField size="small" fullWidth label="RSRQ (dB)" type="number"
              value={form.rsrq} onChange={set('rsrq')}
              inputProps={{ step: 0.1 }} placeholder="-3 to -20" />
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField size="small" fullWidth label="SINR (dB)" type="number"
              value={form.sinr} onChange={set('sinr')}
              inputProps={{ step: 0.1 }} placeholder="0 to 30" />
            <TextField size="small" fullWidth label="RSSI (dBm)" type="number"
              value={form.rssi} onChange={set('rssi')}
              inputProps={{ step: 0.1 }} />
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField size="small" fullWidth label="DL (Mbps)" type="number"
              value={form.dl_throughput} onChange={set('dl_throughput')}
              inputProps={{ step: 0.01, min: 0 }} />
            <TextField size="small" fullWidth label="UL (Mbps)" type="number"
              value={form.ul_throughput} onChange={set('ul_throughput')}
              inputProps={{ step: 0.01, min: 0 }} />
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField size="small" fullWidth label="Cell ID" value={form.cell_id} onChange={set('cell_id')} />
            <FormControl size="small" fullWidth>
              <InputLabel>Event</InputLabel>
              <Select value={form.event_type} label="Event" onChange={set('event_type')}>
                {['NORMAL','CALL_DROP','HANDOVER','NO_SERVICE','DATA_STALL'].map((e) => (
                  <MenuItem key={e} value={e}>{e.replace(/_/g,' ')}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} startIcon={<AddCircleIcon />}>
          Save Reading
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── End session confirm ─────────────────────────────────────────────────── */
function EndDialog({ open, onClose, onEnd, readingCount, offlineCount }) {
  const [notes, setNotes] = useState('');
  const [ending, setEnding] = useState(false);
  const submit = async () => {
    setEnding(true);
    try { await onEnd(notes); } finally { setEnding(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>End Session</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {readingCount} reading{readingCount !== 1 ? 's' : ''} captured
          {offlineCount > 0 ? ` · ${offlineCount} pending upload` : ''}.
        </Typography>
        <TextField fullWidth size="small" multiline rows={2} label="Session notes (optional)"
          value={notes} onChange={(e) => setNotes(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={submit} disabled={ending}
          startIcon={ending ? <CircularProgress size={16} color="inherit" /> : <StopCircleIcon />}>
          End & Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Tab: Campaigns ──────────────────────────────────────────────────────── */
function CampaignsTab({ onStart, activeSession }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [operators, setOperators] = useState([]);

  const [startDlg, setStartDlg]   = useState(false);
  const [selCamp, setSelCamp]     = useState(null);
  const [form, setForm]           = useState({ technology: '4G', routeType: 'Urban', deviceModel: '' });
  const [starting, setStarting]   = useState(false);

  useEffect(() => {
    api.get('/field/my-campaigns').then((r) => setCampaigns(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
    api.get('/operators').then((r) => setOperators((r.data.data || []).filter((o) => o.status === 'ACTIVE'))).catch(() => {});
  }, []);

  const doStart = async () => {
    setStarting(true);
    try {
      await onStart({
        campaignId:  selCamp?.campaign_id,
        operatorId:  selCamp?.operator_id || form.operatorId,
        technology:  form.technology,
        routeType:   form.routeType,
        deviceModel: form.deviceModel,
      });
      setStartDlg(false);
    } finally { setStarting(false); }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="overline" color="text.secondary">Assigned to you</Typography>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>}

      {!loading && campaigns.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2, mt: 1 }}>
          <RouteIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">No campaigns assigned.</Typography>
          <Typography variant="caption" color="text.disabled">Start an ad-hoc test below.</Typography>
        </Paper>
      )}

      <Stack spacing={1.5} sx={{ mt: 1 }}>
        {campaigns.map((c) => {
          const live = c.status === 'IN_PROGRESS';
          return (
            <Paper key={c.campaign_id} variant="outlined"
              sx={{ p: 2, borderRadius: 2, borderLeft: `3px solid ${live ? '#16a34a' : '#d97706'}` }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flex: 1, mr: 1, minWidth: 0 }}>
                  <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                    {c.campaign_ref}
                  </Typography>
                  <Typography variant="body1" fontWeight={600} noWrap>{c.campaign_name}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.operator_name}</Typography>
                </Box>
                <Chip size="small" label={c.status.replace('_', ' ')}
                  color={live ? 'success' : 'warning'} sx={{ fontSize: '0.62rem' }} />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  {c.planned_end ? `Due ${new Date(c.planned_end).toLocaleDateString()}` : 'No deadline'}
                  {c.linked_tests != null ? ` · ${c.linked_tests} tests` : ''}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Button size="small" variant="contained" endIcon={<ChevronRightIcon />}
                  disabled={!!activeSession}
                  onClick={() => { setSelCamp(c); setStartDlg(true); }}>
                  Start
                </Button>
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      <Divider sx={{ my: 2.5 }}>
        <Typography variant="caption" color="text.disabled">or</Typography>
      </Divider>
      <Button fullWidth variant="outlined" startIcon={<RouteIcon />}
        disabled={!!activeSession}
        onClick={() => { setSelCamp(null); setStartDlg(true); }}>
        Start Ad-Hoc Drive Test
      </Button>

      {activeSession && (
        <Alert severity="info" sx={{ mt: 2 }}>
          A session is already running. End it before starting another.
        </Alert>
      )}

      {/* Start dialog */}
      <Dialog open={startDlg} onClose={() => setStartDlg(false)} fullWidth maxWidth="xs">
        <DialogTitle>{selCamp ? selCamp.campaign_name : 'Ad-Hoc Drive Test'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {!selCamp && (
              <FormControl size="small" fullWidth>
                <InputLabel>Operator</InputLabel>
                <Select value={form.operatorId || ''} label="Operator"
                  onChange={(e) => setForm((f) => ({ ...f, operatorId: e.target.value }))}>
                  {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <FormControl size="small" fullWidth>
              <InputLabel>Technology</InputLabel>
              <Select value={form.technology} label="Technology"
                onChange={(e) => setForm((f) => ({ ...f, technology: e.target.value }))}>
                {['2G','3G','4G','5G'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Route Type</InputLabel>
              <Select value={form.routeType} label="Route Type"
                onChange={(e) => setForm((f) => ({ ...f, routeType: e.target.value }))}>
                {['Urban','Suburban','Rural','Highway','Indoor'].map((r) => (
                  <MenuItem key={r} value={r}>{r}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" fullWidth label="Device Model"
              value={form.deviceModel}
              onChange={(e) => setForm((f) => ({ ...f, deviceModel: e.target.value }))}
              placeholder="e.g. Samsung Galaxy S24" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStartDlg(false)}>Cancel</Button>
          <Button variant="contained" onClick={doStart} disabled={starting}
            startIcon={starting ? <CircularProgress size={16} color="inherit" /> : <RadioButtonCheckedIcon />}>
            Start Recording
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ── Tab: Active Session ─────────────────────────────────────────────────── */
function SessionTab({ session, readings, gps, gpsError, onCapture, onEnd }) {
  const [readDlg, setReadDlg] = useState(false);
  const [endDlg, setEndDlg]   = useState(false);
  const offlineCount = loadBuffer().length;

  if (!session) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', mt: 6 }}>
        <RadioButtonCheckedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
        <Typography color="text.secondary" fontWeight={600}>No active session</Typography>
        <Typography variant="caption" color="text.disabled">
          Open the Campaigns tab to start a drive test.
        </Typography>
      </Box>
    );
  }

  const lastReading = readings[readings.length - 1];
  const withRsrp = readings.filter((r) => r.rsrp != null);
  const avgRsrp = withRsrp.length
    ? withRsrp.reduce((s, r) => s + r.rsrp, 0) / withRsrp.length
    : null;

  return (
    <Box sx={{ p: 2, pb: 3 }}>
      {/* Session header */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2,
             borderLeft: '3px solid #16a34a' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#16a34a',
                         animation: 'fieldPulse 1.4s ease-in-out infinite',
                         '@keyframes fieldPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
              <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700, letterSpacing: 0.5 }}>
                RECORDING
              </Typography>
            </Stack>
            <Typography variant="body2" fontWeight={600} noWrap>{session.testName}</Typography>
          </Box>
          <Chip size="small" label={`${readings.length} readings`} variant="outlined" />
        </Stack>
      </Paper>

      {/* GPS strip */}
      <Paper variant="outlined" sx={{ p: 1.25, mb: 2, borderRadius: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <MyLocationIcon sx={{ color: gps ? '#16a34a' : NEUTRAL, fontSize: 20 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {gps
              ? <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                  {gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)}
                </Typography>
              : <Typography variant="body2" color="text.secondary">{gpsError || 'Acquiring GPS…'}</Typography>}
          </Box>
          <AccuracyBadge accuracy={gps?.accuracy} />
        </Stack>
      </Paper>

      {/* Signal gauge + metrics */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        {lastReading ? (
          <>
            <SignalGauge rsrp={lastReading.rsrp} />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, mt: 2 }}>
              <MetricTile label="SINR" value={lastReading.sinr} unit="dB"
                color={lastReading.sinr != null ? (lastReading.sinr >= 13 ? '#16a34a' : lastReading.sinr >= 0 ? '#d97706' : '#dc2626') : undefined} />
              <MetricTile label="DL" value={lastReading.dl_throughput} unit="Mbps" />
              <MetricTile label="UL" value={lastReading.ul_throughput} unit="Mbps" />
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap justifyContent="center">
              {lastReading.band && <Chip size="small" label={lastReading.band} variant="outlined" />}
              {lastReading.event_type && lastReading.event_type !== 'NORMAL' && (
                <Chip size="small" color="warning" label={lastReading.event_type.replace(/_/g, ' ')} />
              )}
            </Stack>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <SignalCellularAltIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">No readings yet</Typography>
            <Typography variant="caption" color="text.disabled">
              Tap “Capture Reading” to log signal at your location.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Session stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, mb: 2 }}>
        <MetricTile label="Readings" value={readings.length} />
        <MetricTile label="Avg RSRP" value={avgRsrp != null ? avgRsrp.toFixed(1) : null} unit="dBm"
          color={rsrpColor(avgRsrp)} />
        <MetricTile label="Buffered" value={offlineCount}
          color={offlineCount > 0 ? '#d97706' : undefined} />
      </Box>

      {offlineCount > 0 && (
        <Alert severity="warning" icon={<WifiOffIcon />} sx={{ mb: 2 }}>
          {offlineCount} reading{offlineCount > 1 ? 's' : ''} stored offline — will sync when you end the session.
        </Alert>
      )}

      {/* Actions */}
      <Stack spacing={1.25}>
        <Button fullWidth variant="contained" size="large"
          startIcon={<AddCircleIcon />}
          onClick={() => setReadDlg(true)}
          sx={{ py: 1.5, fontSize: '1rem' }}>
          Capture Reading
        </Button>
        <Button fullWidth variant="outlined" color="error"
          startIcon={<StopCircleIcon />}
          onClick={() => setEndDlg(true)}>
          End Session
        </Button>
      </Stack>

      {/* Recent readings */}
      {readings.length > 0 && (
        <Box sx={{ mt: 2.5 }}>
          <Typography variant="overline" color="text.secondary">Recent readings</Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2, mt: 0.5 }}>
            <List dense disablePadding>
              {[...readings].reverse().slice(0, 8).map((r, i, arr) => (
                <ListItem key={i} divider={i < arr.length - 1} sx={{ py: 0.75 }}>
                  <ListItemText
                    primary={
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        RSRP {r.rsrp ?? '—'} · SINR {r.sinr ?? '—'} · DL {r.dl_throughput ?? '—'}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: rsrpColor(r.rsrp) }} />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      )}

      <ReadingDialog open={readDlg} onClose={() => setReadDlg(false)} onCapture={onCapture} gps={gps} />
      <EndDialog open={endDlg} onClose={() => setEndDlg(false)} onEnd={onEnd}
        readingCount={readings.length} offlineCount={offlineCount} />
    </Box>
  );
}

/* ── Tab: History ────────────────────────────────────────────────────────── */
function HistoryTab() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/field/history').then((r) => setRows(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>;
  if (!rows.length) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', mt: 5 }}>
        <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">No sessions yet.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="overline" color="text.secondary">Your sessions</Typography>
      <Stack spacing={1.5} sx={{ mt: 0.5 }}>
        {rows.map((r) => (
          <Paper key={r.drive_test_id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                <Typography variant="body2" fontWeight={600} noWrap>{r.test_name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {r.operator_name} · {r.technology} · {new Date(r.test_date).toLocaleDateString()}
                </Typography>
              </Box>
              <Chip size="small" label={r.status}
                color={r.status === 'COMPLETED' ? 'success' : 'default'}
                sx={{ fontSize: '0.62rem', height: 20 }} />
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, mt: 1.5 }}>
              <MetricTile label="Readings" value={r.sample_count} />
              <MetricTile label="Avg RSRP" value={r.avg_rsrp != null ? Number(r.avg_rsrp).toFixed(1) : null}
                unit="dBm" color={rsrpColor(r.avg_rsrp != null ? Number(r.avg_rsrp) : null)} />
              <MetricTile label="Avg DL" value={r.avg_dl != null ? Number(r.avg_dl).toFixed(1) : null} unit="Mbps" />
            </Box>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

/* ── Main field app ──────────────────────────────────────────────────────── */
export default function FieldApp() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab]               = useState(0);
  const [activeSession, setSession] = useState(loadSession);
  const [readings, setReadings]     = useState([]);
  const [gps, setGps]               = useState(null);
  const [gpsError, setGpsError]     = useState(null);
  const [toast, setToast]           = useState(null);
  const watchRef                    = useRef(null);

  // GPS watch
  useEffect(() => {
    if (!navigator.geolocation) { setGpsError('Geolocation not supported'); return; }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGps({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGpsError(null);
      },
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  if (authLoading) return <Box sx={{ display: 'grid', placeItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  if (!user)       return <Navigate to="/login" replace />;

  const startSession = async (opts) => {
    const res = await api.post('/field/session/start', opts);
    const sess = { driveTestId: res.data.data.driveTestId, testName: res.data.data.testName };
    setSession(sess);
    saveSession(sess);
    setReadings([]);
    setTab(1);
    setToast('Session started — capturing readings');
  };

  const captureReading = async (reading) => {
    setReadings((prev) => [...prev, reading]);
    try {
      await api.post(`/field/session/${activeSession.driveTestId}/reading`, reading);
    } catch {
      const buf = loadBuffer();
      buf.push({ ...reading, driveTestId: activeSession.driveTestId });
      saveBuffer(buf);
      setToast('Offline — reading buffered locally');
      return;
    }
    setToast('Reading saved');
  };

  const endSession = async (notes) => {
    const buf = loadBuffer();
    if (buf.length > 0) {
      try {
        await api.post(`/field/session/${activeSession.driveTestId}/bulk`, { readings: buf });
        clearBuffer();
      } catch {
        setToast('Warning: offline buffer could not be uploaded');
      }
    }
    const res = await api.post(`/field/session/${activeSession.driveTestId}/end`, { notes });
    const summary = res.data.data;
    saveSession(null);
    setSession(null);
    setReadings([]);
    setTab(2);
    setToast(`Session complete — ${summary.sampleCount} readings uploaded`);
  };

  const TABS = [
    { label: 'Campaigns', icon: <RouteIcon /> },
    { label: 'Session', icon: activeSession
        ? <RadioButtonCheckedIcon sx={{ color: '#16a34a' }} />
        : <RadioButtonCheckedIcon /> },
    { label: 'History', icon: <HistoryIcon /> },
  ];

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Top bar */}
      <Box sx={{ bgcolor: '#0f172a', color: '#fff', px: 2, py: 1.25,
                 display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
        <Box sx={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 1.5,
                   bgcolor: 'rgba(56,189,248,0.16)' }}>
          <SignalCellularAltIcon sx={{ color: '#38bdf8', fontSize: 20 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1" fontWeight={700} sx={{ lineHeight: 1.1 }}>TNIP-R Field (Manual Fallback)</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(226,232,240,0.6)' }} noWrap>
            {user.fullName || user.email}
          </Typography>
        </Box>
        {activeSession
          ? <Chip size="small" icon={<RadioButtonCheckedIcon sx={{ fontSize: 11, color: '#22c55e !important' }} />}
              label="LIVE"
              sx={{ bgcolor: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.4)',
                    fontSize: '0.62rem', fontWeight: 700, height: 22,
                    animation: 'fieldLive 1.6s ease-in-out infinite',
                    '@keyframes fieldLive': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.55 } } }} />
          : <Chip size="small" icon={<CloudDoneIcon sx={{ fontSize: 13, color: 'rgba(226,232,240,0.7) !important' }} />}
              label="Idle" sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(226,232,240,0.8)',
                                 fontSize: '0.62rem', height: 22 }} />}
        <AccuracyBadge accuracy={gps?.accuracy} dark />
      </Box>

      {/* Manual Entry Warning Banner */}
      <Alert severity="warning" square sx={{ py: 0.5, px: 2, fontSize: '0.72rem', display: 'flex', alignItems: 'center' }}>
        Notice: This web interface is for manual fallback entry only. For automatic, high-fidelity real-time signal logging, please use the native Android Drive Tester app.
      </Alert>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {tab === 0 && <CampaignsTab onStart={startSession} activeSession={activeSession} />}
        {tab === 1 && (
          <SessionTab
            session={activeSession}
            readings={readings}
            gps={gps}
            gpsError={gpsError}
            onCapture={captureReading}
            onEnd={endSession}
          />
        )}
        {tab === 2 && <HistoryTab />}
      </Box>

      {/* Bottom nav */}
      <BottomNavigation value={tab} onChange={(_, v) => setTab(v)} showLabels
        sx={{ borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        {TABS.map((t) => (
          <BottomNavigationAction key={t.label} label={t.label} icon={t.icon} />
        ))}
      </BottomNavigation>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        message={toast} />
    </Box>
  );
}
