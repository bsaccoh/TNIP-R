import { useEffect, useState, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack, Chip, Table, TableBody,
  TableCell, TableHead, TableRow, IconButton, Button, Drawer, Divider,
  TextField, MenuItem, Select, FormControl, InputLabel, Alert, AlertTitle,
  LinearProgress, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Avatar, alpha,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ReplyIcon from '@mui/icons-material/Reply';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import PersonIcon from '@mui/icons-material/Person';
import { get, post, put } from '../api/client';
import PageHeader from '../components/PageHeader';
import { Loading, EmptyState } from '../components/ui';

/* ── Constants ──────────────────────────────────────────────────────────── */
const STATUS_META = {
  OPEN:      { label: 'Open',      color: '#3da9fc', bg: '#3da9fc22' },
  NOTIFIED:  { label: 'Notified',  color: '#e6a700', bg: '#e6a70022' },
  RESPONDED: { label: 'Responded', color: '#8b5cf6', bg: '#8b5cf622' },
  ESCALATED: { label: 'Escalated', color: '#e0413b', bg: '#e0413b22' },
  RESOLVED:  { label: 'Resolved',  color: '#2e9e5b', bg: '#2e9e5b22' },
  CLOSED:    { label: 'Closed',    color: '#888',    bg: '#88888822' },
};

const SEVERITY_META = {
  LOW:      { color: '#3da9fc', icon: <InfoIcon sx={{ fontSize: 14 }} /> },
  MEDIUM:   { color: '#e6a700', icon: <WarningAmberIcon sx={{ fontSize: 14 }} /> },
  HIGH:     { color: '#ef6c00', icon: <WarningAmberIcon sx={{ fontSize: 14 }} /> },
  CRITICAL: { color: '#e0413b', icon: <ErrorIcon sx={{ fontSize: 14 }} /> },
};

const ACTION_META = {
  CASE_OPENED:         { label: 'Case Opened',        color: '#3da9fc' },
  NOTIFICATION_SENT:   { label: 'Operator Notified',  color: '#e6a700' },
  RESPONSE_RECEIVED:   { label: 'Response Received',  color: '#8b5cf6' },
  ESCALATED:           { label: 'Escalated',          color: '#e0413b' },
  RESOLVED:            { label: 'Resolved',           color: '#2e9e5b' },
  CLOSED:              { label: 'Closed',             color: '#888'    },
  NOTE_ADDED:          { label: 'Note Added',         color: '#607d8b' },
  STATUS_CHANGED:      { label: 'Status Changed',     color: '#607d8b' },
};

const VALID_TRANSITIONS = {
  OPEN:      [{ to: 'NOTIFIED',  label: 'Notify Operator', icon: <NotificationsActiveIcon />, color: '#e6a700' }],
  NOTIFIED:  [
    { to: 'RESPONDED', label: 'Mark Responded', icon: <ReplyIcon />,       color: '#8b5cf6' },
    { to: 'ESCALATED', label: 'Escalate',       icon: <ArrowUpwardIcon />, color: '#e0413b' },
  ],
  RESPONDED: [
    { to: 'RESOLVED',  label: 'Resolve',  icon: <CheckCircleIcon />, color: '#2e9e5b' },
    { to: 'ESCALATED', label: 'Escalate', icon: <ArrowUpwardIcon />, color: '#e0413b' },
  ],
  ESCALATED: [{ to: 'RESOLVED', label: 'Resolve', icon: <CheckCircleIcon />, color: '#2e9e5b' }],
  RESOLVED:  [{ to: 'CLOSED',   label: 'Close',   icon: <LockIcon />,        color: '#888'    }],
  CLOSED:    [],
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function StatusChip({ status }) {
  const m = STATUS_META[status] || STATUS_META.OPEN;
  return (
    <Chip size="small" label={m.label}
      sx={{ bgcolor: m.bg, color: m.color, fontWeight: 700, fontSize: 11, height: 22,
        border: `1px solid ${alpha(m.color, 0.3)}` }} />
  );
}

function SeverityChip({ severity }) {
  const m = SEVERITY_META[severity] || SEVERITY_META.MEDIUM;
  return (
    <Chip size="small" icon={m.icon} label={severity}
      sx={{ bgcolor: alpha(m.color, 0.12), color: m.color, fontWeight: 700, fontSize: 10,
        height: 20, '& .MuiChip-icon': { color: m.color } }} />
  );
}

function daysUntil(deadline) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - Date.now()) / 86400000);
  return diff;
}

