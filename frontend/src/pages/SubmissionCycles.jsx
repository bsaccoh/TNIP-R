import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell,
  Drawer, Stack, Divider, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  CircularProgress, Alert, Badge, Tab, Tabs,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import PublishIcon        from '@mui/icons-material/Publish';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import CancelIcon         from '@mui/icons-material/Cancel';
import HourglassIcon      from '@mui/icons-material/HourglassEmpty';
import PendingIcon        from '@mui/icons-material/PendingActions';
import RefreshIcon        from '@mui/icons-material/Refresh';
import InfoIcon           from '@mui/icons-material/Info';
import CalendarMonthIcon  from '@mui/icons-material/CalendarMonth';
import AssignmentIcon     from '@mui/icons-material/Assignment';
import LockIcon           from '@mui/icons-material/Lock';
import { useAuth }        from '../auth/AuthContext';
import { api }            from '../api/client';

/* ── Constants ──────────────────────────────────────────────────────────── */
const STATUS_META = {
  DRAFT:    { label: 'Draft',    color: 'default' },
  OPEN:     { label: 'Open',     color: 'success' },
  CLOSED:   { label: 'Closed',   color: 'warning' },
  ARCHIVED: { label: 'Archived', color: 'default' },
};

const SUB_STATUS_META = {
  PENDING:           { label: 'Pending',       color: 'default',  icon: <PendingIcon sx={{ fontSize: 14 }} /> },
  SUBMITTED:         { label: 'Submitted',     color: 'info',     icon: <AssignmentIcon sx={{ fontSize: 14 }} /> },
  UNDER_REVIEW:      { label: 'Under Review',  color: 'warning',  icon: <HourglassIcon sx={{ fontSize: 14 }} /> },
  APPROVED:          { label: 'Approved',      color: 'success',  icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  REJECTED:          { label: 'Rejected',      color: 'error',    icon: <CancelIcon sx={{ fontSize: 14 }} /> },
  RESUBMIT_REQUIRED: { label: 'Resubmit Req.', color: 'warning',  icon: <RefreshIcon sx={{ fontSize: 14 }} /> },
};

const REGULATOR_ROLES = ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function PeriodStatusChip({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.DRAFT;
  return <Chip label={m.label} color={m.color} size="small" />;
}
function SubStatusChip({ status }) {
  const m = SUB_STATUS_META[status] ?? { label: status, color: 'default' };
  return <Chip label={m.label} color={m.color} size="small" icon={m.icon} />;
}

function daysLeft(deadline) {
  const d = Math.ceil((new Date(deadline) - Date.now()) / 86400000);
  if (d < 0) return { label: `${Math.abs(d)}d overdue`, color: 'error.main' };
  if (d <= 3) return { label: `${d}d left`, color: 'warning.main' };
  return { label: `${d}d left`, color: 'success.main' };
}

function CompletionBar({ row }) {
  const total = Number(row.total_operators || 0);
  if (!total) return <Typography variant="body2" color="text.secondary">—</Typography>;
  const done  = Number(row.approved_count || 0) + Number(row.submitted_count || 0) + Number(row.review_count || 0);
  const pct   = Math.round((done / total) * 100);
  return (
    <Box sx={{ minWidth: 120 }}>
      <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3 }} />
      <Typography variant="caption" color="text.secondary">{done}/{total} ({pct}%)</Typography>
    </Box>
  );
}

