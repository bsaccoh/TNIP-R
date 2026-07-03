import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Stack, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  IconButton, Button, Select, MenuItem, FormControl, InputLabel,
  TextField, Drawer, CircularProgress, Alert, Divider,
  LinearProgress, Tab, Tabs,
} from '@mui/material';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../auth/AuthContext';

/* ── Meta ────────────────────────────────────────────────────────────────── */
const ISSUE_LABELS = {
  NO_COVERAGE:        'No Coverage',
  CALL_DROP:          'Call Drop',
  POOR_VOICE_QUALITY: 'Poor Voice',
  SLOW_DATA:          'Slow Data',
  NO_DATA:            'No Data',
  SMS_FAILURE:        'SMS Failure',
  BILLING_ISSUE:      'Billing',
  OTHER:              'Other',
};

const SEVERITY_META = {
  LOW:      { color: '#757575', chip: 'default' },
  MEDIUM:   { color: '#0277bd', chip: 'info'    },
  HIGH:     { color: '#e65100', chip: 'warning' },
  CRITICAL: { color: '#c62828', chip: 'error'   },
};

const STATUS_META = {
  NEW:          { label: 'New',          color: 'error'   },
  UNDER_REVIEW: { label: 'Under Review', color: 'warning' },
  ESCALATED:    { label: 'Escalated',    color: 'error'   },
  RESOLVED:     { label: 'Resolved',     color: 'success' },
  DISMISSED:    { label: 'Dismissed',    color: 'default' },
};

function timeSince(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, color = '#1565c0', sub, onClick, selected }) {
  return (
    <Paper elevation={selected ? 4 : 2} onClick={onClick}
      sx={{ p: 2, borderTop: `4px solid ${color}`, height: '100%', cursor: onClick ? 'pointer' : 'default',
            outline: selected ? `2px solid ${color}` : 'none', transition: 'all .15s' }}>
      <Typography variant="h4" fontWeight={700} color={color}>{value ?? 0}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {sub && <Typography variant="caption" color="text.disabled">{sub}</Typography>}
    </Paper>
  );
}

/* ── Bar chart (pure CSS) ────────────────────────────────────────────────── */
function BarChart({ data, labelKey, valueKey, color = '#1565c0', maxItems = 8 }) {
  const rows  = (data || []).slice(0, maxItems);
  const maxV  = Math.max(...rows.map((r) => Number(r[valueKey]) || 0), 1);
  return (
    <Stack spacing={1}>
      {rows.map((r) => {
        const pct = (Number(r[valueKey]) / maxV) * 100;
        return (
          <Box key={r[labelKey]}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
              <Typography variant="caption">{r[labelKey]}</Typography>
              <Typography variant="caption" fontWeight={700}>{r[valueKey]}</Typography>
            </Box>
            <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3,
              '& .MuiLinearProgress-bar': { bgcolor: color } }} />
          </Box>
        );
      })}
    </Stack>
  );
}

