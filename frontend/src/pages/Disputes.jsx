import { useEffect, useState, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack, Chip, Table, TableBody,
  TableCell, TableHead, TableRow, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, FormControl,
  InputLabel, Drawer, Divider, LinearProgress, Tooltip, Alert, AlertTitle,
  alpha,
} from '@mui/material';
import BalanceIcon from '@mui/icons-material/Balance';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { get, post, put } from '../api/client';
import PageHeader from '../components/PageHeader';
import { Loading, EmptyState } from '../components/ui';

const STATUS_META = {
  OPEN:         { label: 'Open',         color: '#3da9fc', bg: '#3da9fc18' },
  UNDER_REVIEW: { label: 'Under Review', color: '#e6a700', bg: '#e6a70018' },
  ACCEPTED:     { label: 'Accepted',     color: '#2e9e5b', bg: '#2e9e5b18' },
  REJECTED:     { label: 'Rejected',     color: '#e0413b', bg: '#e0413b18' },
};

function StatusChip({ status }) {
  const m = STATUS_META[status] || STATUS_META.OPEN;
  return (
    <Chip size="small" label={m.label}
      sx={{ bgcolor: m.bg, color: m.color, fontWeight: 700, fontSize: 11, height: 22,
        border: `1px solid ${alpha(m.color, 0.3)}` }} />
  );
}