/* ── Create Period Dialog ────────────────────────────────────────────────── */
function CreatePeriodDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', periodType: 'MONTHLY', reportMonth: '', reportQuarter: '',
    startDate: '', endDate: '', deadline: '', instructions: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.name || !form.startDate || !form.endDate || !form.deadline) {
      setErr('Name, Start Date, End Date and Deadline are required'); return;
    }
    setSaving(true); setErr('');
    try {
      const { data } = await api.post('/submissions/periods', form);
      onCreated(data.data);
      onClose();
      setForm({ name: '', periodType: 'MONTHLY', reportMonth: '', reportQuarter: '',
                startDate: '', endDate: '', deadline: '', instructions: '' });
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to create period');
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ background: 'linear-gradient(135deg,#0d47a1,#1976d2)', color: '#fff', py: 2 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <CalendarMonthIcon /> Create Submission Period
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack gap={2.5}>
          <TextField label="Period Name *" value={form.name} onChange={set('name')} fullWidth
            placeholder="e.g. Monthly PM – June 2026" />
          <FormControl fullWidth>
            <InputLabel>Period Type</InputLabel>
            <Select value={form.periodType} onChange={set('periodType')} label="Period Type">
              <MenuItem value="MONTHLY">Monthly</MenuItem>
              <MenuItem value="QUARTERLY">Quarterly</MenuItem>
              <MenuItem value="ANNUAL">Annual</MenuItem>
              <MenuItem value="ADHOC">Ad-hoc</MenuItem>
            </Select>
          </FormControl>
          {form.periodType === 'MONTHLY' && (
            <TextField label="Report Month (YYYY-MM)" value={form.reportMonth}
              onChange={set('reportMonth')} fullWidth placeholder="2026-06" />
          )}
          {form.periodType === 'QUARTERLY' && (
            <TextField label="Report Quarter (YYYY-Q#)" value={form.reportQuarter}
              onChange={set('reportQuarter')} fullWidth placeholder="2026-Q2" />
          )}
          <Stack direction="row" gap={2}>
            <TextField label="Start Date *" type="date" value={form.startDate}
              onChange={set('startDate')} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="End Date *" type="date" value={form.endDate}
              onChange={set('endDate')} fullWidth InputLabelProps={{ shrink: true }} />
          </Stack>
          <TextField label="Submission Deadline *" type="date" value={form.deadline}
            onChange={set('deadline')} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Instructions (optional)" value={form.instructions}
            onChange={set('instructions')} fullWidth multiline rows={3}
            placeholder="Provide submission guidelines for operators..." />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Create Period'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Review Dialog ───────────────────────────────────────────────────────── */
function ReviewDialog({ open, onClose, submission, periodId, onReviewed }) {
  const [status, setStatus] = useState('');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  useEffect(() => { if (open) { setStatus(''); setNotes(''); setErr(''); } }, [open]);

  async function submit() {
    if (!status) { setErr('Select a review decision'); return; }
    if ((status === 'REJECTED' || status === 'RESUBMIT_REQUIRED') && !notes.trim()) {
      setErr('Review notes are required when rejecting or requesting resubmission'); return;
    }
    setSaving(true); setErr('');
    try {
      const { data } = await api.put(
        `/submissions/periods/${periodId}/operators/${submission.operator_id}/review`,
        { status, reviewNotes: notes }
      );
      onReviewed(data.data);
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Review failed');
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Review — {submission?.operator_name}</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack gap={2.5} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Decision *</InputLabel>
            <Select value={status} onChange={e => setStatus(e.target.value)} label="Decision *">
              <MenuItem value="UNDER_REVIEW">Mark Under Review</MenuItem>
              <MenuItem value="APPROVED">Approve</MenuItem>
              <MenuItem value="REJECTED">Reject</MenuItem>
              <MenuItem value="RESUBMIT_REQUIRED">Request Resubmission</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Review Notes" value={notes} onChange={e => setNotes(e.target.value)}
            multiline rows={3} fullWidth
            placeholder="Notes to the operator about this decision..." />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Submit Review'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Period Detail Drawer ────────────────────────────────────────────────── */
function PeriodDrawer({ period, open, onClose, onRefresh, isRegulator }) {
  const [tab, setTab]              = useState(0);
  const [reviewTarget, setReview]  = useState(null);
  const [acting, setActing]        = useState(false);

  async function changePeriodStatus(status) {
    setActing(true);
    try {
      const endpoint = status === 'OPEN'
        ? `/submissions/periods/${period.period_id}/publish`
        : `/submissions/periods/${period.period_id}/status`;
      status === 'OPEN'
        ? await api.post(endpoint)
        : await api.put(endpoint, { status });
      onRefresh();
    } finally { setActing(false); }
  }

  if (!period) return null;

  const submissions = period.submissions ?? [];
  const statusGroups = {
    PENDING:           submissions.filter(s => s.status === 'PENDING'),
    SUBMITTED:         submissions.filter(s => s.status === 'SUBMITTED'),
    UNDER_REVIEW:      submissions.filter(s => s.status === 'UNDER_REVIEW'),
    APPROVED:          submissions.filter(s => s.status === 'APPROVED'),
    REJECTED:          submissions.filter(s => s.status === 'REJECTED'),
    RESUBMIT_REQUIRED: submissions.filter(s => s.status === 'RESUBMIT_REQUIRED'),
  };
  const dl = daysLeft(period.deadline);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 640 }, p: 0 } }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg,#0d47a1,#1976d2)', px: 3, py: 2.5, color: '#fff' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" fontWeight={700}>{period.name}</Typography>
            <Typography variant="body2" sx={{ opacity: .8 }}>{period.period_ref}</Typography>
          </Box>
          <PeriodStatusChip status={period.status} />
        </Stack>
        <Stack direction="row" gap={3} sx={{ mt: 1.5 }}>
          <Box>
            <Typography variant="caption" sx={{ opacity: .7 }}>Type</Typography>
            <Typography variant="body2">{period.period_type}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ opacity: .7 }}>Deadline</Typography>
            <Typography variant="body2" sx={{ color: dl.color }}>{new Date(period.deadline).toLocaleDateString()} ({dl.label})</Typography>
          </Box>
          {period.report_month && (
            <Box>
              <Typography variant="caption" sx={{ opacity: .7 }}>Report Month</Typography>
              <Typography variant="body2">{period.report_month}</Typography>
            </Box>
          )}
        </Stack>
        {/* Action buttons */}
        {isRegulator && (
          <Stack direction="row" gap={1} sx={{ mt: 2 }}>
            {period.status === 'DRAFT' && (
              <Button size="small" variant="contained" color="success"
                startIcon={acting ? <CircularProgress size={14} color="inherit" /> : <PublishIcon />}
                onClick={() => changePeriodStatus('OPEN')} disabled={acting}>
                Publish to Operators
              </Button>
            )}
            {period.status === 'OPEN' && (
              <Button size="small" variant="contained" color="warning"
                startIcon={<LockIcon />} onClick={() => changePeriodStatus('CLOSED')} disabled={acting}>
                Close Period
              </Button>
            )}
            {period.status === 'CLOSED' && (
              <Button size="small" variant="outlined" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)' }}
                onClick={() => changePeriodStatus('ARCHIVED')} disabled={acting}>
                Archive
              </Button>
            )}
          </Stack>
        )}
      </Box>

      {period.instructions && (
        <Alert severity="info" sx={{ m: 2, mb: 0 }} icon={<InfoIcon />}>{period.instructions}</Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={`All (${submissions.length})`} />
        <Tab label={<Badge badgeContent={statusGroups.PENDING.length} color="default">Pending</Badge>} />
        <Tab label={<Badge badgeContent={statusGroups.SUBMITTED.length + statusGroups.UNDER_REVIEW.length} color="info">To Review</Badge>} />
        <Tab label={<Badge badgeContent={statusGroups.APPROVED.length} color="success">Approved</Badge>} />
      </Tabs>

      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {[
          submissions,
          statusGroups.PENDING,
          [...statusGroups.SUBMITTED, ...statusGroups.UNDER_REVIEW],
          statusGroups.APPROVED,
        ][tab].map(sub => (
          <Box key={sub.operator_id} sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography fontWeight={600}>{sub.operator_name}</Typography>
                {sub.submitted_at && (
                  <Typography variant="caption" color="text.secondary">
                    Submitted {new Date(sub.submitted_at).toLocaleString()}
                    {sub.submitted_by_name && ` by ${sub.submitted_by_name}`}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" alignItems="center" gap={1}>
                <SubStatusChip status={sub.status} />
                {isRegulator && ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMIT_REQUIRED'].includes(sub.status) && (
                  <Button size="small" variant="outlined" onClick={() => setReview(sub)}>Review</Button>
                )}
              </Stack>
            </Stack>
            {sub.notes && (
              <Typography variant="body2" sx={{ mt: .5, color: 'text.secondary', fontStyle: 'italic' }}>
                "{sub.notes}"
              </Typography>
            )}
            {sub.review_notes && (
              <Alert severity={sub.status === 'APPROVED' ? 'success' : 'warning'} sx={{ mt: 1, py: 0 }}>
                <Typography variant="caption">{sub.review_notes}</Typography>
              </Alert>
            )}
          </Box>
        ))}
        {[
          submissions,
          statusGroups.PENDING,
          [...statusGroups.SUBMITTED, ...statusGroups.UNDER_REVIEW],
          statusGroups.APPROVED,
        ][tab].length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No submissions in this category</Typography>
          </Box>
        )}
      </Box>

      {reviewTarget && (
        <ReviewDialog
          open={!!reviewTarget}
          onClose={() => setReview(null)}
          submission={reviewTarget}
          periodId={period.period_id}
          onReviewed={() => { setReview(null); onRefresh(); }}
        />
      )}
    </Drawer>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function SubmissionCycles() {
  const { user } = useAuth();
  const isRegulator = REGULATOR_ROLES.includes(user?.role);

  const [periods, setPeriods]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatus] = useState('');
  const [selected, setSelected]   = useState(null);
  const [drawerOpen, setDrawer]   = useState(false);
  const [createOpen, setCreate]   = useState(false);
  const [summary, setSummary]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get('/submissions/periods', { params: { status: statusFilter || undefined } }),
        api.get('/submissions/summary'),
      ]);
      setPeriods(pRes.data.data?.rows ?? []);
      setSummary(sRes.data.data);
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function openDetail(period) {
    const { data } = await api.get(`/submissions/periods/${period.period_id}`);
    setSelected(data.data);
    setDrawer(true);
  }

  async function refreshDetail() {
    if (!selected) return;
    const { data } = await api.get(`/submissions/periods/${selected.period_id}`);
    setSelected(data.data);
    load();
  }

  const statCards = [
    { label: 'Open Periods',     value: summary?.open_periods ?? 0,
      icon: <CalendarMonthIcon />, color: '#1565c0' },
    { label: 'Pending Submission', value: summary?.statusCounts?.find(s => s.status === 'PENDING')?.count ?? 0,
      icon: <PendingIcon />, color: '#e65100' },
    { label: 'Under Review',     value: (
        (summary?.statusCounts?.find(s => s.status === 'SUBMITTED')?.count ?? 0) +
        (summary?.statusCounts?.find(s => s.status === 'UNDER_REVIEW')?.count ?? 0)
      ), icon: <HourglassIcon />, color: '#f9a825' },
    { label: 'Approved',         value: summary?.statusCounts?.find(s => s.status === 'APPROVED')?.count ?? 0,
      icon: <CheckCircleIcon />, color: '#2e7d32' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg,#0d47a1,#1976d2)', borderRadius: 3, p: 3, mb: 3, color: '#fff' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Stack direction="row" alignItems="center" gap={1.5}>
              <CalendarMonthIcon sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="h5" fontWeight={700}>Regulatory Submission Cycles</Typography>
                <Typography variant="body2" sx={{ opacity: .8 }}>
                  Manage periodic PM data submission rounds — create periods, track operator compliance, approve or reject submissions
                </Typography>
              </Box>
            </Stack>
          </Box>
          {isRegulator && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreate(true)}
              sx={{ bgcolor: 'rgba(255,255,255,.15)', '&:hover': { bgcolor: 'rgba(255,255,255,.25)' }, flexShrink: 0 }}>
              New Period
            </Button>
          )}
        </Stack>
      </Box>

      {/* Stat Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 2, mb: 3 }}>
        {statCards.map(c => (
          <Paper key={c.label} sx={{ p: 2, borderLeft: `4px solid ${c.color}` }}>
            <Stack direction="row" alignItems="center" gap={1.5}>
              <Box sx={{ color: c.color }}>{c.icon}</Box>
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ color: c.color }}>{c.value}</Typography>
                <Typography variant="caption" color="text.secondary">{c.label}</Typography>
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" gap={2}>
          <Typography fontWeight={600} sx={{ flexShrink: 0 }}>Filter:</Typography>
          {['', 'DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'].map(s => (
            <Chip key={s} label={s || 'All'} size="small"
              variant={statusFilter === s ? 'filled' : 'outlined'}
              color={statusFilter === s ? 'primary' : 'default'}
              onClick={() => setStatus(s)} sx={{ cursor: 'pointer' }} />
          ))}
          <Box sx={{ flex: 1 }} />
          <IconButton onClick={load} size="small"><RefreshIcon /></IconButton>
        </Stack>
      </Paper>

      {/* Table */}
      <Paper>
        {loading && <LinearProgress />}
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
              <TableCell>Period</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Deadline</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {periods.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  {isRegulator ? 'No periods yet — create one to get started' : 'No submission periods available'}
                </TableCell>
              </TableRow>
            )}
            {periods.map(p => {
              const dl = daysLeft(p.deadline);
              return (
                <TableRow key={p.period_id} hover sx={{ cursor: 'pointer' }} onClick={() => openDetail(p)}>
                  <TableCell>
                    <Typography fontWeight={600}>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.period_ref}</Typography>
                    {p.report_month && (
                      <Chip label={p.report_month} size="small" sx={{ ml: 1 }} />
                    )}
                  </TableCell>
                  <TableCell>{p.period_type}</TableCell>
                  <TableCell>
                    <Typography>{new Date(p.deadline).toLocaleDateString()}</Typography>
                    {p.status === 'OPEN' && (
                      <Typography variant="caption" sx={{ color: dl.color }}>{dl.label}</Typography>
                    )}
                  </TableCell>
                  <TableCell><PeriodStatusChip status={p.status} /></TableCell>
                  <TableCell><CompletionBar row={p} /></TableCell>
                  <TableCell align="center" onClick={e => e.stopPropagation()}>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => openDetail(p)}><InfoIcon /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      {/* Dialogs */}
      <CreatePeriodDialog open={createOpen} onClose={() => setCreate(false)}
        onCreated={() => { setCreate(false); load(); }} />

      <PeriodDrawer
        period={selected}
        open={drawerOpen}
        onClose={() => setDrawer(false)}
        onRefresh={refreshDetail}
        isRegulator={isRegulator}
      />
    </Box>
  );
}
