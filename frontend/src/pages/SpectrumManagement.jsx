import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Stack, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Select, MenuItem, FormControl, InputLabel, Tab, Tabs,
  CircularProgress, Alert, LinearProgress, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, IconButton, Drawer,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import PageHeader from '../components/PageHeader';

/* ── Constants ───────────────────────────────────────────────────────────── */
const TECH_COLOR = { '2G': '#546e7a', '3G': '#1565c0', '4G': '#2e7d32', '5G': '#6a1b9a', Other: '#795548' };
const STATUS_CHIP = {
  ACTIVE:    { color: 'success', label: 'Active' },
  PENDING:   { color: 'warning', label: 'Pending' },
  SUSPENDED: { color: 'error',   label: 'Suspended' },
  EXPIRED:   { color: 'default', label: 'Expired' },
};
const SEV_CHIP = {
  CRITICAL: { color: 'error',   label: 'Critical' },
  HIGH:     { color: 'error',   label: 'High' },
  MEDIUM:   { color: 'warning', label: 'Medium' },
  LOW:      { color: 'success', label: 'Low' },
};
const INT_STATUS_CHIP = {
  OPEN:          { color: 'error',   label: 'Open' },
  INVESTIGATING: { color: 'warning', label: 'Investigating' },
  RESOLVED:      { color: 'success', label: 'Resolved' },
  DISMISSED:     { color: 'default', label: 'Dismissed' },
};

