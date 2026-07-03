import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Divider,
  CircularProgress, Alert, Button, IconButton,
  TextField, Select, MenuItem, FormControl, InputLabel,
  BottomNavigation, BottomNavigationAction, Snackbar,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Slide, Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress,
} from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import HistoryIcon from '@mui/icons-material/History';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WifiOffIcon from '@mui/icons-material/WifiOff';
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

/* ── Signal quality colours ──────────────────────────────────────────────── */
function rsrpColor(v) {
  if (v == null) return '#757575';
  if (v >= -85)  return '#2e7d32';
  if (v >= -100) return '#f57f17';
  return '#c62828';
}
function rsrpLabel(v) {
  if (v == null) return '—';
  if (v >= -85)  return 'Excellent';
  if (v >= -100) return 'Good';
  if (v >= -110) return 'Fair';
  return 'Poor';
}

/* ── GPS accuracy badge ──────────────────────────────────────────────────── */
function AccuracyBadge({ accuracy }) {
  const color = accuracy == null ? '#757575' : accuracy <= 10 ? '#2e7d32' : accuracy <= 30 ? '#f57f17' : '#c62828';
  return (
    <Chip size="small" icon={<MyLocationIcon sx={{ fontSize: 14 }} />}
      label={accuracy != null ? `±${accuracy.toFixed(0)}m` : 'No GPS'}
      sx={{ bgcolor: color, color: '#fff', fontSize: '0.68rem', height: 22 }} />
  );
}