function DeadlineChip({ deadline }) {
  const d = daysUntil(deadline);
  if (d === null) return null;
  const color = d < 0 ? '#e0413b' : d <= 7 ? '#ef6c00' : '#2e9e5b';
  const label = d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? 'Due today' : `${d}d left`;
  return (
    <Chip size="small" label={label}
      sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 700, fontSize: 10, height: 20 }} />
  );
}

/* ── Summary stat card ───────────────────────────────────────────────────── */
function StatCard({ label, count, color }) {
  return (
    <Card sx={{ border: `1px solid ${alpha(color, 0.25)}`, height: '100%' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="h3" fontWeight={800} sx={{ color, lineHeight: 1 }}>{count}</Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
      </CardContent>
    </Card>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function Enforcement() {
  const [cases,    setCases]    = useState([]);
  const [summary,  setSummary]  = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);   // case detail
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);  // create dialog
  const [acting,   setActing]   = useState(null);   // { transition, caseId }
  const [noting,   setNoting]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [operators, setOperators] = useState([]);

  // Filters
  const [fStatus,   setFStatus]   = useState('');
  const [fSeverity, setFSeverity] = useState('');
  const [fOperator, setFOperator] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (fStatus)   params.status     = fStatus;
      if (fSeverity) params.severity   = fSeverity;
      if (fOperator) params.operatorId = fOperator;

      const [casesRes, summaryRes, opsRes] = await Promise.all([
        get('/enforcement', { params }),
        get('/enforcement/summary'),
        get('/operators'),
      ]);
      setCases(casesRes.data.rows ?? casesRes.data);
      setTotal(casesRes.data.total ?? (casesRes.data.rows ?? casesRes.data).length);
      setSummary(summaryRes.data);
      setOperators(opsRes.data?.rows ?? opsRes.data ?? []);
    } catch {
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [fStatus, fSeverity, fOperator]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (c) => {
    const res = await get(`/enforcement/${c.case_id}`);
    setSelected(res.data);
    setDrawerOpen(true);
  };

  const closeDrawer = () => { setDrawerOpen(false); setSelected(null); };

  const handleTransition = async (form) => {
    setSaving(true);
    try {
      const res = await put(`/enforcement/${acting.caseId}/status`, {
        toStatus: acting.transition.to, ...form,
      });
      setSelected(res.data);
      await load();
      setActing(null);
    } catch { /* noop */ }
    finally { setSaving(false); }
  };

  const handleNote = async (note) => {
    setSaving(true);
    try {
      const res = await post(`/enforcement/${selected.case_id}/notes`, { notes: note });
      setSelected(res.data);
      setNoting(false);
    } catch { /* noop */ }
    finally { setSaving(false); }
  };

  const handleAutoGenerate = async () => {
    setGenerating(true);
    try {
      const res = await post('/enforcement/auto-generate');
      await load();
      alert(`Generated ${res.data.generated} new enforcement case(s) from compliance violations.`);
    } catch { /* noop */ }
    finally { setGenerating(false); }
  };

  // Summary counts
  const counts = {};
  for (const s of summary) {
    counts[s.status] = (counts[s.status] || 0) + Number(s.count);
  }
  const openCount      = counts.OPEN      || 0;
  const notifiedCount  = counts.NOTIFIED  || 0;
  const escalatedCount = counts.ESCALATED || 0;
  const resolvedCount  = counts.RESOLVED  || 0;
  const totalActive    = openCount + notifiedCount + (counts.RESPONDED || 0) + escalatedCount;

  return (
    <Box>
      <PageHeader
        icon={<GavelIcon />}
        title="Enforcement Cases"
        subtitle="Regulatory violation tracking and operator accountability"
        actions={
          <>
            <Button variant="outlined" size="small"
              startIcon={generating ? null : <AutoFixHighIcon />}
              onClick={handleAutoGenerate} disabled={generating}>
              {generating ? 'Generating…' : 'Auto-generate from Violations'}
            </Button>
            <Button variant="contained" size="small" startIcon={<AddIcon />}
              onClick={() => setCreating(true)}>
              New Case
            </Button>
          </>
        }
      />

      {/* ── Summary stats ── */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Open',      count: openCount,      color: '#3da9fc' },
          { label: 'Notified',  count: notifiedCount,  color: '#e6a700' },
          { label: 'Escalated', count: escalatedCount, color: '#e0413b' },
          { label: 'Resolved',  count: resolvedCount,  color: '#2e9e5b' },
          { label: 'Active Total', count: totalActive, color: '#8b5cf6' },
        ].map((s) => (
          <Grid item xs={6} sm={4} md={2.4} key={s.label}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* ── Filters + table ── */}
      <Card>
        <CardContent>
          {/* Filter bar */}
          <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap">
            <FilterListIcon color="action" />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Status</InputLabel>
              <Select value={fStatus} label="Status" onChange={(e) => setFStatus(e.target.value)}>
                <MenuItem value="">All statuses</MenuItem>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Severity</InputLabel>
              <Select value={fSeverity} label="Severity" onChange={(e) => setFSeverity(e.target.value)}>
                <MenuItem value="">All severities</MenuItem>
                {['CRITICAL','HIGH','MEDIUM','LOW'].map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Operator</InputLabel>
              <Select value={fOperator} label="Operator" onChange={(e) => setFOperator(e.target.value)}>
                <MenuItem value="">All operators</MenuItem>
                {operators.map((o) => (
                  <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.secondary">{total} case{total !== 1 ? 's' : ''}</Typography>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={load}><RefreshIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Stack>

          {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

          {!loading && !cases.length
            ? <EmptyState message="No enforcement cases found." hint="Use 'Auto-generate from Violations' to create cases from existing compliance failures." />
            : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ref</TableCell>
                    <TableCell>Operator</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Deadline</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cases.map((c) => (
                    <TableRow key={c.case_id} hover sx={{ cursor: 'pointer' }}
                      onClick={() => openDetail(c)}>
                      <TableCell>
                        <Typography variant="caption" fontWeight={700} fontFamily="monospace"
                          sx={{ color: 'primary.main' }}>
                          {c.case_ref}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={c.operator_name} sx={{ height: 20, fontSize: 11 }} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Typography variant="body2" noWrap>{c.title}</Typography>
                        {c.kpi_name && (
                          <Typography variant="caption" color="text.secondary">{c.kpi_name}</Typography>
                        )}
                      </TableCell>
                      <TableCell><SeverityChip severity={c.severity} /></TableCell>
                      <TableCell><StatusChip status={c.status} /></TableCell>
                      <TableCell><DeadlineChip deadline={c.deadline} /></TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(c.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={0.5}>
                          {(VALID_TRANSITIONS[c.status] ?? []).slice(0, 1).map((t) => (
                            <Tooltip key={t.to} title={t.label}>
                              <IconButton size="small"
                                onClick={(e) => { e.stopPropagation(); setActing({ transition: t, caseId: c.case_id }); }}
                                sx={{ color: t.color, '&:hover': { bgcolor: alpha(t.color, 0.1) } }}>
                                {t.icon}
                              </IconButton>
                            </Tooltip>
                          ))}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>

      {/* ── Case detail drawer ── */}
      <Drawer anchor="right" open={drawerOpen} onClose={closeDrawer}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 3 } }}>
        {selected && (
          <Box>
            {/* Drawer header */}
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={2}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontFamily="monospace" fontWeight={700}>
                  {selected.case_ref}
                </Typography>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>{selected.title}</Typography>
                <Stack direction="row" spacing={1} mt={0.75}>
                  <StatusChip status={selected.status} />
                  <SeverityChip severity={selected.severity} />
                  <DeadlineChip deadline={selected.deadline} />
                </Stack>
              </Box>
              <IconButton size="small" onClick={closeDrawer}><CloseIcon /></IconButton>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {/* Meta */}
            <Grid container spacing={1.5} mb={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Operator</Typography>
                <Typography variant="body2" fontWeight={600}>{selected.operator_name}</Typography>
              </Grid>
              {selected.kpi_name && (
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">KPI</Typography>
                  <Typography variant="body2" fontWeight={600}>{selected.kpi_name} ({selected.kpi_key})</Typography>
                </Grid>
              )}
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Opened by</Typography>
                <Typography variant="body2" fontWeight={600}>{selected.created_by_name || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Deadline</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selected.deadline ? new Date(selected.deadline).toLocaleDateString() : '—'}
                </Typography>
              </Grid>
              {selected.description && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography variant="body2">{selected.description}</Typography>
                </Grid>
              )}
              {selected.operator_response && (
                <Grid item xs={12}>
                  <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                    <AlertTitle sx={{ fontSize: 12 }}>Operator Response</AlertTitle>
                    <Typography variant="caption">{selected.operator_response}</Typography>
                  </Alert>
                </Grid>
              )}
              {selected.resolved_notes && (
                <Grid item xs={12}>
                  <Alert severity="success" variant="outlined" sx={{ py: 0.5 }}>
                    <AlertTitle sx={{ fontSize: 12 }}>Resolution Notes</AlertTitle>
                    <Typography variant="caption">{selected.resolved_notes}</Typography>
                  </Alert>
                </Grid>
              )}
            </Grid>

            {/* Action buttons */}
            {(VALID_TRANSITIONS[selected.status] ?? []).length > 0 && (
              <Box mb={2}>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>
                  ACTIONS
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {(VALID_TRANSITIONS[selected.status] ?? []).map((t) => (
                    <Button key={t.to} size="small" variant="outlined" startIcon={t.icon}
                      onClick={() => setActing({ transition: t, caseId: selected.case_id })}
                      sx={{ color: t.color, borderColor: alpha(t.color, 0.4),
                        '&:hover': { bgcolor: alpha(t.color, 0.08), borderColor: t.color } }}>
                      {t.label}
                    </Button>
                  ))}
                  <Button size="small" variant="outlined" startIcon={<NoteAddIcon />}
                    onClick={() => setNoting(true)}
                    sx={{ color: '#607d8b', borderColor: alpha('#607d8b', 0.4) }}>
                    Add Note
                  </Button>
                </Stack>
              </Box>
            )}

            {/* Timeline */}
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>
              TIMELINE
            </Typography>
            {selected.timeline?.length ? (
              <Box sx={{ pl: 1 }}>
                {selected.timeline.map((a, i) => {
                  const m = ACTION_META[a.action_type] || { label: a.action_type, color: '#607d8b' };
                  return (
                    <Stack key={a.action_id} direction="row" spacing={1.5} mb={1.5} alignItems="flex-start">
                      <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(m.color, 0.15), mt: 0.25 }}>
                        <PersonIcon sx={{ fontSize: 14, color: m.color }} />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" fontWeight={700} sx={{ color: m.color }}>
                            {m.label}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {a.performed_by_name || 'System'}
                          </Typography>
                        </Stack>
                        {a.notes && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {a.notes}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                          {new Date(a.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                      {i < selected.timeline.length - 1 && (
                        <Box sx={{ position: 'absolute', left: 13, mt: 4, width: 1, height: 20, bgcolor: 'divider' }} />
                      )}
                    </Stack>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="caption" color="text.disabled">No actions yet.</Typography>
            )}
          </Box>
        )}
      </Drawer>

      {/* ── Transition dialog ── */}
      {acting && (
        <TransitionDialog
          transition={acting.transition}
          onConfirm={handleTransition}
          onClose={() => setActing(null)}
          saving={saving}
        />
      )}

      {/* ── Add note dialog ── */}
      {noting && (
        <NoteDialog
          onConfirm={handleNote}
          onClose={() => setNoting(false)}
          saving={saving}
        />
      )}

      {/* ── Create case dialog ── */}
      {creating && (
        <CreateCaseDialog
          operators={operators}
          onConfirm={async (data) => {
            setSaving(true);
            try {
              const res = await post('/enforcement', data);
              setCreating(false);
              await load();
              setSelected(res.data);
              setDrawerOpen(true);
            } catch { /* noop */ }
            finally { setSaving(false); }
          }}
          onClose={() => setCreating(false)}
          saving={saving}
        />
      )}
    </Box>
  );
}

/* ── Transition dialog ───────────────────────────────────────────────────── */
function TransitionDialog({ transition, onConfirm, onClose, saving }) {
  const [notes,           setNotes]           = useState('');
  const [operatorResponse, setOperatorResponse] = useState('');
  const [resolvedNotes,   setResolvedNotes]   = useState('');

  const needsResponse = transition.to === 'RESPONDED';
  const needsResolved = transition.to === 'RESOLVED';

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ color: transition.color }}>{transition.icon}</Box>
        {transition.label}
      </DialogTitle>
      <DialogContent>
        {needsResponse && (
          <TextField fullWidth multiline rows={3} label="Operator's response" value={operatorResponse}
            onChange={(e) => setOperatorResponse(e.target.value)} sx={{ mb: 2, mt: 1 }} />
        )}
        {needsResolved && (
          <TextField fullWidth multiline rows={3} label="Resolution notes" value={resolvedNotes}
            onChange={(e) => setResolvedNotes(e.target.value)} sx={{ mb: 2, mt: 1 }} />
        )}
        <TextField fullWidth multiline rows={2} label="Internal notes (optional)" value={notes}
          onChange={(e) => setNotes(e.target.value)} sx={{ mt: needsResponse || needsResolved ? 0 : 1 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" disabled={saving}
          onClick={() => onConfirm({ notes, operatorResponse, resolvedNotes })}
          sx={{ bgcolor: transition.color, '&:hover': { bgcolor: transition.color, filter: 'brightness(1.1)' } }}>
          {saving ? 'Saving…' : transition.label}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Note dialog ─────────────────────────────────────────────────────────── */
function NoteDialog({ onConfirm, onClose, saving }) {
  const [note, setNote] = useState('');
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Note</DialogTitle>
      <DialogContent>
        <TextField fullWidth multiline rows={4} label="Note" value={note}
          onChange={(e) => setNote(e.target.value)} sx={{ mt: 1 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" disabled={saving || !note.trim()} onClick={() => onConfirm(note)}>
          {saving ? 'Saving…' : 'Add Note'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Create case dialog ──────────────────────────────────────────────────── */
function CreateCaseDialog({ operators, onConfirm, onClose, saving }) {
  const [form, setForm] = useState({
    operatorId: '', title: '', description: '',
    severity: 'MEDIUM', deadline: '',
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.operatorId && form.title;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Enforcement Case</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <FormControl fullWidth size="small">
            <InputLabel>Operator *</InputLabel>
            <Select value={form.operatorId} label="Operator *" onChange={set('operatorId')}>
              {operators.map((o) => (
                <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth size="small" label="Title *" value={form.title} onChange={set('title')} />
          <TextField fullWidth size="small" multiline rows={3} label="Description"
            value={form.description} onChange={set('description')} />
          <FormControl fullWidth size="small">
            <InputLabel>Severity</InputLabel>
            <Select value={form.severity} label="Severity" onChange={set('severity')}>
              {['CRITICAL','HIGH','MEDIUM','LOW'].map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth size="small" type="date" label="Response deadline"
            InputLabelProps={{ shrink: true }} value={form.deadline} onChange={set('deadline')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" disabled={saving || !valid} onClick={() => onConfirm(form)}>
          {saving ? 'Creating…' : 'Create Case'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