/* ── Complaint drawer ────────────────────────────────────────────────────── */
function ComplaintDrawer({ complaint, onClose, onUpdated, isRegulator }) {
  const [status, setStatus]         = useState('');
  const [note, setNote]             = useState('');
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');

  useEffect(() => {
    if (complaint) { setStatus(complaint.status); setNote(''); setErr(''); }
  }, [complaint]);

  if (!complaint) return null;

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/qoe/${complaint.complaint_id}`, { status, resolutionNote: note });
      onUpdated();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const sm = SEVERITY_META[complaint.severity] || {};

  return (
    <Drawer anchor="right" open={Boolean(complaint)} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}>
      <Box sx={{ p: 3, background: 'linear-gradient(135deg,#4a148c,#6a1b9a)', color: '#fff',
                 display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>{complaint.complaint_ref}</Typography>
          <Typography variant="h6" fontWeight={700}>{ISSUE_LABELS[complaint.issue_type] || complaint.issue_type}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            <Chip size="small" label={complaint.operator_name || 'Unknown'}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.7rem' }} />
            <Chip size="small" label={complaint.severity}
              sx={{ bgcolor: sm.color, color: '#fff', fontSize: '0.7rem' }} />
          </Stack>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
        {/* Location */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Location</Typography>
        <Typography variant="body2">{complaint.district || '—'}</Typography>
        {complaint.area_detail && (
          <Typography variant="caption" color="text.secondary">{complaint.area_detail}</Typography>
        )}
        {complaint.latitude && (
          <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
            {complaint.latitude}, {complaint.longitude}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Description */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Description</Typography>
        <Typography variant="body2" color={complaint.description ? 'text.primary' : 'text.disabled'}>
          {complaint.description || 'No description provided'}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Reporter */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Reporter</Typography>
        <Stack spacing={0.5}>
          {[
            { l: 'Name',  v: complaint.reporter_name  },
            { l: 'Phone', v: complaint.reporter_phone },
            { l: 'Email', v: complaint.reporter_email },
          ].map(({ l, v }) => v ? (
            <Box key={l} sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ width: 60 }}>{l}</Typography>
              <Typography variant="caption" fontWeight={600}>{v}</Typography>
            </Box>
          ) : null)}
          {!complaint.reporter_name && !complaint.reporter_phone && !complaint.reporter_email && (
            <Typography variant="caption" color="text.disabled">Anonymous submission</Typography>
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Meta */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {[
            { l: 'Technology', v: complaint.technology || '—' },
            { l: 'Submitted',  v: timeSince(complaint.created_at) },
            { l: 'Source',     v: complaint.source },
          ].map(({ l, v }) => (
            <Grid item xs={6} key={l}>
              <Typography variant="caption" color="text.secondary">{l}</Typography>
              <Typography variant="body2" fontWeight={600}>{v}</Typography>
            </Grid>
          ))}
        </Grid>

        {complaint.resolution_note && (
          <>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              Resolution Note
            </Typography>
            <Alert severity="success" sx={{ mb: 2 }}>{complaint.resolution_note}</Alert>
          </>
        )}

        {/* Actions */}
        {isRegulator && !['RESOLVED','DISMISSED'].includes(complaint.status) && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Update Status</Typography>
            {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth multiline rows={3} size="small"
              label="Resolution Note (optional)"
              value={note} onChange={(e) => setNote(e.target.value)} sx={{ mb: 2 }} />
            <Button variant="contained" fullWidth onClick={save} disabled={saving}>
              {saving ? <CircularProgress size={20} /> : 'Save Update'}
            </Button>
          </>
        )}
      </Box>
    </Drawer>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function ConsumerQoE() {
  const { user } = useAuth();
  const isRegulator = ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'].includes(user?.role);

  const [summary, setSummary]       = useState({});
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [tab, setTab]               = useState(0);

  const [filters, setFilters] = useState({
    status: 'NEW', operatorId: '', issueType: '', district: '', days: 30,
  });

  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        api.get('/qoe/summary', { params: { days: filters.days } }),
        api.get('/qoe', { params: {
          status:     filters.status    || undefined,
          operatorId: filters.operatorId || undefined,
          issueType:  filters.issueType  || undefined,
          district:   filters.district   || undefined,
          limit: 100,
        }}),
      ]);
      setSummary(sRes.data.data || {});
      setComplaints(cRes.data.data?.rows || []);
      setTotal(cRes.data.data?.total || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const counts = summary.counts || {};

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <PageHeader
        icon={<SentimentVeryDissatisfiedIcon />}
        title="Consumer QoE Dashboard"
        subtitle="Crowdsourced network quality complaints from consumers across Sierra Leone"
        actions={
          <>
            <Button variant="outlined" size="small" startIcon={<OpenInNewIcon />}
              href="/report" target="_blank">
              Public Form
            </Button>
            <IconButton onClick={load}><RefreshIcon /></IconButton>
          </>
        }
      />

      {/* Summary stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'New',        value: counts.new_complaints, color: '#c62828',
            onClick: () => setFilters((f) => ({ ...f, status: 'NEW' })),
            selected: filters.status === 'NEW' },
          { label: 'Under Review', value: counts.under_review, color: '#e65100',
            onClick: () => setFilters((f) => ({ ...f, status: 'UNDER_REVIEW' })),
            selected: filters.status === 'UNDER_REVIEW' },
          { label: 'Critical/High', value: (counts.critical || 0) + (counts.high || 0), color: '#b71c1c',
            sub: 'all statuses' },
          { label: 'Resolved', value: counts.resolved, color: '#2e7d32',
            onClick: () => setFilters((f) => ({ ...f, status: 'RESOLVED' })),
            selected: filters.status === 'RESOLVED' },
        ].map((c) => (
          <Grid item xs={6} sm={3} key={c.label}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      {/* Tabs: Table | Analytics */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Complaints" />
        <Tab label="Analytics" />
      </Tabs>

      {tab === 1 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>By Operator</Typography>
              <BarChart data={summary.byOperator} labelKey="operator_name" valueKey="total" color="#7b1fa2" />
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>By Issue Type</Typography>
              <BarChart
                data={(summary.byIssueType || []).map((r) => ({ ...r, label: ISSUE_LABELS[r.issue_type] || r.issue_type }))}
                labelKey="label" valueKey="total" color="#1565c0" />
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>By District</Typography>
              <BarChart data={summary.byDistrict} labelKey="district" valueKey="total" color="#2e7d32" />
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Filter bar */}
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filters.status} label="Status" onChange={setF('status')}>
            <MenuItem value="">All</MenuItem>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Issue</InputLabel>
          <Select value={filters.issueType} label="Issue" onChange={setF('issueType')}>
            <MenuItem value="">All</MenuItem>
            {Object.entries(ISSUE_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Days</InputLabel>
          <Select value={filters.days} label="Days" onChange={setF('days')}>
            {[7, 14, 30, 60, 90].map((d) => (
              <MenuItem key={d} value={d}>Last {d}d</MenuItem>
            ))}
          </Select>
        </FormControl>
        {filters.status || filters.issueType ? (
          <Button size="small" onClick={() => setFilters((f) => ({ ...f, status: '', issueType: '' }))}>
            Clear filters
          </Button>
        ) : null}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {total} complaints
        </Typography>
      </Stack>

      {/* Table */}
      {loading
        ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        : (
          <TableContainer component={Paper} elevation={2}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>Ref</TableCell>
                  <TableCell>Issue</TableCell>
                  <TableCell>Operator</TableCell>
                  <TableCell>District</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {complaints.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>No complaints found</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {complaints.map((c) => {
                  const sm = SEVERITY_META[c.severity] || {};
                  const st = STATUS_META[c.status]    || {};
                  return (
                    <TableRow key={c.complaint_id} hover sx={{ cursor: 'pointer' }}
                      onClick={() => setSelected(c)}>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">{c.complaint_ref}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {ISSUE_LABELS[c.issue_type] || c.issue_type}
                        </Typography>
                        {c.description && (
                          <Typography variant="caption" color="text.secondary"
                            sx={{ display: '-webkit-box', WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {c.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{c.operator_name || '—'}</TableCell>
                      <TableCell>{c.district || '—'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={c.severity} color={sm.chip}
                          variant="outlined" sx={{ fontSize: '0.68rem' }} />
                      </TableCell>
                      <TableCell>
                        <Tooltip title={new Date(c.created_at).toLocaleString()}>
                          <Typography variant="caption">{timeSince(c.created_at)}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={st.label} color={st.color}
                          variant={c.status === 'NEW' ? 'filled' : 'outlined'}
                          sx={{ fontSize: '0.68rem' }} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

      <ComplaintDrawer
        complaint={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => { load(); setSelected(null); }}
        isRegulator={isRegulator}
      />
    </Box>
  );
}