/* ── Signal meter bar ────────────────────────────────────────────────────── */
function SignalBar({ label, value, min, max, unit = '' }) {
  const pct = value != null ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  const color = pct > 60 ? '#2e7d32' : pct > 30 ? '#f57f17' : '#c62828';
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.3 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="caption" fontWeight={700}
          sx={{ color: value != null ? color : 'text.disabled' }}>
          {value != null ? `${value}${unit}` : '—'}
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={pct}
        sx={{ height: 5, borderRadius: 3, bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { bgcolor: color } }} />
    </Box>
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
            {gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)} · <AccuracyBadge accuracy={gps.accuracy} />
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
        <Typography variant="body2" sx={{ mb: 1 }}>
          {readingCount} reading{readingCount !== 1 ? 's' : ''} captured.
          {offlineCount > 0 && ` (${offlineCount} pending upload)`}
        </Typography>
        <TextField fullWidth size="small" multiline rows={2} label="Session notes (optional)"
          value={notes} onChange={(e) => setNotes(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={submit} disabled={ending}
          startIcon={ending ? <CircularProgress size={16} /> : <StopCircleIcon />}>
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

  const openStart = (camp) => { setSelCamp(camp); setStartDlg(true); };

  const doStart = async () => {
    setStarting(true);
    try {
      await onStart({
        campaignId:  selCamp?.campaign_id,
        operatorId:  selCamp?.operator_id,
        technology:  form.technology,
        routeType:   form.routeType,
        deviceModel: form.deviceModel,
      });
      setStartDlg(false);
    } finally { setStarting(false); }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        My Assigned Campaigns
      </Typography>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}

      {!loading && campaigns.length === 0 && (
        <Alert severity="info">No active campaigns assigned to you.</Alert>
      )}

      <Stack spacing={1.5}>
        {campaigns.map((c) => (
          <Paper key={c.campaign_id} elevation={2} sx={{ p: 2, borderLeft: '4px solid #1565c0' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ flex: 1, mr: 1 }}>
                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                  {c.campaign_ref}
                </Typography>
                <Typography variant="body2" fontWeight={700}>{c.campaign_name}</Typography>
                <Typography variant="caption" color="text.secondary">{c.operator_name}</Typography>
              </Box>
              <Chip size="small" label={c.status}
                color={c.status === 'IN_PROGRESS' ? 'success' : 'warning'}
                sx={{ fontSize: '0.65rem' }} />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {c.planned_end ? `Due ${new Date(c.planned_end).toLocaleDateString()}` : ''}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Button size="small" variant="contained" startIcon={<RouteIcon />}
                disabled={!!activeSession}
                onClick={() => openStart(c)}>
                Start Test
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>

      {/* Ad-hoc start (no campaign) */}
      <Box sx={{ mt: 3 }}>
        <Divider sx={{ mb: 2 }}><Typography variant="caption" color="text.disabled">or start ad-hoc</Typography></Divider>
        <Button fullWidth variant="outlined" startIcon={<RouteIcon />}
          disabled={!!activeSession}
          onClick={() => { setSelCamp(null); setStartDlg(true); }}>
          Start Ad-Hoc Drive Test
        </Button>
      </Box>

      {/* Start dialog */}
      <Dialog open={startDlg} onClose={() => setStartDlg(false)} fullWidth maxWidth="xs">
        <DialogTitle>
          {selCamp ? `Start Test — ${selCamp.campaign_name}` : 'Start Ad-Hoc Drive Test'}
        </DialogTitle>
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
            startIcon={starting ? <CircularProgress size={16} /> : <RadioButtonCheckedIcon />}>
            Start
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
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <RouteIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography color="text.secondary">No active session.</Typography>
        <Typography variant="caption" color="text.disabled">Go to Campaigns to start a drive test.</Typography>
      </Box>
    );
  }

  const lastReading = readings[readings.length - 1];
  const avgRsrp = readings.length
    ? readings.reduce((s, r) => s + (r.rsrp ?? 0), 0) / readings.filter((r) => r.rsrp != null).length
    : null;

  return (
    <Box sx={{ p: 2 }}>
      {/* Session header */}
      <Paper elevation={2} sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg,#1b5e20,#2e7d32)', color: '#fff' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <RadioButtonCheckedIcon sx={{ fontSize: 14, animation: 'pulse 1s infinite' }} />
              <Typography variant="caption" sx={{ opacity: 0.85 }}>RECORDING</Typography>
            </Stack>
            <Typography variant="body2" fontWeight={700}>{session.testName}</Typography>
          </Box>
          <Chip size="small" label={`${readings.length} readings`}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.68rem' }} />
        </Stack>
      </Paper>

      {/* GPS status */}
      <Paper elevation={1} sx={{ p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <MyLocationIcon color={gps ? 'success' : 'disabled'} />
          <Box sx={{ flex: 1 }}>
            {gps
              ? <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)}
                </Typography>
              : <Typography variant="body2" color="text.secondary">
                  {gpsError || 'Acquiring GPS…'}
                </Typography>}
          </Box>
          {gps && <AccuracyBadge accuracy={gps.accuracy} />}
        </Stack>
      </Paper>

      {/* Signal meters (from last reading) */}
      {lastReading && (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Last Reading Signal Quality
          </Typography>
          <Stack spacing={1}>
            <SignalBar label="RSRP" value={lastReading.rsrp} min={-140} max={-44} unit=" dBm" />
            <SignalBar label="SINR" value={lastReading.sinr} min={-20}  max={30}  unit=" dB" />
            <SignalBar label="DL"   value={lastReading.dl_throughput} min={0} max={150} unit=" Mbps" />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
            <Chip size="small" label={rsrpLabel(lastReading.rsrp)}
              sx={{ bgcolor: rsrpColor(lastReading.rsrp), color: '#fff', fontSize: '0.65rem' }} />
            {lastReading.band && (
              <Chip size="small" label={lastReading.band} variant="outlined" sx={{ fontSize: '0.65rem' }} />
            )}
            {lastReading.event_type && lastReading.event_type !== 'NORMAL' && (
              <Chip size="small" label={lastReading.event_type.replace(/_/g,' ')} color="warning" sx={{ fontSize: '0.65rem' }} />
            )}
          </Stack>
        </Paper>
      )}

      {/* Session stats */}
      <Paper elevation={1} sx={{ p: 1.5, mb: 2 }}>
        <Grid3 items={[
          { label: 'Readings', value: readings.length },
          { label: 'Avg RSRP', value: avgRsrp != null ? `${avgRsrp.toFixed(1)} dBm` : '—' },
          { label: 'Offline Buffer', value: offlineCount },
        ]} />
      </Paper>

      {offlineCount > 0 && (
        <Alert severity="warning" icon={<WifiOffIcon />} sx={{ mb: 2 }}>
          {offlineCount} reading{offlineCount > 1 ? 's' : ''} in offline buffer — will sync on End Session.
        </Alert>
      )}

      {/* Actions */}
      <Stack spacing={1.5}>
        <Button fullWidth variant="contained" size="large"
          startIcon={<AddCircleIcon />}
          onClick={() => setReadDlg(true)}
          sx={{ py: 1.5, fontSize: '1rem' }}>
          Capture Reading
        </Button>
        <Button fullWidth variant="outlined" color="error" size="large"
          startIcon={<StopCircleIcon />}
          onClick={() => setEndDlg(true)}>
          End Session
        </Button>
      </Stack>

      {/* Recent readings list */}
      {readings.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Recent readings (latest first)
          </Typography>
          <List dense>
            {[...readings].reverse().slice(0, 8).map((r, i) => (
              <ListItem key={i} divider sx={{ py: 0.5 }}>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}
                      </Typography>
                    </Stack>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      RSRP {r.rsrp ?? '—'} dBm · SINR {r.sinr ?? '—'} dB · DL {r.dl_throughput ?? '—'} Mbps
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: rsrpColor(r.rsrp) }} />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <ReadingDialog open={readDlg} onClose={() => setReadDlg(false)} onCapture={onCapture} gps={gps} />
      <EndDialog open={endDlg} onClose={() => setEndDlg(false)} onEnd={onEnd}
        readingCount={readings.length} offlineCount={offlineCount} />
    </Box>
  );
}

/* ── Mini 3-col grid helper ──────────────────────────────────────────────── */
function Grid3({ items }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1 }}>
      {items.map(({ label, value }) => (
        <Box key={label} sx={{ textAlign: 'center' }}>
          <Typography variant="body2" fontWeight={700}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      ))}
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

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  if (!rows.length) return <Box sx={{ p: 2 }}><Alert severity="info">No sessions yet.</Alert></Box>;

  return (
    <List sx={{ p: 1 }}>
      {rows.map((r) => (
        <Paper key={r.drive_test_id} elevation={1} sx={{ mb: 1.5 }}>
          <ListItem alignItems="flex-start">
            <ListItemText
              primary={
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight={600}>{r.test_name}</Typography>
                  <Chip size="small" label={r.status}
                    color={r.status === 'COMPLETED' ? 'success' : 'default'}
                    sx={{ fontSize: '0.62rem', height: 18 }} />
                </Stack>
              }
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {r.operator_name} · {r.technology} · {new Date(r.test_date).toLocaleDateString()}
                  </Typography>
                  <Stack direction="row" spacing={1.5} sx={{ mt: 0.5 }}>
                    <Typography variant="caption">{r.sample_count} readings</Typography>
                    {r.avg_rsrp && <Typography variant="caption">RSRP {Number(r.avg_rsrp).toFixed(1)} dBm</Typography>}
                    {r.avg_dl   && <Typography variant="caption">DL {Number(r.avg_dl).toFixed(1)} Mbps</Typography>}
                  </Stack>
                </Box>
              }
            />
          </ListItem>
        </Paper>
      ))}
    </List>
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
    // Add to in-memory list immediately
    setReadings((prev) => [...prev, reading]);

    // Try to upload; if offline buffer it
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
    // Flush offline buffer first
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

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Top bar */}
      <Box sx={{ background: 'linear-gradient(135deg,#0d1b2a,#1b2838)', px: 2, py: 1.5,
                 display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <SignalCellularAltIcon sx={{ color: '#4fc3f7' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" fontWeight={700} color="#fff">TNIP-R Field</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            {user.fullName || user.email}
          </Typography>
        </Box>
        {activeSession && (
          <Chip size="small" icon={<RadioButtonCheckedIcon sx={{ fontSize: 10, color: '#f44336 !important' }} />}
            label="LIVE"
            sx={{ bgcolor: 'rgba(244,67,54,0.2)', color: '#f44336', border: '1px solid #f44336',
                  fontSize: '0.65rem', animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } } }} />
        )}
        {gps && <AccuracyBadge accuracy={gps.accuracy} />}
      </Box>

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
      <BottomNavigation value={tab} onChange={(_, v) => setTab(v)}
        sx={{ borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        <BottomNavigationAction label="Campaigns" icon={<RouteIcon />} />
        <BottomNavigationAction
          label="Session"
          icon={activeSession
            ? <RadioButtonCheckedIcon sx={{ color: '#f44336' }} />
            : <RadioButtonCheckedIcon />}
        />
        <BottomNavigationAction label="History" icon={<HistoryIcon />} />
      </BottomNavigation>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        message={toast} />
    </Box>
  );
}