function StatCard({ label, count, color }) {
  return (
    <Card sx={{ border: `1px solid ${alpha(color, 0.2)}`, height: '100%' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="h3" fontWeight={800} sx={{ color, lineHeight: 1 }}>{count}</Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
      </CardContent>
    </Card>
  );
}

export default function Disputes() {
  const { user }    = useAuth();
  const location    = useLocation();
  const isOperator  = user?.role === 'OPERATOR_USER';

  const [disputes, setDisputes] = useState([]);
  const [summary,  setSummary]  = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [reviewing,  setReviewing]  = useState(null); // { dispute, decision }
  const [saving,     setSaving]     = useState(false);
  const [operators,  setOperators]  = useState([]);
  const [fStatus,    setFStatus]    = useState('');

  // Pre-fill from query params (e.g. ?new=1&caseRef=ENF-...)
  const qs = new URLSearchParams(location.search);
  const prefillCaseRef = qs.get('caseRef') ?? '';
  const autoOpen       = qs.get('new') === '1';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (fStatus) params.status = fStatus;
      const [dRes, sRes] = await Promise.all([
        get('/disputes', { params }),
        get('/disputes/summary'),
      ]);
      setDisputes(dRes.data.rows ?? dRes.data);
      setTotal(dRes.data.total ?? (dRes.data.rows ?? dRes.data).length);
      setSummary(sRes.data);

      if (!isOperator) {
        const opsRes = await get('/operators');
        setOperators(opsRes.data?.rows ?? opsRes.data ?? []);
      }
    } catch {
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [fStatus, isOperator]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (autoOpen) setCreating(true);
  }, []); // eslint-disable-line

  const openDetail = async (d) => {
    const res = await get(`/disputes/${d.dispute_id}`);
    setSelected(res.data);
    setDrawerOpen(true);
  };

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await post('/disputes', form);
      setCreating(false);
      await load();
    } catch { /* noop */ }
    finally { setSaving(false); }
  };

  const handleReview = async ({ status, reviewNotes }) => {
    setSaving(true);
    try {
      const res = await put(`/disputes/${reviewing.dispute.dispute_id}/review`, { status, reviewNotes });
      setSelected(res.data);
      setReviewing(null);
      await load();
    } catch { /* noop */ }
    finally { setSaving(false); }
  };

  const counts = {};
  for (const s of summary) counts[s.status] = Number(s.count);

  return (
    <Box>
      <PageHeader
        icon={<BalanceIcon />}
        title={isOperator ? 'My Disputes' : 'Dispute Management'}
        subtitle={isOperator
          ? 'Challenge compliance findings and enforcement cases'
          : 'Review and adjudicate operator dispute submissions'}
        actions={
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
            {isOperator ? 'Raise a Dispute' : 'Create Dispute'}
          </Button>
        }
      />

      {/* ── Stats ── */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Open',         count: counts.OPEN         || 0, color: '#3da9fc' },
          { label: 'Under Review', count: counts.UNDER_REVIEW || 0, color: '#e6a700' },
          { label: 'Accepted',     count: counts.ACCEPTED     || 0, color: '#2e9e5b' },
          { label: 'Rejected',     count: counts.REJECTED     || 0, color: '#e0413b' },
        ].map((s) => (
          <Grid item xs={6} sm={3} key={s.label}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* ── Table ── */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap">
            <FilterListIcon color="action" />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select value={fStatus} label="Status" onChange={(e) => setFStatus(e.target.value)}>
                <MenuItem value="">All statuses</MenuItem>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.secondary">{total} dispute{total !== 1 ? 's' : ''}</Typography>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={load}><RefreshIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Stack>

          {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

          {!loading && !disputes.length
            ? <EmptyState message="No disputes found."
                hint={isOperator ? "Use 'Raise a Dispute' to challenge a compliance finding." : ''} />
            : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ref</TableCell>
                    {!isOperator && <TableCell>Operator</TableCell>}
                    <TableCell>Title</TableCell>
                    <TableCell>Linked Case</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Submitted</TableCell>
                    {!isOperator && <TableCell>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {disputes.map((d) => (
                    <TableRow key={d.dispute_id} hover sx={{ cursor: 'pointer' }}
                      onClick={() => openDetail(d)}>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace" fontWeight={700} color="primary.main">
                          {d.dispute_ref}
                        </Typography>
                      </TableCell>
                      {!isOperator && (
                        <TableCell>
                          <Chip size="small" label={d.operator_name} sx={{ height: 20, fontSize: 11 }} />
                        </TableCell>
                      )}
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography variant="body2" noWrap>{d.title}</Typography>
                      </TableCell>
                      <TableCell>
                        {d.case_ref
                          ? <Typography variant="caption" fontFamily="monospace" color="text.secondary">{d.case_ref}</Typography>
                          : <Typography variant="caption" color="text.disabled">—</Typography>}
                      </TableCell>
                      <TableCell><StatusChip status={d.status} /></TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(d.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      {!isOperator && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {(d.status === 'OPEN' || d.status === 'UNDER_REVIEW') && (
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="Accept">
                                <IconButton size="small" sx={{ color: '#2e9e5b' }}
                                  onClick={() => setReviewing({ dispute: d, decision: 'ACCEPTED' })}>
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton size="small" sx={{ color: '#e0413b' }}
                                  onClick={() => setReviewing({ dispute: d, decision: 'REJECTED' })}>
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {d.status === 'OPEN' && (
                                <Tooltip title="Mark Under Review">
                                  <IconButton size="small" sx={{ color: '#e6a700' }}
                                    onClick={() => setReviewing({ dispute: d, decision: 'UNDER_REVIEW' })}>
                                    <HourglassTopIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>

      {/* ── Detail drawer ── */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => { setDrawerOpen(false); setSelected(null); }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}>
        {selected && (
          <Box>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={2}>
              <Box>
                <Typography variant="caption" fontFamily="monospace" fontWeight={700} color="primary.main">
                  {selected.dispute_ref}
                </Typography>
                <Typography variant="h6" fontWeight={700}>{selected.title}</Typography>
                <StatusChip status={selected.status} />
              </Box>
              <IconButton size="small" onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={1.5} mb={2}>
              {!isOperator && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Operator</Typography>
                  <Typography variant="body2" fontWeight={600}>{selected.operator_name}</Typography>
                </Grid>
              )}
              {selected.case_ref && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Linked Enforcement Case</Typography>
                  <Typography variant="body2" fontWeight={600} fontFamily="monospace">{selected.case_ref}</Typography>
                  {selected.case_title && (
                    <Typography variant="caption" color="text.secondary">{selected.case_title}</Typography>
                  )}
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography variant="body2">{selected.description}</Typography>
              </Grid>
              {selected.evidence && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Evidence / References</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{selected.evidence}</Typography>
                </Grid>
              )}
              {selected.review_notes && (
                <Grid item xs={12}>
                  <Alert severity={selected.status === 'ACCEPTED' ? 'success' : 'error'} variant="outlined" sx={{ py: 0.5 }}>
                    <AlertTitle sx={{ fontSize: 12 }}>Regulator Decision</AlertTitle>
                    {selected.review_notes}
                    {selected.reviewed_by_name && (
                      <Typography variant="caption" display="block" mt={0.25}>— {selected.reviewed_by_name}</Typography>
                    )}
                  </Alert>
                </Grid>
              )}
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Submitted by</Typography>
                <Typography variant="body2">{selected.submitted_by_name || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Submitted on</Typography>
                <Typography variant="body2">{new Date(selected.created_at).toLocaleDateString()}</Typography>
              </Grid>
            </Grid>
            {!isOperator && (selected.status === 'OPEN' || selected.status === 'UNDER_REVIEW') && (
              <>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>
                  ACTIONS
                </Typography>
                <Stack direction="row" spacing={1}>
                  {selected.status === 'OPEN' && (
                    <Button size="small" variant="outlined" startIcon={<HourglassTopIcon />}
                      onClick={() => setReviewing({ dispute: selected, decision: 'UNDER_REVIEW' })}
                      sx={{ color: '#e6a700', borderColor: alpha('#e6a700', 0.4) }}>
                      Start Review
                    </Button>
                  )}
                  <Button size="small" variant="outlined" startIcon={<CheckCircleIcon />}
                    onClick={() => setReviewing({ dispute: selected, decision: 'ACCEPTED' })}
                    sx={{ color: '#2e9e5b', borderColor: alpha('#2e9e5b', 0.4) }}>
                    Accept
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<CancelIcon />}
                    onClick={() => setReviewing({ dispute: selected, decision: 'REJECTED' })}
                    sx={{ color: '#e0413b', borderColor: alpha('#e0413b', 0.4) }}>
                    Reject
                  </Button>
                </Stack>
              </>
            )}
          </Box>
        )}
      </Drawer>

      {/* ── Create dialog ── */}
      {creating && (
        <CreateDisputeDialog
          isOperator={isOperator}
          operators={operators}
          prefillCaseRef={prefillCaseRef}
          onConfirm={handleCreate}
          onClose={() => setCreating(false)}
          saving={saving}
        />
      )}

      {/* ── Review dialog ── */}
      {reviewing && (
        <ReviewDialog
          dispute={reviewing.dispute}
          decision={reviewing.decision}
          onConfirm={handleReview}
          onClose={() => setReviewing(null)}
          saving={saving}
        />
      )}
    </Box>
  );
}

/* ── Create dispute dialog ───────────────────────────────────────────────── */
function CreateDisputeDialog({ isOperator, operators, prefillCaseRef, onConfirm, onClose, saving }) {
  const [form, setForm] = useState({
    title: '', description: '', evidence: '',
    caseId: '', operatorId: '',
    prefillNote: prefillCaseRef ? `Disputing enforcement case: ${prefillCaseRef}` : '',
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.title && form.description;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <BalanceIcon color="primary" />
          <span>Raise a Dispute</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {!isOperator && (
            <FormControl fullWidth size="small">
              <InputLabel>Operator *</InputLabel>
              <Select value={form.operatorId} label="Operator *" onChange={set('operatorId')}>
                {operators.map((o) => (
                  <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField fullWidth size="small" label="Title *" value={form.title} onChange={set('title')}
            placeholder="e.g. RSRP failure disputed — planned maintenance window" />
          <TextField fullWidth size="small" multiline rows={4} label="Description *"
            value={form.description} onChange={set('description')}
            placeholder="Explain why this compliance finding or enforcement action should be reviewed…" />
          <TextField fullWidth size="small" multiline rows={3} label="Evidence / References"
            value={form.evidence} onChange={set('evidence')}
            placeholder="URLs, document references, technical evidence, maintenance records…" />
          {prefillCaseRef && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              <Typography variant="caption">Linked to enforcement case: <strong>{prefillCaseRef}</strong></Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" disabled={saving || !valid}
          onClick={() => onConfirm({ ...form, operatorId: form.operatorId || undefined })}>
          {saving ? 'Submitting…' : 'Submit Dispute'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Review decision dialog ──────────────────────────────────────────────── */
function ReviewDialog({ dispute, decision, onConfirm, onClose, saving }) {
  const [notes, setNotes] = useState('');
  const meta = STATUS_META[decision] ?? STATUS_META.OPEN;
  const labels = { UNDER_REVIEW: 'Start Review', ACCEPTED: 'Accept Dispute', REJECTED: 'Reject Dispute' };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: meta.color }}>{labels[decision] ?? decision}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {decision === 'UNDER_REVIEW' && 'Mark this dispute as currently under regulatory review.'}
          {decision === 'ACCEPTED' && 'Accepting this dispute will acknowledge the operator\'s challenge. Add your decision notes below.'}
          {decision === 'REJECTED' && 'Rejecting this dispute upholds the original finding. Provide a reason below.'}
        </Typography>
        <TextField fullWidth multiline rows={3}
          label={decision === 'UNDER_REVIEW' ? 'Notes (optional)' : 'Decision notes *'}
          value={notes} onChange={(e) => setNotes(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" disabled={saving || (decision !== 'UNDER_REVIEW' && !notes.trim())}
          onClick={() => onConfirm({ status: decision, reviewNotes: notes })}
          sx={{ bgcolor: meta.color, '&:hover': { bgcolor: meta.color, filter: 'brightness(1.1)' } }}>
          {saving ? 'Saving…' : labels[decision]}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
