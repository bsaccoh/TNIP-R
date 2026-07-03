import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell,
  Drawer, Stack, Divider, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  CircularProgress, Alert, Grid,
} from '@mui/material';
import AddIcon              from '@mui/icons-material/Add';
import RefreshIcon          from '@mui/icons-material/Refresh';
import TrendingUpIcon       from '@mui/icons-material/TrendingUp';
import WarningAmberIcon     from '@mui/icons-material/WarningAmber';
import CheckCircleIcon      from '@mui/icons-material/CheckCircle';
import ErrorIcon            from '@mui/icons-material/Error';
import InfoIcon             from '@mui/icons-material/Info';
import AddchartIcon         from '@mui/icons-material/Addchart';
import GavelIcon            from '@mui/icons-material/Gavel';
import AutorenewIcon        from '@mui/icons-material/Autorenew';
import AssignmentIcon       from '@mui/icons-material/Assignment';
import { useAuth }          from '../auth/AuthContext';
import { api }              from '../api/client';

/* ── Constants ───────────────────────────────────────────────────────────── */
const STATUS_META = {
  PENDING:   { label: 'Pending',   color: 'default',  icon: <AssignmentIcon sx={{ fontSize: 14 }} /> },
  ON_TRACK:  { label: 'On Track',  color: 'success',  icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  AT_RISK:   { label: 'At Risk',   color: 'warning',  icon: <WarningAmberIcon sx={{ fontSize: 14 }} /> },
  BREACHED:  { label: 'Breached',  color: 'error',    icon: <ErrorIcon sx={{ fontSize: 14 }} /> },
  FULFILLED: { label: 'Fulfilled', color: 'success',  icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  WAIVED:    { label: 'Waived',    color: 'default',  icon: <InfoIcon sx={{ fontSize: 14 }} /> },
};

const TYPE_META = {
  COVERAGE:  { label: 'Coverage',   color: '#1565c0' },
  ROLLOUT:   { label: 'Rollout',    color: '#6a1b9a' },
  SLA:       { label: 'SLA',        color: '#e65100' },
  REPORTING: { label: 'Reporting',  color: '#00695c' },
  FINANCIAL: { label: 'Financial',  color: '#b71c1c' },
  OTHER:     { label: 'Other',      color: '#455a64' },
};

const SEVERITY_COLOR = { LOW: '#43a047', MEDIUM: '#f9a825', HIGH: '#ef6c00', CRITICAL: '#c62828' };

const REGULATOR_ROLES = ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function StatusChip({ status }) {
  const m = STATUS_META[status] ?? { label: status, color: 'default' };
  return <Chip label={m.label} color={m.color} size="small" icon={m.icon} />;
}

function TypeChip({ type }) {
  const m = TYPE_META[type] ?? TYPE_META.OTHER;
  return <Chip label={m.label} size="small"
    sx={{ bgcolor: `${m.color}18`, color: m.color, fontWeight: 700, fontSize: 11 }} />;
}

function ProgressBar({ current, target, unit, status }) {
  if (target == null) return <Typography variant="caption" color="text.secondary">—</Typography>;
  const pct = Math.min(100, Math.round(((current ?? 0) / target) * 100));
  const color = status === 'BREACHED' ? 'error' : status === 'AT_RISK' ? 'warning' : 'primary';
  return (
    <Box sx={{ minWidth: 120 }}>
      <LinearProgress variant="determinate" value={pct} color={color} sx={{ height: 6, borderRadius: 3 }} />
      <Typography variant="caption" color="text.secondary">
        {current ?? 0} / {target} {unit} ({pct}%)
      </Typography>
    </Box>
  );
}

function DeadlineLabel({ daysUntilDue, status }) {
  if (!daysUntilDue && daysUntilDue !== 0) return <Typography variant="caption" color="text.secondary">No deadline</Typography>;
  if (['FULFILLED','WAIVED'].includes(status)) return <Typography variant="caption" color="success.main">Closed</Typography>;
  if (daysUntilDue < 0) return <Typography variant="caption" color="error.main" fontWeight={700}>{Math.abs(daysUntilDue)}d overdue</Typography>;
  if (daysUntilDue <= 7) return <Typography variant="caption" color="warning.main" fontWeight={700}>{daysUntilDue}d left</Typography>;
  if (daysUntilDue <= 30) return <Typography variant="caption" color="warning.main">{daysUntilDue}d left</Typography>;
  return <Typography variant="caption" color="text.secondary">{daysUntilDue}d left</Typography>;
}

/* ── Create Obligation Dialog ────────────────────────────────────────────── */
function CreateDialog({ open, onClose, onCreated, operators }) {
  const init = {
    operatorId: '', title: '', description: '', obligationType: 'SLA',
    category: '', targetValue: '', targetUnit: '', dueDate: '',
    recurrence: 'ONCE', breachSeverity: 'MEDIUM', notes: '',
  };
  const [form, setForm] = useState(init);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.operatorId || !form.title) { setErr('Operator and title are required'); return; }
    setSaving(true); setErr('');
    try {
      const { data } = await api.post('/obligations', {
        ...form,
        targetValue: form.targetValue ? Number(form.targetValue) : null,
      });
      onCreated(data.data);
      onClose();
      setForm(init);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to create obligation');
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ background: 'linear-gradient(135deg,#4a148c,#7b1fa2)', color: '#fff', py: 2 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <GavelIcon /> Create License Obligation
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack gap={2.5}>
          <FormControl fullWidth>
            <InputLabel>Operator *</InputLabel>
            <Select value={form.operatorId} onChange={set('operatorId')} label="Operator *">
              {(operators ?? []).map(op => (
                <MenuItem key={op.operator_id} value={op.operator_id}>{op.operator_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Title *" value={form.title} onChange={set('title')} fullWidth
            placeholder="e.g. 4G Coverage ≥85% by Q4 2026" />
          <Stack direction="row" gap={2}>
            <FormControl fullWidth>
              <InputLabel>Obligation Type</InputLabel>
              <Select value={form.obligationType} onChange={set('obligationType')} label="Obligation Type">
                {Object.entries(TYPE_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select value={form.breachSeverity} onChange={set('breachSeverity')} label="Severity">
                {['LOW','MEDIUM','HIGH','CRITICAL'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
          <TextField label="Category" value={form.category} onChange={set('category')} fullWidth
            placeholder="e.g. 4G Coverage, NPS, Rollout Sites" />
          <Stack direction="row" gap={2}>
            <TextField label="Target Value" type="number" value={form.targetValue}
              onChange={set('targetValue')} fullWidth placeholder="85" />
            <TextField label="Unit" value={form.targetUnit} onChange={set('targetUnit')}
              fullWidth placeholder="% / sites / Mbps" />
          </Stack>
          <Stack direction="row" gap={2}>
            <TextField label="Due Date" type="date" value={form.dueDate}
              onChange={set('dueDate')} fullWidth InputLabelProps={{ shrink: true }} />
            <FormControl fullWidth>
              <InputLabel>Recurrence</InputLabel>
              <Select value={form.recurrence} onChange={set('recurrence')} label="Recurrence">
                {['ONCE','MONTHLY','QUARTERLY','ANNUAL'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
          <TextField label="Description" value={form.description} onChange={set('description')}
            multiline rows={2} fullWidth />
          <TextField label="Internal Notes" value={form.notes} onChange={set('notes')}
            multiline rows={2} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Create Obligation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Record Progress Dialog ──────────────────────────────────────────────── */
function ProgressDialog({ open, onClose, obligation, onSaved }) {
  const [value, setValue]   = useState('');
  const [date, setDate]     = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  useEffect(() => { if (open) { setValue(''); setNotes(''); setErr(''); } }, [open]);

  async function submit() {
    setSaving(true); setErr('');
    try {
      const { data } = await api.post(`/obligations/${obligation.obligation_id}/progress`, {
        measuredValue: value !== '' ? Number(value) : null,
        measurementDate: date, notes,
      });
      onSaved(data.data); onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to record progress');
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Record Progress — {obligation?.title}</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack gap={2.5} sx={{ mt: 1 }}>
          <TextField label={`Measured Value ${obligation?.target_unit ? `(${obligation.target_unit})` : ''}`}
            type="number" value={value} onChange={e => setValue(e.target.value)} fullWidth
            placeholder={obligation?.target_value ? `Target: ${obligation.target_value}` : ''} />
          <TextField label="Measurement Date" type="date" value={date}
            onChange={e => setDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Notes" value={notes} onChange={e => setNotes(e.target.value)}
            multiline rows={2} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Record'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Status Update Dialog ────────────────────────────────────────────────── */
function StatusDialog({ open, onClose, obligation, onSaved }) {
  const [status, setStatus]   = useState('');
  const [reason, setReason]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  useEffect(() => { if (open) { setStatus(''); setReason(''); setErr(''); } }, [open]);

  async function submit() {
    if (!status) { setErr('Select a status'); return; }
    if (status === 'WAIVED' && !reason.trim()) { setErr('Waiver reason is required'); return; }
    setSaving(true); setErr('');
    try {
      const { data } = await api.put(`/obligations/${obligation.obligation_id}/status`, {
        status, waiverReason: reason,
      });
      onSaved(data.data); onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to update status');
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Update Status — {obligation?.title}</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack gap={2.5} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>New Status *</InputLabel>
            <Select value={status} onChange={e => setStatus(e.target.value)} label="New Status *">
              {Object.entries(STATUS_META).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {status === 'WAIVED' && (
            <TextField label="Waiver Reason *" value={reason} onChange={e => setReason(e.target.value)}
              multiline rows={3} fullWidth />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Detail Drawer ───────────────────────────────────────────────────────── */
function ObligationDrawer({ obligation, open, onClose, onRefresh, isRegulator }) {
  const [progressOpen, setProgressOpen] = useState(false);
  const [statusOpen, setStatusOpen]     = useState(false);

  if (!obligation) return null;
  const progress = obligation.progress ?? [];
  const pct = obligation.target_value
    ? Math.min(100, Math.round(((obligation.current_value ?? 0) / obligation.target_value) * 100))
    : null;

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg,#4a148c,#7b1fa2)', px: 3, py: 2.5, color: '#fff' }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>{obligation.title}</Typography>
            <Typography variant="body2" sx={{ opacity: .7 }}>{obligation.obligation_ref}</Typography>
            <Stack direction="row" gap={1} mt={1} flexWrap="wrap">
              <TypeChip type={obligation.obligation_type} />
              <StatusChip status={obligation.status} />
              <Chip size="small" label={obligation.operator_name}
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }} />
            </Stack>
          </Box>
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography variant="caption" sx={{ opacity: .7 }}>Breach severity</Typography>
            <Typography variant="body2" fontWeight={700}
              sx={{ color: SEVERITY_COLOR[obligation.breach_severity] ?? '#fff' }}>
              {obligation.breach_severity}
            </Typography>
          </Box>
        </Stack>

        {/* Progress ring */}
        {pct !== null && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" gap={2}>
              <Box sx={{ flex: 1 }}>
                <LinearProgress variant="determinate" value={pct}
                  color={obligation.status === 'BREACHED' ? 'error' : obligation.status === 'AT_RISK' ? 'warning' : 'success'}
                  sx={{ height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,.15)',
                    '& .MuiLinearProgress-bar': { borderRadius: 5 } }} />
              </Box>
              <Typography variant="h6" fontWeight={800} sx={{ minWidth: 52, textAlign: 'right' }}>{pct}%</Typography>
            </Stack>
            <Typography variant="caption" sx={{ opacity: .7 }}>
              Current: {obligation.current_value ?? 0} / Target: {obligation.target_value} {obligation.target_unit}
            </Typography>
          </Box>
        )}

        {/* Due date */}
        {obligation.due_date && (
          <Typography variant="caption" sx={{ opacity: .8, display: 'block', mt: 1 }}>
            Due: {new Date(obligation.due_date).toLocaleDateString()} ·&nbsp;
            <DeadlineLabel daysUntilDue={obligation.days_until_due} status={obligation.status} />
          </Typography>
        )}

        {/* Actions */}
        {isRegulator && (
          <Stack direction="row" gap={1} mt={2}>
            <Button size="small" variant="contained" startIcon={<AddchartIcon />}
              onClick={() => setProgressOpen(true)}
              sx={{ bgcolor: 'rgba(255,255,255,.15)', '&:hover': { bgcolor: 'rgba(255,255,255,.25)' } }}>
              Record Progress
            </Button>
            <Button size="small" variant="outlined"
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}
              onClick={() => setStatusOpen(true)}>
              Update Status
            </Button>
          </Stack>
        )}
      </Box>

      <Box sx={{ px: 3, py: 2, overflowY: 'auto' }}>
        {obligation.description && (
          <Box mb={2}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Description</Typography>
            <Typography variant="body2" color="text.secondary">{obligation.description}</Typography>
          </Box>
        )}
        {obligation.category && (
          <Chip label={obligation.category} size="small" variant="outlined" sx={{ mb: 2 }} />
        )}
        {obligation.recurrence !== 'ONCE' && (
          <Chip label={`Recurrence: ${obligation.recurrence}`} size="small" variant="outlined" sx={{ mb: 2, ml: 1 }} />
        )}
        {obligation.notes && (
          <Alert severity="info" sx={{ mb: 2, py: 0 }}>
            <Typography variant="caption">{obligation.notes}</Typography>
          </Alert>
        )}
        {obligation.waiver_reason && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="caption"><strong>Waiver reason:</strong> {obligation.waiver_reason}</Typography>
          </Alert>
        )}

        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Progress History ({progress.length})
        </Typography>
        {progress.length === 0
          ? <Typography variant="body2" color="text.secondary">No progress recorded yet.</Typography>
          : progress.map(p => (
            <Box key={p.progress_id} sx={{ mb: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2" fontWeight={700}>
                  {p.measured_value} {obligation.target_unit}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(p.measurement_date).toLocaleDateString()}
                  {p.recorded_by_name && ` · ${p.recorded_by_name}`}
                </Typography>
              </Stack>
              {p.notes && (
                <Typography variant="caption" color="text.secondary">{p.notes}</Typography>
              )}
            </Box>
          ))}
      </Box>

      {progressOpen && (
        <ProgressDialog open onClose={() => setProgressOpen(false)} obligation={obligation}
          onSaved={(updated) => { setProgressOpen(false); onRefresh(updated); }} />
      )}
      {statusOpen && (
        <StatusDialog open onClose={() => setStatusOpen(false)} obligation={obligation}
          onSaved={(updated) => { setStatusOpen(false); onRefresh(updated); }} />
      )}
    </Drawer>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function Obligations() {
  const { user } = useAuth();
  const isRegulator = REGULATOR_ROLES.includes(user?.role);

  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [summary, setSummary]     = useState(null);
  const [operators, setOperators] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [drawerOpen, setDrawer]   = useState(false);
  const [createOpen, setCreate]   = useState(false);
  const [statusFilter, setStatus] = useState('');
  const [typeFilter, setType]     = useState('');
  const [autoUpdating, setAutoUp] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        api.get('/obligations', { params: { status: statusFilter || undefined, type: typeFilter || undefined } }),
        api.get('/obligations/summary'),
      ]);
      setRows(listRes.data.data?.rows ?? []);
      setSummary(sumRes.data.data);
    } finally { setLoading(false); }
  }, [statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isRegulator) return;
    api.get('/operators').then(r => setOperators(r.data.data?.operators ?? r.data.data ?? [])).catch(() => {});
  }, [isRegulator]);

  async function openDetail(row) {
    const { data } = await api.get(`/obligations/${row.obligation_id}`);
    setSelected(data.data);
    setDrawer(true);
  }

  function refreshSelected(updated) {
    setSelected(updated);
    setRows(prev => prev.map(r => r.obligation_id === updated.obligation_id ? { ...r, ...updated } : r));
  }

  async function autoUpdate() {
    setAutoUp(true);
    try {
      const { data } = await api.post('/obligations/auto-update');
      await load();
      alert(`Auto-update complete: ${data.data.breached} newly breached, ${data.data.atRisk} newly at-risk.`);
    } finally { setAutoUp(false); }
  }

  const statusCounts = {};
  (summary?.statusCounts ?? []).forEach(s => { statusCounts[s.status] = Number(s.count); });

  const statCards = [
    { label: 'Breached',  value: statusCounts.BREACHED ?? 0,  color: '#c62828', bg: '#ffebee' },
    { label: 'At Risk',   value: statusCounts.AT_RISK ?? 0,   color: '#e65100', bg: '#fff3e0' },
    { label: 'Pending',   value: statusCounts.PENDING ?? 0,   color: '#1565c0', bg: '#e3f2fd' },
    { label: 'On Track',  value: statusCounts.ON_TRACK ?? 0,  color: '#2e7d32', bg: '#e8f5e9' },
    { label: 'Fulfilled', value: statusCounts.FULFILLED ?? 0, color: '#455a64', bg: '#eceff1' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg,#4a148c,#7b1fa2)', borderRadius: 3, p: 3, mb: 3, color: '#fff' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1.5}>
            <GavelIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={700}>License Obligation Tracker</Typography>
              <Typography variant="body2" sx={{ opacity: .8 }}>
                Track SLA commitments, coverage targets, rollout milestones and breach status per operator
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" gap={1}>
            {isRegulator && (
              <>
                <Tooltip title="Auto-detect breaches & at-risk based on today's date">
                  <Button size="small" variant="outlined"
                    sx={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}
                    startIcon={autoUpdating ? <CircularProgress size={14} color="inherit" /> : <AutorenewIcon />}
                    onClick={autoUpdate} disabled={autoUpdating}>
                    Auto-Update
                  </Button>
                </Tooltip>
                <Button size="small" variant="contained" startIcon={<AddIcon />}
                  sx={{ bgcolor: 'rgba(255,255,255,.15)', '&:hover': { bgcolor: 'rgba(255,255,255,.25)' } }}
                  onClick={() => setCreate(true)}>
                  New Obligation
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* Stat Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 2, mb: 3 }}>
        {statCards.map(c => (
          <Paper key={c.label} elevation={0}
            onClick={() => setStatus(prev => prev === c.label.toUpperCase().replace(' ', '_') ? '' : c.label.toUpperCase().replace(' ', '_'))}
            sx={{ p: 2, border: `2px solid ${c.color}22`, bgcolor: c.bg, cursor: 'pointer',
              outline: statusFilter === c.label.toUpperCase().replace(' ', '_') ? `2px solid ${c.color}` : 'none',
              transition: 'outline .1s' }}>
            <Typography variant="h3" fontWeight={800} sx={{ color: c.color, lineHeight: 1 }}>{c.value}</Typography>
            <Typography variant="caption" sx={{ color: c.color, fontWeight: 600 }}>{c.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
          <Typography fontWeight={600} flexShrink={0}>Type:</Typography>
          {['', ...Object.keys(TYPE_META)].map(t => (
            <Chip key={t} label={t ? TYPE_META[t].label : 'All'} size="small"
              variant={typeFilter === t ? 'filled' : 'outlined'}
              color={typeFilter === t ? 'secondary' : 'default'}
              onClick={() => setType(t)} sx={{ cursor: 'pointer' }} />
          ))}
          <Box sx={{ flex: 1 }} />
          <IconButton size="small" onClick={load}><RefreshIcon /></IconButton>
        </Stack>
      </Paper>

      {/* Table */}
      <Paper>
        {loading && <LinearProgress />}
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
              <TableCell>Obligation</TableCell>
              <TableCell>Operator</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Due</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  {isRegulator ? 'No obligations yet — create one to start tracking' : 'No obligations assigned'}
                </TableCell>
              </TableRow>
            )}
            {rows.map(row => (
              <TableRow key={row.obligation_id} hover sx={{ cursor: 'pointer' }} onClick={() => openDetail(row)}>
                <TableCell>
                  <Typography fontWeight={600}>{row.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{row.obligation_ref}</Typography>
                  {row.category && <Chip label={row.category} size="small" variant="outlined" sx={{ ml: 1, height: 18, fontSize: 10 }} />}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{row.operator_name}</Typography>
                  {row.license_number && <Typography variant="caption" color="text.secondary">Lic: {row.license_number}</Typography>}
                </TableCell>
                <TableCell><TypeChip type={row.obligation_type} /></TableCell>
                <TableCell>
                  <ProgressBar current={row.current_value} target={row.target_value}
                    unit={row.target_unit} status={row.status} />
                </TableCell>
                <TableCell>
                  {row.due_date && (
                    <Typography variant="body2">{new Date(row.due_date).toLocaleDateString()}</Typography>
                  )}
                  <DeadlineLabel daysUntilDue={row.days_until_due} status={row.status} />
                </TableCell>
                <TableCell>
                  <Stack direction="row" alignItems="center" gap={.5}>
                    <StatusChip status={row.status} />
                    {row.breach_severity && ['BREACHED','AT_RISK'].includes(row.status) && (
                      <Chip size="small" label={row.breach_severity}
                        sx={{ height: 18, fontSize: 10, bgcolor: `${SEVERITY_COLOR[row.breach_severity]}22`,
                          color: SEVERITY_COLOR[row.breach_severity] }} />
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Upcoming obligations sidebar (shown when no filter active) */}
      {!statusFilter && !typeFilter && summary?.upcoming?.length > 0 && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            <TrendingUpIcon sx={{ fontSize: 16, mr: .5, verticalAlign: 'middle' }} />
            Upcoming Deadlines
          </Typography>
          <Grid container spacing={1}>
            {summary.upcoming.map(o => (
              <Grid item xs={12} sm={6} md={4} key={o.obligation_id}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover', cursor: 'pointer' }}
                  onClick={() => openDetail(o)}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, mr: 1 }}>{o.title}</Typography>
                    <StatusChip status={o.status} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {o.operator_name} · <DeadlineLabel daysUntilDue={o.days_until_due} status={o.status} />
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {createOpen && (
        <CreateDialog open onClose={() => setCreate(false)} operators={operators}
          onCreated={() => { setCreate(false); load(); }} />
      )}

      <ObligationDrawer
        obligation={selected}
        open={drawerOpen}
        onClose={() => setDrawer(false)}
        onRefresh={refreshSelected}
        isRegulator={isRegulator}
      />
    </Box>
  );
}