const OP_COLORS = { Orange: '#ff7900', Africell: '#8e24aa', Qcell: '#5b2d8e', SierraTel: '#00a3e0' };
function opColor(name) {
  for (const [k, v] of Object.entries(OP_COLORS)) {
    if (name?.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return '#1565c0';
}

/* ── Frequency band visualizer ───────────────────────────────────────────── */
function BandVisualizer({ bands, assignments }) {
  if (!bands?.length) return null;
  const absMin = Math.min(...bands.map((b) => Number(b.freq_min)));
  const absMax = Math.max(...bands.map((b) => Number(b.freq_max)));
  const range  = absMax - absMin || 1;

  return (
    <Paper elevation={2} sx={{ p: 2.5, mb: 3 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
        Frequency Band Map (MHz)
      </Typography>
      <Box sx={{ position: 'relative' }}>
        {/* Band lanes */}
        {bands.map((band) => {
          const leftPct  = ((Number(band.freq_min) - absMin) / range) * 100;
          const widthPct = ((Number(band.freq_max) - Number(band.freq_min)) / range) * 100;
          const opBlocks = assignments?.filter((a) => a.band_name === band.band_name) || [];
          return (
            <Box key={band.band_name} sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="caption" fontWeight={700} sx={{ minWidth: 90 }}>
                  {band.band_name}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {band.freq_min}–{band.freq_max} MHz · {band.total_bw_mhz} MHz total
                </Typography>
                {band.technologies?.split(',').map((t) => (
                  <Chip key={t} label={t} size="small"
                    sx={{ fontSize: '0.6rem', height: 16,
                          bgcolor: TECH_COLOR[t] || '#607d8b', color: '#fff' }} />
                ))}
              </Stack>
              {/* Track */}
              <Box sx={{ position: 'relative', height: 28, bgcolor: 'action.hover', borderRadius: 1 }}>
                {opBlocks.map((a, i) => {
                  const aLeft  = ((Number(a.frequency_low) - absMin) / range) * 100;
                  const aWidth = ((Number(a.frequency_high) - Number(a.frequency_low)) / range) * 100;
                  const col    = opColor(a.operator_name);
                  return (
                    <Tooltip key={i}
                      title={`${a.operator_name} · ${a.frequency_low}–${a.frequency_high} MHz · ${a.technology} · ${a.status}`}>
                      <Box sx={{
                        position: 'absolute',
                        left:   `${aLeft}%`,
                        width:  `${Math.max(aWidth, 0.5)}%`,
                        top: 2, bottom: 2,
                        bgcolor: col,
                        opacity: a.status === 'ACTIVE' ? 0.85 : 0.35,
                        borderRadius: 0.5,
                        border: '1px solid',
                        borderColor: col,
                        cursor: 'default',
                        overflow: 'hidden',
                        display: 'flex', alignItems: 'center', px: 0.5,
                      }}>
                        <Typography variant="caption" noWrap
                          sx={{ color: '#fff', fontSize: '0.55rem', lineHeight: 1 }}>
                          {a.operator_name?.split(' ')[0]}
                        </Typography>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          );
        })}
        {/* Axis labels */}
        <Box sx={{ position: 'relative', height: 16, mt: 0.5 }}>
          {bands.map((band) => {
            const leftPct = ((Number(band.freq_min) - absMin) / range) * 100;
            return (
              <Typography key={band.band_name} variant="caption"
                color="text.disabled"
                sx={{ position: 'absolute', left: `${leftPct}%`, fontSize: '0.6rem', transform: 'translateX(-50%)' }}>
                {band.freq_min}
              </Typography>
            );
          })}
          <Typography variant="caption" color="text.disabled"
            sx={{ position: 'absolute', right: 0, fontSize: '0.6rem' }}>
            {absMax} MHz
          </Typography>
        </Box>
        {/* Legend */}
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 1.5 }}>
          {Object.entries(OP_COLORS).map(([name, color]) => (
            <Stack key={name} direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 10, height: 10, bgcolor: color, borderRadius: '2px' }} />
              <Typography variant="caption" color="text.secondary">{name}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Paper>
  );
}

/* ── Stat card ───────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, sub, onClick, active }) {
  return (
    <Paper elevation={2} onClick={onClick}
      sx={{ p: 2, borderTop: `4px solid ${color}`, height: '100%', cursor: onClick ? 'pointer' : 'default',
            outline: active ? `2px solid ${color}` : 'none',
            '&:hover': onClick ? { bgcolor: 'action.hover' } : {} }}>
      <Typography variant="h4" fontWeight={700} color={color}>{value ?? '—'}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {sub && <Typography variant="caption" color="text.disabled">{sub}</Typography>}
    </Paper>
  );
}

/* ── Assignment dialog ───────────────────────────────────────────────────── */
const BANDS = ['700 MHz','850 MHz','900 MHz','1800 MHz','2100 MHz','2300 MHz','2600 MHz','3500 MHz'];
const TECHS = ['2G','3G','4G','5G','Other'];

function AssignmentDialog({ open, onClose, onSave, initial, operators }) {
  const blank = {
    operator_id: '', band_name: '', frequency_low: '', frequency_high: '',
    bandwidth_mhz: '', technology: '4G', region: 'National', license_ref: '',
    status: 'ACTIVE', assigned_date: '', expiry_date: '', fee_usd: '', notes: '',
  };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial
      ? { ...blank, ...initial, assigned_date: initial.assigned_date?.slice(0,10) || '', expiry_date: initial.expiry_date?.slice(0,10) || '' }
      : blank);
  }, [initial, open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Assignment' : 'New Spectrum Assignment'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Operator *</InputLabel>
              <Select value={form.operator_id} label="Operator *" onChange={set('operator_id')}>
                {operators.map((o) => (
                  <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Band *</InputLabel>
              <Select value={form.band_name} label="Band *" onChange={set('band_name')}>
                {BANDS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Technology</InputLabel>
              <Select value={form.technology} label="Technology" onChange={set('technology')}>
                {TECHS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <TextField size="small" fullWidth label="Freq Low (MHz)" type="number"
              value={form.frequency_low} onChange={set('frequency_low')} />
          </Grid>
          <Grid item xs={4}>
            <TextField size="small" fullWidth label="Freq High (MHz)" type="number"
              value={form.frequency_high} onChange={set('frequency_high')} />
          </Grid>
          <Grid item xs={4}>
            <TextField size="small" fullWidth label="Bandwidth (MHz)" type="number"
              value={form.bandwidth_mhz} onChange={set('bandwidth_mhz')} />
          </Grid>
          <Grid item xs={6}>
            <TextField size="small" fullWidth label="Region"
              value={form.region} onChange={set('region')} />
          </Grid>
          <Grid item xs={6}>
            <TextField size="small" fullWidth label="License Ref"
              value={form.license_ref} onChange={set('license_ref')} />
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={form.status} label="Status" onChange={set('status')}>
                {['ACTIVE','PENDING','SUSPENDED','EXPIRED'].map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <TextField size="small" fullWidth label="Assigned Date" type="date"
              InputLabelProps={{ shrink: true }} value={form.assigned_date} onChange={set('assigned_date')} />
          </Grid>
          <Grid item xs={4}>
            <TextField size="small" fullWidth label="Expiry Date" type="date"
              InputLabelProps={{ shrink: true }} value={form.expiry_date} onChange={set('expiry_date')} />
          </Grid>
          <Grid item xs={6}>
            <TextField size="small" fullWidth label="Fee (USD)" type="number"
              value={form.fee_usd} onChange={set('fee_usd')} />
          </Grid>
          <Grid item xs={12}>
            <TextField size="small" fullWidth multiline rows={2} label="Notes"
              value={form.notes} onChange={set('notes')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !form.operator_id || !form.band_name}>
          {saving ? <CircularProgress size={18} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Interference dialog ─────────────────────────────────────────────────── */
function InterferenceDialog({ open, onClose, onSave, initial, operators }) {
  const blank = {
    reporter_op_id: '', affected_op_id: '', band_name: '', frequency_mhz: '',
    region: '', lat: '', lng: '', severity: 'MEDIUM', description: '',
  };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial ? { ...blank, ...initial } : blank); }, [initial, open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Update Interference Report' : 'File Interference Report'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Reporting Operator</InputLabel>
              <Select value={form.reporter_op_id} label="Reporting Operator" onChange={set('reporter_op_id')}>
                <MenuItem value="">— None —</MenuItem>
                {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Affected Operator</InputLabel>
              <Select value={form.affected_op_id} label="Affected Operator" onChange={set('affected_op_id')}>
                <MenuItem value="">— Unknown —</MenuItem>
                {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Band</InputLabel>
              <Select value={form.band_name} label="Band" onChange={set('band_name')}>
                <MenuItem value="">— Unknown —</MenuItem>
                {BANDS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField size="small" fullWidth label="Frequency (MHz)" type="number"
              value={form.frequency_mhz} onChange={set('frequency_mhz')} />
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Severity</InputLabel>
              <Select value={form.severity} label="Severity" onChange={set('severity')}>
                {['CRITICAL','HIGH','MEDIUM','LOW'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={8}>
            <TextField size="small" fullWidth label="Region / Location"
              value={form.region} onChange={set('region')} />
          </Grid>
          <Grid item xs={12}>
            <TextField size="small" fullWidth multiline rows={3} label="Description *"
              value={form.description} onChange={set('description')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !form.description}>
          {saving ? <CircularProgress size={18} /> : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Interference update drawer ──────────────────────────────────────────── */
function InterferenceDrawer({ item, onClose, onUpdate, operators }) {
  const [status, setStatus]   = useState('');
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (item) { setStatus(item.status); setNotes(item.resolution_notes || ''); }
  }, [item]);

  const save = async () => {
    setSaving(true);
    try { await onUpdate(item.report_id, { status, resolution_notes: notes }); onClose(); }
    finally { setSaving(false); }
  };

  if (!item) return null;
  const sc = INT_STATUS_CHIP[item.status] || {};

  return (
    <Drawer anchor="right" open={!!item} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, p: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>Interference Report</Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Stack>
      <Typography variant="caption" color="text.disabled">{item.report_ref}</Typography>
      <Stack spacing={1.5} sx={{ mt: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Reported by</Typography>
          <Typography variant="body2">{item.reporter_name || '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Affected operator</Typography>
          <Typography variant="body2">{item.affected_name || '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Band / Frequency</Typography>
          <Typography variant="body2">
            {item.band_name || '—'}{item.frequency_mhz ? ` · ${item.frequency_mhz} MHz` : ''}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Region</Typography>
          <Typography variant="body2">{item.region || '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Severity</Typography><br />
          <Chip size="small" label={SEV_CHIP[item.severity]?.label || item.severity}
            color={SEV_CHIP[item.severity]?.color} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Description</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{item.description}</Typography>
        </Box>
        <Divider />
        <FormControl fullWidth size="small">
          <InputLabel>Status</InputLabel>
          <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
            {['OPEN','INVESTIGATING','RESOLVED','DISMISSED'].map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField size="small" fullWidth multiline rows={3}
          label="Resolution Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button variant="contained" onClick={save} disabled={saving} startIcon={<CheckCircleIcon />}>
          {saving ? <CircularProgress size={18} /> : 'Update Report'}
        </Button>
      </Stack>
    </Drawer>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function SpectrumManagement() {
  const { user } = useAuth();
  const canWrite = ['SYSTEM_ADMIN','REGULATOR_ADMIN'].includes(user?.role);

  const [tab, setTab]             = useState(0);
  const [summary, setSummary]     = useState({});
  const [bandData, setBandData]   = useState({ bands: [], assignments: [] });
  const [assignments, setAssign]  = useState([]);
  const [interference, setIntf]   = useState([]);
  const [watchlist, setWatch]     = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading]     = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [bandFilter, setBandFilter]     = useState('');
  const [intfStatus, setIntfStatus]     = useState('');

  const [assignDlg, setAssignDlg]   = useState(false);
  const [editAssign, setEditAssign] = useState(null);
  const [intfDlg, setIntfDlg]       = useState(false);
  const [drawerItem, setDrawerItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, bandRes, assignRes, intfRes, watchRes, opRes] = await Promise.all([
        api.get('/spectrum/summary'),
        api.get('/spectrum/band-summary'),
        api.get('/spectrum', { params: { status: statusFilter || undefined, band: bandFilter || undefined } }),
        api.get('/spectrum/interference', { params: { status: intfStatus || undefined } }),
        api.get('/spectrum/expiry-watchlist', { params: { days: 180 } }),
        api.get('/operators'),
      ]);
      setSummary(sumRes.data.data || {});
      setBandData(bandRes.data.data || { bands: [], assignments: [] });
      setAssign(assignRes.data.data || []);
      setIntf(intfRes.data.data || []);
      setWatch(watchRes.data.data || []);
      setOperators((opRes.data.data || []).filter((o) => o.status === 'ACTIVE'));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [statusFilter, bandFilter, intfStatus]);

  useEffect(() => { load(); }, [load]);

  const saveAssignment = async (form) => {
    if (editAssign) {
      await api.put(`/spectrum/${editAssign.assignment_id}`, form);
    } else {
      await api.post('/spectrum', form);
    }
    setEditAssign(null);
    load();
  };

  const deleteAssignment = async (id) => {
    if (!window.confirm('Delete this spectrum assignment?')) return;
    await api.delete(`/spectrum/${id}`);
    load();
  };

  const saveInterference = async (form) => {
    await api.post('/spectrum/interference', form);
    load();
  };

  const updateInterference = async (id, data) => {
    await api.put(`/spectrum/interference/${id}`, data);
    load();
  };

  const uniqueBands = [...new Set(assignments.map((a) => a.band_name))].sort();

  const inf = summary.interference || {};

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <PageHeader
        icon={<SignalCellularAltIcon />}
        title="Spectrum Management"
        subtitle="Frequency assignments · band visualizer · interference tracking · expiry watchlist"
        actions={canWrite && (
          <>
            <Button size="small" variant="outlined" color="inherit"
              startIcon={<WarningAmberIcon />}
              onClick={() => setIntfDlg(true)}>
              File Interference
            </Button>
            <Button size="small" variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditAssign(null); setAssignDlg(true); }}>
              New Assignment
            </Button>
          </>
        )}
      />

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard label="Active Assignments" value={summary.active}
            color="#1565c0" sub={`${summary.band_count || 0} bands · ${summary.operator_count || 0} operators`} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Expiring (30d)" value={summary.expiring_30d}
            color={summary.expiring_30d > 0 ? '#e65100' : '#2e7d32'}
            sub={`${summary.expiring_90d || 0} expiring within 90d`} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Open Interference" value={inf.open}
            color={inf.critical_open > 0 ? '#c62828' : '#757575'}
            sub={`${inf.critical_open || 0} critical · ${inf.investigating || 0} investigating`} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Total Bandwidth" value={summary.total_bw_mhz ? `${summary.total_bw_mhz} MHz` : '—'}
            color="#4a148c" sub={`across ${summary.total || 0} assignments`} />
        </Grid>
      </Grid>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}

      {!loading && (
        <>
          {/* Band visualizer */}
          <BandVisualizer bands={bandData.bands} assignments={bandData.assignments} />

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label={`Assignments (${assignments.length})`} />
            <Tab label={`Interference (${interference.length})`} />
            <Tab label={`Expiry Watchlist (${watchlist.length})`} />
          </Tabs>

          {/* ── Tab 0: Assignments ── */}
          {tab === 0 && (
            <>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={statusFilter} label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}>
                    <MenuItem value="">All statuses</MenuItem>
                    {['ACTIVE','PENDING','SUSPENDED','EXPIRED'].map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Band</InputLabel>
                  <Select value={bandFilter} label="Band"
                    onChange={(e) => setBandFilter(e.target.value)}>
                    <MenuItem value="">All bands</MenuItem>
                    {uniqueBands.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>

              {assignments.length === 0
                ? <Alert severity="info">No spectrum assignments found. Create the first one using "New Assignment".</Alert>
                : (
                  <TableContainer component={Paper} elevation={2}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell>Ref</TableCell>
                          <TableCell>Operator</TableCell>
                          <TableCell>Band</TableCell>
                          <TableCell>Frequency Range</TableCell>
                          <TableCell>BW</TableCell>
                          <TableCell>Tech</TableCell>
                          <TableCell>Region</TableCell>
                          <TableCell>Expiry</TableCell>
                          <TableCell>Status</TableCell>
                          {canWrite && <TableCell align="right">Actions</TableCell>}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {assignments.map((a) => {
                          const sc = STATUS_CHIP[a.status] || {};
                          const expiring = a.days_to_expiry != null && a.days_to_expiry <= 30 && a.status === 'ACTIVE';
                          return (
                            <TableRow key={a.assignment_id} hover
                              sx={{ bgcolor: expiring ? 'rgba(230,81,0,0.04)' : 'inherit' }}>
                              <TableCell>
                                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                                  {a.assignment_ref}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%',
                                             bgcolor: opColor(a.operator_name), flexShrink: 0 }} />
                                  <Typography variant="body2">{a.operator_name}</Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>{a.band_name}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {a.frequency_low}–{a.frequency_high} MHz
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{a.bandwidth_mhz} MHz</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip label={a.technology} size="small"
                                  sx={{ bgcolor: TECH_COLOR[a.technology] || '#607d8b', color: '#fff', fontSize: '0.65rem', height: 18 }} />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">{a.region}</Typography>
                              </TableCell>
                              <TableCell>
                                {a.expiry_date ? (
                                  <Box>
                                    <Typography variant="body2"
                                      color={expiring ? 'error.main' : 'text.primary'}>
                                      {new Date(a.expiry_date).toLocaleDateString()}
                                    </Typography>
                                    {a.days_to_expiry != null && (
                                      <Typography variant="caption"
                                        color={expiring ? 'error' : 'text.disabled'}>
                                        {a.days_to_expiry}d left
                                      </Typography>
                                    )}
                                  </Box>
                                ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                              </TableCell>
                              <TableCell>
                                <Chip size="small" label={sc.label || a.status} color={sc.color}
                                  sx={{ fontSize: '0.68rem' }} />
                              </TableCell>
                              {canWrite && (
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small"
                                      onClick={() => { setEditAssign(a); setAssignDlg(true); }}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" color="error"
                                      onClick={() => deleteAssignment(a.assignment_id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
            </>
          )}

          {/* ── Tab 1: Interference reports ── */}
          {tab === 1 && (
            <>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={intfStatus} label="Status"
                    onChange={(e) => setIntfStatus(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    {['OPEN','INVESTIGATING','RESOLVED','DISMISSED'].map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {interference.length === 0
                ? <Alert severity="success">No interference reports{intfStatus ? ` with status "${intfStatus}"` : ''}.</Alert>
                : (
                  <TableContainer component={Paper} elevation={2}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell>Ref</TableCell>
                          <TableCell>Reporter</TableCell>
                          <TableCell>Affected</TableCell>
                          <TableCell>Band / Freq</TableCell>
                          <TableCell>Region</TableCell>
                          <TableCell>Severity</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Reported</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {interference.map((r) => {
                          const sc = INT_STATUS_CHIP[r.status] || {};
                          const sv = SEV_CHIP[r.severity] || {};
                          return (
                            <TableRow key={r.report_id} hover
                              sx={{ bgcolor: r.severity === 'CRITICAL' && r.status === 'OPEN'
                                ? 'rgba(198,40,40,0.04)' : 'inherit' }}>
                              <TableCell>
                                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                  {r.report_ref}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{r.reporter_name || '—'}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{r.affected_name || '—'}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{r.band_name || '—'}</Typography>
                                {r.frequency_mhz && (
                                  <Typography variant="caption" color="text.disabled">{r.frequency_mhz} MHz</Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">{r.region || '—'}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip size="small" label={sv.label || r.severity} color={sv.color}
                                  sx={{ fontSize: '0.68rem' }} />
                              </TableCell>
                              <TableCell>
                                <Chip size="small" label={sc.label || r.status} color={sc.color}
                                  sx={{ fontSize: '0.68rem' }} />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {new Date(r.reported_at).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Button size="small" onClick={() => setDrawerItem(r)}>View</Button>
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

          {/* ── Tab 2: Expiry watchlist ── */}
          {tab === 2 && (
            watchlist.length === 0
              ? <Alert severity="success">No spectrum assignments expiring within 180 days.</Alert>
              : (
                <TableContainer component={Paper} elevation={2}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell>Assignment</TableCell>
                        <TableCell>Operator</TableCell>
                        <TableCell>Band</TableCell>
                        <TableCell>Frequency</TableCell>
                        <TableCell>Tech</TableCell>
                        <TableCell>Expiry Date</TableCell>
                        <TableCell>Days Left</TableCell>
                        <TableCell>Urgency</TableCell>
                        {canWrite && <TableCell />}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {watchlist.map((a) => {
                        const urgent = a.days_to_expiry <= 30;
                        const warn   = a.days_to_expiry <= 90;
                        return (
                          <TableRow key={a.assignment_id} hover
                            sx={{ bgcolor: urgent ? 'rgba(198,40,40,0.04)' : warn ? 'rgba(230,81,0,0.03)' : 'inherit' }}>
                            <TableCell>
                              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                {a.assignment_ref}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%',
                                           bgcolor: opColor(a.operator_name), flexShrink: 0 }} />
                                <Typography variant="body2">{a.operator_name}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>{a.band_name}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {a.frequency_low}–{a.frequency_high} MHz
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={a.technology} size="small"
                                sx={{ bgcolor: TECH_COLOR[a.technology] || '#607d8b', color: '#fff', fontSize: '0.65rem', height: 18 }} />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {new Date(a.expiry_date).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={700}
                                color={urgent ? 'error.main' : warn ? 'warning.main' : 'text.primary'}>
                                {a.days_to_expiry}d
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip size="small"
                                label={urgent ? 'CRITICAL' : warn ? 'HIGH' : 'MEDIUM'}
                                color={urgent ? 'error' : warn ? 'warning' : 'info'}
                                sx={{ fontSize: '0.68rem' }} />
                            </TableCell>
                            {canWrite && (
                              <TableCell>
                                <Button size="small"
                                  onClick={() => { setEditAssign(a); setAssignDlg(true); }}>
                                  Renew
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
          )}
        </>
      )}

      {/* Dialogs */}
      <AssignmentDialog
        open={assignDlg}
        onClose={() => { setAssignDlg(false); setEditAssign(null); }}
        onSave={saveAssignment}
        initial={editAssign}
        operators={operators}
      />
      <InterferenceDialog
        open={intfDlg}
        onClose={() => setIntfDlg(false)}
        onSave={saveInterference}
        initial={null}
        operators={operators}
      />
      <InterferenceDrawer
        item={drawerItem}
        onClose={() => setDrawerItem(null)}
        onUpdate={updateInterference}
        operators={operators}
      />
    </Box>
  );
}
