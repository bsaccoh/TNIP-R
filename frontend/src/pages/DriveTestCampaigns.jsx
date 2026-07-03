import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, InputLabel, FormControl,
  Drawer, Tabs, Tab, LinearProgress, Divider, IconButton,
  CircularProgress, Alert, Card, CardContent, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CampaignIcon from '@mui/icons-material/Campaign';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';
import BarChartIcon from '@mui/icons-material/BarChart';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RouteIcon from '@mui/icons-material/Route';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../auth/AuthContext';

/* ── Constants ──────────────────────────────────────────────────────────── */
const STATUS_META = {
  PLANNING:    { label: 'Planning',    color: 'info' },
  IN_PROGRESS: { label: 'In Progress', color: 'warning' },
  COMPLETED:   { label: 'Completed',   color: 'success' },
  CANCELLED:   { label: 'Cancelled',   color: 'default' },
};

const STATUS_ORDER = ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const TECHNOLOGIES = ['2G', '3G', '4G/LTE', '5G', 'Multi-band'];

const AREAS = [
  'Western Area Urban', 'Western Area Rural', 'Bo District',
  'Kenema District', 'Makeni District', 'Kono District',
  'Bombali District', 'Tonkolili District', 'Port Loko District',
  'Kailahun District', 'Pujehun District', 'Bonthe District',
  'Moyamba District', 'Kambia District',
];

function fmt(val, unit = '') {
  if (val == null || val === '') return '—';
  return `${Number(val).toLocaleString()}${unit}`;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return diff;
}

/* ── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, color = '#1565c0', icon }) {
  return (
    <Paper elevation={2} sx={{ p: 2, borderTop: `4px solid ${color}`, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          {sub && <Typography variant="caption" color="text.disabled">{sub}</Typography>}
        </Box>
        {icon && <Box sx={{ color, opacity: 0.3, fontSize: 40 }}>{icon}</Box>}
      </Stack>
    </Paper>
  );
}

/* ── Progress bar ────────────────────────────────────────────────────────── */
function TestProgress({ done, planned }) {
  if (!planned) return <Typography variant="caption" color="text.disabled">—</Typography>;
  const pct = Math.min(100, Math.round((done / planned) * 100));
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption">{done}/{planned} tests</Typography>
        <Typography variant="caption" fontWeight={600}>{pct}%</Typography>
      </Box>
      <LinearProgress variant="determinate" value={pct}
        sx={{ height: 6, borderRadius: 3,
              '& .MuiLinearProgress-bar': {
                bgcolor: pct >= 100 ? '#2e7d32' : pct >= 60 ? '#ed6c02' : '#1565c0' } }} />
    </Box>
  );
}

/* ── Deadline label ──────────────────────────────────────────────────────── */
function DeadlineLabel({ dateStr, status }) {
  if (!dateStr) return <Typography variant="caption" color="text.disabled">No deadline</Typography>;
  const days = daysUntil(dateStr);
  const past = days < 0;
  const urgent = days >= 0 && days <= 7;
  if (status === 'COMPLETED' || status === 'CANCELLED') {
    return <Typography variant="caption" color="text.secondary">{new Date(dateStr).toLocaleDateString()}</Typography>;
  }
  return (
    <Chip size="small"
      label={past ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d left`}
      color={past ? 'error' : urgent ? 'warning' : 'default'}
      variant={past || urgent ? 'filled' : 'outlined'}
      sx={{ fontSize: '0.7rem' }} />
  );
}

/* ── Create / Edit Dialog ────────────────────────────────────────────────── */
function CampaignDialog({ open, onClose, operators, onSaved, initial }) {
  const empty = {
    name: '', description: '', operatorId: '', objective: '',
    targetArea: '', technology: '', plannedStart: '', plannedEnd: '',
    plannedTests: '', notes: '', technicians: [],
  };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [techName, setTechName] = useState('');
  const [techRole, setTechRole] = useState('');

  useEffect(() => {
    if (open) setForm(initial ? {
      name: initial.name || '',
      description: initial.description || '',
      operatorId: initial.operator_id || '',
      objective: initial.objective || '',
      targetArea: initial.target_area || '',
      technology: initial.technology || '',
      plannedStart: initial.planned_start ? initial.planned_start.slice(0, 10) : '',
      plannedEnd: initial.planned_end   ? initial.planned_end.slice(0, 10)   : '',
      plannedTests: initial.planned_tests || '',
      notes: initial.notes || '',
      technicians: Array.isArray(initial.technicians) ? initial.technicians : [],
    } : empty);
    setTechName(''); setTechRole('');
    setErr('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addTech = () => {
    const name = techName.trim();
    if (!name) return;
    setForm((f) => ({ ...f, technicians: [...f.technicians, { name, role: techRole.trim() || 'Field Technician' }] }));
    setTechName(''); setTechRole('');
  };
  const removeTech = (i) => setForm((f) => ({ ...f, technicians: f.technicians.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!form.name.trim()) { setErr('Campaign name is required'); return; }
    if (!form.operatorId) { setErr('Operator is required'); return; }
    setSaving(true);
    try {
      if (initial) {
        await api.put(`/dt-campaigns/${initial.campaign_id}`, form);
      } else {
        await api.post('/dt-campaigns', form);
      }
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{initial ? 'Edit Campaign' : 'New Drive Test Campaign'}</DialogTitle>
      <DialogContent dividers>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField fullWidth label="Campaign Name *" value={form.name} onChange={set('name')} />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Operator *</InputLabel>
              <Select value={form.operatorId} label="Operator *" onChange={set('operatorId')}>
                {operators.map((o) => (
                  <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="Objective"
              value={form.objective} onChange={set('objective')}
              placeholder="What compliance requirement or obligation does this campaign verify?" />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Target Area</InputLabel>
              <Select value={form.targetArea} label="Target Area" onChange={set('targetArea')}>
                <MenuItem value="">—</MenuItem>
                {AREAS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Technology</InputLabel>
              <Select value={form.technology} label="Technology" onChange={set('technology')}>
                <MenuItem value="">—</MenuItem>
                {TECHNOLOGIES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth type="date" label="Planned Start" InputLabelProps={{ shrink: true }}
              value={form.plannedStart} onChange={set('plannedStart')} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth type="date" label="Planned End" InputLabelProps={{ shrink: true }}
              value={form.plannedEnd} onChange={set('plannedEnd')} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth type="number" label="Planned Tests" inputProps={{ min: 0 }}
              value={form.plannedTests} onChange={set('plannedTests')} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Assigned Technicians</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: form.technicians.length ? 1.5 : 0 }}>
              <TextField size="small" label="Technician name" value={techName}
                onChange={(e) => setTechName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }}
                sx={{ flex: 1 }} />
              <TextField size="small" label="Role (optional)" value={techRole}
                onChange={(e) => setTechRole(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }}
                sx={{ width: 180 }} placeholder="Field Technician" />
              <Button variant="outlined" onClick={addTech} startIcon={<AddIcon />}
                disabled={!techName.trim()}>Add</Button>
            </Stack>
            {form.technicians.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {form.technicians.map((t, i) => (
                  <Chip key={i} label={t.role ? `${t.name} · ${t.role}` : t.name}
                    onDelete={() => removeTech(i)} size="small" />
                ))}
              </Stack>
            )}
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="Description"
              value={form.description} onChange={set('description')} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="Notes"
              value={form.notes} onChange={set('notes')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : initial ? 'Save Changes' : 'Create Campaign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Status transition dialog ────────────────────────────────────────────── */
function StatusDialog({ open, campaign, onClose, onDone }) {
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open && campaign) setStatus('');
    setErr('');
  }, [open, campaign]);

  if (!campaign) return null;

  const nextStatuses = {
    PLANNING:    ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED:   [],
    CANCELLED:   [],
  }[campaign.status] || [];

  const save = async () => {
    if (!status) return;
    setSaving(true);
    try {
      await api.put(`/dt-campaigns/${campaign.campaign_id}/status`, { status });
      onDone();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Update Campaign Status</DialogTitle>
      <DialogContent dividers>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Current: <strong>{STATUS_META[campaign.status]?.label}</strong>
        </Typography>
        <FormControl fullWidth>
          <InputLabel>New Status</InputLabel>
          <Select value={status} label="New Status" onChange={(e) => setStatus(e.target.value)}>
            {nextStatuses.map((s) => (
              <MenuItem key={s} value={s}>{STATUS_META[s]?.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={!status || saving}>
          {saving ? <CircularProgress size={20} /> : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Link Drive Test dialog ──────────────────────────────────────────────── */
function LinkTestDialog({ open, campaign, availableTests, onClose, onDone }) {
  const [driveTestId, setDriveTestId] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setDriveTestId(''); setErr(''); }
  }, [open]);

  const save = async () => {
    if (!driveTestId) return;
    setSaving(true);
    try {
      await api.post(`/dt-campaigns/${campaign.campaign_id}/tests`, { driveTestId });
      onDone();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to link test');
    } finally {
      setSaving(false);
    }
  };

  if (!campaign) return null;
  const linked = new Set((campaign.tests || []).map((t) => t.drive_test_id));
  const eligible = (availableTests || []).filter(
    (t) => !linked.has(t.drive_test_id) && (!campaign.operator_id || t.operator_id === campaign.operator_id)
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Link Drive Test to Campaign</DialogTitle>
      <DialogContent dividers>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <FormControl fullWidth>
          <InputLabel>Drive Test</InputLabel>
          <Select value={driveTestId} label="Drive Test"
            onChange={(e) => setDriveTestId(e.target.value)}>
            {eligible.length === 0 && <MenuItem disabled value="">No eligible tests</MenuItem>}
            {eligible.map((t) => (
              <MenuItem key={t.drive_test_id} value={t.drive_test_id}>
                {t.test_name} — {t.test_date ? t.test_date.slice(0, 10) : '?'}
                {t.route_type ? ` (${t.route_type})` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={!driveTestId || saving}>
          {saving ? <CircularProgress size={20} /> : 'Link Test'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Analytics panel ─────────────────────────────────────────────────────── */
function AnalyticsPanel({ campaignId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);
    api.get(`/dt-campaigns/${campaignId}/analytics`)
      .then((r) => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  if (!data) return <Alert severity="info">No analytics available yet — link drive tests to this campaign first.</Alert>;

  const DIST_COLORS = { excellent: '#2e7d32', good: '#66bb6a', fair: '#ed6c02', poor: '#d32f2f', noSignal: '#757575' };

  return (
    <Box>
      {/* Totals */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Paper sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="h5" fontWeight={700} color="primary">{data.totals.tests}</Typography>
            <Typography variant="caption" color="text.secondary">Drive Tests</Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="h5" fontWeight={700} color="primary">{fmt(data.totals.samples)}</Typography>
            <Typography variant="caption" color="text.secondary">Samples</Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="h5" fontWeight={700} color="primary">{data.totals.distanceKm} km</Typography>
            <Typography variant="caption" color="text.secondary">Distance</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Signal averages */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Signal Quality</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Avg RSRP', value: fmt(data.signal.avg_rsrp, ' dBm') },
          { label: 'Avg SINR', value: fmt(data.signal.avg_sinr, ' dB') },
          { label: 'Avg DL',   value: fmt(data.signal.avg_dl, ' kbps') },
          { label: 'Avg UL',   value: fmt(data.signal.avg_ul, ' kbps') },
        ].map(({ label, value }) => (
          <Grid item xs={6} md={3} key={label}>
            <Paper sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="body1" fontWeight={600}>{value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Compliance */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Compliance Rates</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'RSRP ≥ -100dBm', pct: data.compliance.rsrp.pct },
          { label: 'SINR ≥ 0dB',     pct: data.compliance.sinr.pct },
          { label: 'DL ≥ 2Mbps',     pct: data.compliance.dl.pct   },
        ].map(({ label, pct }) => (
          <Grid item xs={12} md={4} key={label}>
            <Paper sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption">{label}</Typography>
                <Typography variant="caption" fontWeight={700}
                  color={pct >= 80 ? 'success.main' : pct >= 60 ? 'warning.main' : 'error.main'}>
                  {pct}%
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={pct}
                sx={{ height: 8, borderRadius: 4,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: pct >= 80 ? '#2e7d32' : pct >= 60 ? '#ed6c02' : '#c62828' } }} />
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* RSRP Distribution */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Signal Distribution</Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', height: 24, borderRadius: 1, overflow: 'hidden', mb: 1 }}>
          {['excellent', 'good', 'fair', 'poor', 'noSignal'].map((k) => {
            const total = Object.values(data.distribution).reduce((a, v) => a + (v || 0), 0) || 1;
            const pct = ((data.distribution[k] || 0) / total) * 100;
            return pct > 0 ? (
              <Tooltip key={k} title={`${k}: ${pct.toFixed(1)}%`}>
                <Box sx={{ width: `${pct}%`, bgcolor: DIST_COLORS[k] }} />
              </Tooltip>
            ) : null;
          })}
        </Box>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {Object.entries(DIST_COLORS).map(([k, c]) => (
            <Stack key={k} direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />
              <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>{k}</Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>

      {/* Per-test breakdown */}
      {data.byTest.length > 0 && (
        <>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Per-Test Breakdown</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>Test</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Samples</TableCell>
                  <TableCell align="right">Avg RSRP</TableCell>
                  <TableCell align="right">Avg DL</TableCell>
                  <TableCell align="right">RSRP Pass</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.byTest.map((t) => {
                  const passPct = t.total ? Math.round((t.rsrp_pass / t.total) * 100) : 0;
                  return (
                    <TableRow key={t.drive_test_id} hover>
                      <TableCell>{t.test_name || `#${t.drive_test_id}`}</TableCell>
                      <TableCell>{t.test_date ? t.test_date.slice(0, 10) : '—'}</TableCell>
                      <TableCell align="right">{fmt(t.samples)}</TableCell>
                      <TableCell align="right">{fmt(t.avg_rsrp, ' dBm')}</TableCell>
                      <TableCell align="right">{fmt(t.avg_dl, ' kbps')}</TableCell>
                      <TableCell align="right">
                        <Chip size="small" label={`${passPct}%`}
                          color={passPct >= 80 ? 'success' : passPct >= 60 ? 'warning' : 'error'}
                          variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}

/* ── Campaign Drawer ─────────────────────────────────────────────────────── */
function CampaignDrawer({
  campaign, onClose, onEdit, onStatusChange, onLinkTest,
  onUnlinkTest, availableTests, isRegulator,
}) {
  const [tab, setTab] = useState(0);

  if (!campaign) return null;
  const sm = STATUS_META[campaign.status] || {};
  const nextStatuses = {
    PLANNING: ['IN_PROGRESS'], IN_PROGRESS: ['COMPLETED'],
  }[campaign.status] || [];
  const canTransition = isRegulator && nextStatuses.length > 0;
  const canCancel = isRegulator && ['PLANNING', 'IN_PROGRESS'].includes(campaign.status);

  return (
    <Drawer anchor="right" open={Boolean(campaign)} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 620 }, p: 0 } }}>
      {/* Header */}
      <Box sx={{ p: 3, background: 'linear-gradient(135deg,#1b5e20,#2e7d32)', color: '#fff' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>{campaign.campaign_ref}</Typography>
            <Typography variant="h6" fontWeight={700}>{campaign.name}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>{campaign.operator_name}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip label={sm.label} color={sm.color} size="small" />
            <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}><CloseIcon /></IconButton>
          </Box>
        </Box>
        {/* Quick stats */}
        <Grid container spacing={1} sx={{ mt: 1 }}>
          {[
            { l: 'Tests', v: `${campaign.tests?.length ?? 0} / ${campaign.planned_tests || '?'}` },
            { l: 'Area', v: campaign.target_area || '—' },
            { l: 'Technology', v: campaign.technology || '—' },
            { l: 'End Date', v: campaign.planned_end ? campaign.planned_end.slice(0, 10) : '—' },
          ].map(({ l, v }) => (
            <Grid item xs={6} key={l}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>{l}</Typography>
              <Typography variant="body2" fontWeight={600}>{v}</Typography>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Actions bar */}
      {isRegulator && (
        <Box sx={{ px: 2, py: 1, display: 'flex', gap: 1, flexWrap: 'wrap', borderBottom: 1, borderColor: 'divider' }}>
          <Button size="small" startIcon={<EditIcon />} onClick={onEdit}>Edit</Button>
          {canTransition && (
            <Button size="small" startIcon={<PlayArrowIcon />} color="success"
              onClick={() => onStatusChange(nextStatuses[0])}>
              {nextStatuses[0] === 'IN_PROGRESS' ? 'Start Campaign' : 'Mark Complete'}
            </Button>
          )}
          {canCancel && (
            <Button size="small" startIcon={<CancelIcon />} color="error"
              onClick={() => onStatusChange('CANCELLED')}>Cancel</Button>
          )}
          {['PLANNING', 'IN_PROGRESS'].includes(campaign.status) && (
            <Button size="small" startIcon={<LinkIcon />} onClick={onLinkTest}>Link Test</Button>
          )}
        </Box>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Overview" />
        <Tab label={`Tests (${campaign.tests?.length ?? 0})`} />
        <Tab label="Analytics" />
      </Tabs>

      <Box sx={{ p: 2, overflowY: 'auto' }}>
        {/* Overview */}
        {tab === 0 && (
          <Stack spacing={2}>
            {campaign.objective && (
              <Box>
                <Typography variant="caption" color="text.secondary">Objective</Typography>
                <Typography variant="body2">{campaign.objective}</Typography>
              </Box>
            )}
            {campaign.description && (
              <Box>
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography variant="body2">{campaign.description}</Typography>
              </Box>
            )}
            {Array.isArray(campaign.technicians) && campaign.technicians.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">Assigned Technicians</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  {campaign.technicians.map((t, i) => (
                    <Chip key={i} size="small" label={t.role ? `${t.name} · ${t.role}` : t.name} />
                  ))}
                </Stack>
              </Box>
            )}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Planned Start</Typography>
                <Typography variant="body2">{campaign.planned_start ? campaign.planned_start.slice(0, 10) : '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Planned End</Typography>
                <Typography variant="body2">{campaign.planned_end ? campaign.planned_end.slice(0, 10) : '—'}</Typography>
              </Grid>
              {campaign.actual_start && (
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Actual Start</Typography>
                  <Typography variant="body2">{campaign.actual_start.slice(0, 10)}</Typography>
                </Grid>
              )}
              {campaign.actual_end && (
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Actual End</Typography>
                  <Typography variant="body2">{campaign.actual_end.slice(0, 10)}</Typography>
                </Grid>
              )}
            </Grid>
            {campaign.notes && (
              <Box>
                <Typography variant="caption" color="text.secondary">Notes</Typography>
                <Typography variant="body2">{campaign.notes}</Typography>
              </Box>
            )}
            <Typography variant="caption" color="text.disabled">
              Created {new Date(campaign.created_at).toLocaleDateString()}
              {campaign.created_by_name && ` by ${campaign.created_by_name}`}
            </Typography>
          </Stack>
        )}

        {/* Tests tab */}
        {tab === 1 && (
          campaign.tests?.length === 0
            ? <Alert severity="info">No drive tests linked yet.</Alert>
            : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell>Test Name</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Samples</TableCell>
                      <TableCell align="right">Avg RSRP</TableCell>
                      {isRegulator && <TableCell />}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {campaign.tests.map((t) => (
                      <TableRow key={t.drive_test_id} hover>
                        <TableCell>{t.test_name || `#${t.drive_test_id}`}</TableCell>
                        <TableCell>{t.test_date ? t.test_date.slice(0, 10) : '—'}</TableCell>
                        <TableCell>{t.route_type || '—'}</TableCell>
                        <TableCell align="right">{fmt(t.sample_count)}</TableCell>
                        <TableCell align="right">{fmt(t.avg_rsrp, ' dBm')}</TableCell>
                        {isRegulator && (
                          <TableCell>
                            <Tooltip title="Unlink">
                              <IconButton size="small" color="error"
                                onClick={() => onUnlinkTest(t.drive_test_id)}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
        )}

        {/* Analytics tab */}
        {tab === 2 && <AnalyticsPanel campaignId={campaign.campaign_id} />}
      </Box>
    </Drawer>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function DriveTestCampaigns() {
  const { user } = useAuth();
  const isRegulator = ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'].includes(user?.role);

  const [campaigns, setCampaigns] = useState([]);
  const [summary, setSummary]     = useState({});
  const [operators, setOperators] = useState([]);
  const [allTests, setAllTests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selected, setSelected]         = useState(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [editing, setEditing]           = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [linkingTo, setLinkingTo]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (user?.role === 'OPERATOR_USER') params.operatorId = user.operatorId;

      const [cRes, sRes] = await Promise.all([
        api.get('/dt-campaigns', { params }),
        api.get('/dt-campaigns/summary'),
      ]);
      setCampaigns(cRes.data.data?.rows || []);
      setSummary(sRes.data.data || {});
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [statusFilter, user]);

  const loadOperatorsAndTests = useCallback(async () => {
    try {
      const [oRes, tRes] = await Promise.all([
        api.get('/operators'),
        api.get('/drive-tests'),
      ]);
      setOperators(oRes.data.data || []);
      setAllTests(tRes.data.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isRegulator) loadOperatorsAndTests(); }, [isRegulator, loadOperatorsAndTests]);

  // Refresh the selected campaign after changes
  const refreshSelected = useCallback(async (id) => {
    try {
      const r = await api.get(`/dt-campaigns/${id}`);
      setSelected(r.data.data);
    } catch { /* ignore */ }
  }, []);

  const handleStatusChange = async (status) => {
    if (!selected) return;
    try {
      await api.put(`/dt-campaigns/${selected.campaign_id}/status`, { status });
      await load();
      await refreshSelected(selected.campaign_id);
    } catch { /* ignore */ }
  };

  const handleUnlink = async (driveTestId) => {
    if (!selected) return;
    try {
      await api.delete(`/dt-campaigns/${selected.campaign_id}/tests/${driveTestId}`);
      await refreshSelected(selected.campaign_id);
    } catch { /* ignore */ }
  };

  const filtered = campaigns; // server-side filter already applied

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <PageHeader
        icon={<CampaignIcon />}
        title="Drive Test Campaigns"
        subtitle="Manage field campaigns — assign technicians, plan routes, link test results, and track compliance evidence."
        actions={isRegulator && (
          <Button variant="contained" size="small" startIcon={<AddIcon />}
            onClick={() => setShowCreate(true)}>
            New Campaign
          </Button>
        )}
      />

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard label="Total" value={summary.total ?? 0} color="#1565c0"
            icon={<CampaignIcon sx={{ fontSize: 40 }} />} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Planning" value={summary.planning ?? 0} color="#0288d1" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="In Progress" value={summary.in_progress ?? 0} color="#e65100" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Completed" value={summary.completed ?? 0} color="#2e7d32" />
        </Grid>
      </Grid>

      {/* Active campaigns */}
      {(summary.active || []).length > 0 && (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            Active & Upcoming Campaigns
          </Typography>
          <Stack spacing={1}>
            {summary.active.map((c) => (
              <Box key={c.campaign_ref} sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip label={STATUS_META[c.status]?.label} color={STATUS_META[c.status]?.color}
                  size="small" />
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>{c.name}</Typography>
                <Typography variant="caption" color="text.secondary">{c.operator_name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {c.tests_done}/{c.planned_tests ?? '?'} tests
                </Typography>
                {c.planned_end && <DeadlineLabel dateStr={c.planned_end} status={c.status} />}
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Filter bar */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">Filter:</Typography>
        {['ALL', ...STATUS_ORDER].map((s) => (
          <Chip key={s} label={s === 'ALL' ? 'All' : STATUS_META[s]?.label}
            onClick={() => setStatusFilter(s)}
            color={statusFilter === s ? (s === 'ALL' ? 'primary' : STATUS_META[s]?.color || 'primary') : 'default'}
            variant={statusFilter === s ? 'filled' : 'outlined'}
            size="small" />
        ))}
      </Box>

      {/* Table */}
      {loading
        ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        : (
          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>Ref / Name</TableCell>
                  <TableCell>Operator</TableCell>
                  <TableCell>Area / Technology</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Deadline</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>No campaigns found</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((c) => {
                  const sm = STATUS_META[c.status] || {};
                  return (
                    <TableRow key={c.campaign_id} hover sx={{ cursor: 'pointer' }}
                      onClick={async () => {
                        const r = await api.get(`/dt-campaigns/${c.campaign_id}`);
                        setSelected(r.data.data);
                      }}>
                      <TableCell>
                        <Typography variant="caption" color="text.disabled" display="block">
                          {c.campaign_ref}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                        {c.objective && (
                          <Typography variant="caption" color="text.secondary"
                            sx={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {c.objective}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{c.operator_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{c.target_area || '—'}</Typography>
                        {c.technology && (
                          <Chip label={c.technology} size="small" variant="outlined" sx={{ fontSize: '0.68rem', mt: 0.5 }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        <TestProgress done={Number(c.actual_tests)} planned={Number(c.planned_tests)} />
                      </TableCell>
                      <TableCell>
                        <DeadlineLabel dateStr={c.planned_end} status={c.status} />
                      </TableCell>
                      <TableCell>
                        <Chip label={sm.label} color={sm.color} size="small" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

      {/* Drawer */}
      <CampaignDrawer
        campaign={selected}
        onClose={() => setSelected(null)}
        onEdit={() => { setEditing(selected); }}
        onStatusChange={(s) => handleStatusChange(s)}
        onLinkTest={() => setLinkingTo(selected)}
        onUnlinkTest={handleUnlink}
        availableTests={allTests}
        isRegulator={isRegulator}
      />

      {/* Create dialog */}
      <CampaignDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        operators={operators}
        onSaved={load}
      />

      {/* Edit dialog */}
      {editing && (
        <CampaignDialog
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          operators={operators}
          initial={editing}
          onSaved={async () => {
            await load();
            if (selected) await refreshSelected(selected.campaign_id);
            setEditing(null);
          }}
        />
      )}

      {/* Status dialog */}
      {statusTarget && (
        <StatusDialog
          open={Boolean(statusTarget)}
          campaign={selected}
          onClose={() => setStatusTarget(null)}
          onDone={async () => {
            await load();
            if (selected) await refreshSelected(selected.campaign_id);
          }}
        />
      )}

      {/* Link test dialog */}
      {linkingTo && (
        <LinkTestDialog
          open={Boolean(linkingTo)}
          campaign={linkingTo}
          availableTests={allTests}
          onClose={() => setLinkingTo(null)}
          onDone={async () => {
            await load();
            if (selected) await refreshSelected(selected.campaign_id);
          }}
        />
      )}
    </Box>
  );
}
