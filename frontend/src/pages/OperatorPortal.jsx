import { useEffect, useState, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack, Chip, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, Button, LinearProgress,
  Alert, AlertTitle, CircularProgress, alpha,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import GavelIcon from '@mui/icons-material/Gavel';
import VerifiedIcon from '@mui/icons-material/Verified';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import AddIcon from '@mui/icons-material/Add';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { get } from '../api/client';
import { api } from '../api/client';
import { Loading, EmptyState, fmt } from '../components/ui';

const SEVERITY_COLOR = { CRITICAL: '#e0413b', HIGH: '#ef6c00', MEDIUM: '#e6a700', LOW: '#3da9fc' };
const STATUS_COLOR   = { OPEN: '#3da9fc', NOTIFIED: '#e6a700', ESCALATED: '#e0413b', RESPONDED: '#8b5cf6' };

function KpiStatusIcon({ status }) {
  if (status === 'PASS')    return <CheckCircleIcon sx={{ fontSize: 16, color: '#2e9e5b' }} />;
  if (status === 'WARNING') return <WarningAmberIcon sx={{ fontSize: 16, color: '#e6a700' }} />;
  return <ErrorIcon sx={{ fontSize: 16, color: '#e0413b' }} />;
}

function TrendIcon({ trend }) {
  if (trend === 'UP')   return <TrendingUpIcon sx={{ fontSize: 16, color: '#2e9e5b' }} />;
  if (trend === 'DOWN') return <TrendingDownIcon sx={{ fontSize: 16, color: '#e0413b' }} />;
  return <TrendingFlatIcon sx={{ fontSize: 16, color: '#888' }} />;
}

function ComplianceRing({ rate }) {
  const r   = 36;
  const circ = 2 * Math.PI * r;
  const pct  = rate ?? 0;
  const color = pct >= 90 ? '#2e9e5b' : pct >= 70 ? '#e6a700' : '#e0413b';

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={48} r={r} fill="none" stroke="#ffffff15" strokeWidth={8} />
        <circle cx={48} cy={48} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" fontWeight={800} sx={{ color, lineHeight: 1 }}>{pct}%</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 9 }}>COMPLIANCE</Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function OperatorPortal() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/operator-portal/overview')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading height={400} />;
  if (!data)   return <EmptyState message="Could not load your operator overview." />;

  const { operator, compliance, ranking, kpis, recentUploads, enforcementCases, openDisputes } = data;

  return (
    <Box>
      {/* ── Operator hero banner ── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #1565c0 100%)',
        borderRadius: 3, p: 3, mb: 3, position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -30, right: -30, width: 200, height: 200,
          borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
        <Box sx={{ position: 'absolute', bottom: -40, right: 100, width: 120, height: 120,
          borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)' }} />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
          {/* Compliance ring */}
          <ComplianceRing rate={compliance.rate} />

          {/* Operator info */}
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
              <BusinessIcon sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
              <Typography variant="h5" fontWeight={800} color="#fff">{operator?.operator_name}</Typography>
              <Chip size="small" label={operator?.status ?? 'ACTIVE'}
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, fontSize: 10 }} />
            </Stack>
            {operator?.license_number && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                License: {operator.license_number}
              </Typography>
            )}
            <Stack direction="row" spacing={2} mt={1.5} flexWrap="wrap">
              {[
                { label: 'Compliance Period', value: compliance.period ?? '—' },
                { label: 'PASS', value: compliance.PASS, color: '#2e9e5b' },
                { label: 'WARNING', value: compliance.WARNING, color: '#e6a700' },
                { label: 'FAIL', value: compliance.FAIL, color: '#e0413b' },
              ].map((s) => (
                <Box key={s.label}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>{s.label}</Typography>
                  <Typography variant="body1" fontWeight={800} sx={{ color: s.color ?? '#fff' }}>{s.value}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Ranking */}
          {ranking && (
            <Box sx={{ textAlign: 'center', bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2, p: 2, minWidth: 120 }}>
              <EmojiEventsIcon sx={{ color: '#ffd600', fontSize: 28 }} />
              <Typography variant="h4" fontWeight={800} color="#fff">#{ranking.rank_position}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>QoS Rank</Typography>
              <Stack direction="row" spacing={0.5} justifyContent="center" mt={0.5}>
                <TrendIcon trend={ranking.trend} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Score: {fmt(ranking.qos_score, 1)}
                </Typography>
              </Stack>
            </Box>
          )}
        </Stack>

        {/* Active enforcement / dispute alerts */}
        {(enforcementCases.length > 0 || openDisputes.length > 0) && (
          <Stack direction="row" spacing={1} mt={2} flexWrap="wrap">
            {enforcementCases.length > 0 && (
              <Chip icon={<GavelIcon sx={{ fontSize: 14 }} />}
                label={`${enforcementCases.length} active enforcement case${enforcementCases.length > 1 ? 's' : ''}`}
                onClick={() => navigate('/operator-disputes')}
                sx={{ bgcolor: alpha('#e0413b', 0.25), color: '#ff8a80', fontWeight: 700, fontSize: 11,
                  border: '1px solid rgba(224,65,59,0.4)', cursor: 'pointer' }} />
            )}
            {openDisputes.length > 0 && (
              <Chip icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                label={`${openDisputes.length} open dispute${openDisputes.length > 1 ? 's' : ''}`}
                onClick={() => navigate('/operator-disputes')}
                sx={{ bgcolor: alpha('#e6a700', 0.2), color: '#ffd54f', fontWeight: 700, fontSize: 11,
                  border: '1px solid rgba(230,167,0,0.4)', cursor: 'pointer' }} />
            )}
          </Stack>
        )}
      </Box>

      <Grid container spacing={2}>

        {/* ── KPI Status ── */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Typography variant="h6" fontWeight={700}>KPI Status</Typography>
                {compliance.period && (
                  <Chip size="small" label={`Period: ${compliance.period}`} variant="outlined" />
                )}
              </Stack>
              {!kpis.length
                ? <EmptyState message="No KPI data yet." hint="KPIs are calculated after PM file processing." />
                : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>KPI</TableCell>
                        <TableCell align="right">Value</TableCell>
                        <TableCell align="right">Required</TableCell>
                        <TableCell align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {kpis.map((k) => (
                        <TableRow key={k.kpi_key}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{k.kpi_name}</Typography>
                            <Typography variant="caption" color="text.secondary">{k.kpi_key}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={700}>
                              {fmt(k.value, 2)} {k.unit}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption" color="text.secondary">
                              {k.comparator} {k.required_value} {k.unit}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                              <KpiStatusIcon status={k.status} />
                              <Typography variant="caption" fontWeight={700}
                                sx={{ color: k.status === 'PASS' ? '#2e9e5b' : k.status === 'WARNING' ? '#e6a700' : '#e0413b' }}>
                                {k.status}
                              </Typography>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Active Enforcement Cases ── */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Typography variant="h6" fontWeight={700}>Active Enforcement Cases</Typography>
                <Button size="small" startIcon={<AddIcon />} variant="outlined"
                  onClick={() => navigate('/operator-disputes?new=1')}
                  sx={{ fontSize: 11 }}>
                  Raise Dispute
                </Button>
              </Stack>
              {!enforcementCases.length
                ? (
                  <Alert severity="success" variant="outlined" sx={{ py: 0.5 }}>
                    <AlertTitle sx={{ fontSize: 13 }}>No active cases</AlertTitle>
                    You have no open enforcement actions.
                  </Alert>
                )
                : (
                  <Stack spacing={1.5}>
                    {enforcementCases.map((c) => (
                      <Box key={c.case_id} sx={{
                        p: 1.5, borderRadius: 2,
                        bgcolor: alpha(SEVERITY_COLOR[c.severity] ?? '#888', 0.07),
                        border: `1px solid ${alpha(SEVERITY_COLOR[c.severity] ?? '#888', 0.2)}`,
                      }}>
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" fontFamily="monospace" fontWeight={700}
                              sx={{ color: SEVERITY_COLOR[c.severity] }}>
                              {c.case_ref}
                            </Typography>
                            <Typography variant="body2" fontWeight={600} noWrap>{c.title}</Typography>
                          </Box>
                          <Chip size="small" label={c.status}
                            sx={{ bgcolor: alpha(STATUS_COLOR[c.status] ?? '#888', 0.15),
                              color: STATUS_COLOR[c.status] ?? '#888', fontWeight: 700, fontSize: 10, height: 20 }} />
                        </Stack>
                        {c.deadline && (
                          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                            Deadline: {new Date(c.deadline).toLocaleDateString()}
                            {(() => {
                              const d = Math.ceil((new Date(c.deadline) - Date.now()) / 86400000);
                              return d < 0
                                ? <span style={{ color: '#e0413b', fontWeight: 700 }}> — {Math.abs(d)}d overdue</span>
                                : d <= 7
                                ? <span style={{ color: '#ef6c00', fontWeight: 700 }}> — {d}d left</span>
                                : null;
                            })()}
                          </Typography>
                        )}
                        <Button size="small" variant="text"
                          onClick={() => navigate('/operator-disputes?new=1&caseRef=' + c.case_ref)}
                          sx={{ mt: 0.5, p: 0, fontSize: 11, color: 'text.secondary' }}>
                          + Raise dispute for this case
                        </Button>
                      </Box>
                    ))}
                  </Stack>
                )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Recent PM Uploads ── */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Typography variant="h6" fontWeight={700}>Recent PM Uploads</Typography>
                <Button size="small" startIcon={<UploadFileIcon />} variant="outlined"
                  onClick={() => navigate('/ingestion')} sx={{ fontSize: 11 }}>
                  Upload PM Data
                </Button>
              </Stack>
              {!recentUploads.length
                ? <EmptyState message="No uploads yet." hint="Go to Data Upload to submit your PM files." />
                : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>File</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Records</TableCell>
                        <TableCell>Uploaded</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentUploads.map((u) => (
                        <TableRow key={u.pm_file_id}>
                          <TableCell sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <Typography variant="caption">{u.file_name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={u.status}
                              color={u.status === 'CALCULATED' ? 'success' : u.status === 'FAILED' ? 'error' : 'default'}
                              sx={{ height: 20, fontSize: 10 }} />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption">{u.record_count?.toLocaleString() ?? '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(u.upload_date).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Compliance breakdown bar ── */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Compliance Breakdown</Typography>
              {compliance.total === 0
                ? <EmptyState message="No compliance results yet." />
                : (
                  <Stack spacing={2}>
                    {[
                      { label: 'PASS',    count: compliance.PASS,    color: '#2e9e5b' },
                      { label: 'WARNING', count: compliance.WARNING, color: '#e6a700' },
                      { label: 'FAIL',    count: compliance.FAIL,    color: '#e0413b' },
                    ].map((r) => {
                      const pct = compliance.total ? Math.round((r.count / compliance.total) * 100) : 0;
                      return (
                        <Box key={r.label}>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="body2" fontWeight={700} sx={{ color: r.color }}>{r.label}</Typography>
                            <Typography variant="body2" fontWeight={700}>{r.count} <Typography component="span" variant="caption" color="text.secondary">({pct}%)</Typography></Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={pct}
                            sx={{
                              height: 8, borderRadius: 4,
                              bgcolor: alpha(r.color, 0.12),
                              '& .MuiLinearProgress-bar': { bgcolor: r.color, borderRadius: 4 },
                            }} />
                        </Box>
                      );
                    })}
                    <Divider />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Overall compliance rate</Typography>
                      <Typography variant="body1" fontWeight={800}
                        sx={{ color: compliance.rate >= 90 ? '#2e9e5b' : compliance.rate >= 70 ? '#e6a700' : '#e0413b' }}>
                        {compliance.rate ?? 0}%
                      </Typography>
                    </Stack>
                  </Stack>
                )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Submission Cycles ── */}
        <Grid item xs={12}>
          <SubmissionCyclesPanel />
        </Grid>

      </Grid>
    </Box>
  );
}

/* ── Inline Submission Cycles panel for Operator ─────────────────────────── */
const SUB_STATUS_META = {
  PENDING:           { label: 'Pending',      color: 'default' },
  SUBMITTED:         { label: 'Submitted',    color: 'info'    },
  UNDER_REVIEW:      { label: 'Under Review', color: 'warning' },
  APPROVED:          { label: 'Approved',     color: 'success' },
  REJECTED:          { label: 'Rejected',     color: 'error'   },
  RESUBMIT_REQUIRED: { label: 'Resubmit Req.', color: 'warning' },
};

function SubmissionCyclesPanel() {
  const [subs,     setSubs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [notes,    setNotes]    = useState({});
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/submissions/my-submissions');
      setSubs(data.data ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(periodId) {
    setSubmitting(periodId);
    try {
      await api.post(`/submissions/periods/${periodId}/submit`, { notes: notes[periodId] ?? '' });
      load();
    } finally { setSubmitting(null); }
  }

  const pending  = subs.filter(s => ['PENDING','RESUBMIT_REQUIRED'].includes(s.status));
  const recent   = subs.filter(s => !['PENDING','RESUBMIT_REQUIRED'].includes(s.status)).slice(0, 5);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" gap={1}>
            <AssignmentTurnedInIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Regulatory Submission Cycles</Typography>
          </Stack>
          <Button size="small" variant="outlined" onClick={() => navigate('/submission-cycles')} sx={{ fontSize: 11 }}>
            View All
          </Button>
        </Stack>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {!loading && pending.length === 0 && recent.length === 0 && (
          <Alert severity="success" variant="outlined">
            No open submission periods. You are up to date.
          </Alert>
        )}

        {pending.length > 0 && (
          <Box mb={2}>
            <Typography variant="subtitle2" fontWeight={700} color="warning.main" mb={1}>
              Action Required — {pending.length} Pending Submission{pending.length > 1 ? 's' : ''}
            </Typography>
            <Stack spacing={1.5}>
              {pending.map(s => {
                const deadlineDays = Math.ceil((new Date(s.deadline) - Date.now()) / 86400000);
                const overdue = deadlineDays < 0;
                return (
                  <Box key={s.period_id} sx={{
                    p: 2, borderRadius: 2,
                    border: '1px solid',
                    borderColor: overdue ? 'error.light' : 'warning.light',
                    bgcolor: overdue ? 'error.50' : 'warning.50',
                  }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
                          <Typography fontWeight={700}>{s.period_name}</Typography>
                          <Chip size="small" label={s.period_type} />
                          {s.status === 'RESUBMIT_REQUIRED' && (
                            <Chip size="small" label="Resubmission Required" color="warning" />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {s.period_ref}
                          {s.report_month && ` · Period: ${s.report_month}`}
                          {' · Deadline: '}{new Date(s.deadline).toLocaleDateString()}
                          <span style={{ color: overdue ? '#e0413b' : '#e65100', fontWeight: 700 }}>
                            {' '}({overdue ? `${Math.abs(deadlineDays)}d overdue` : `${deadlineDays}d left`})
                          </span>
                        </Typography>
                        {s.instructions && (
                          <Alert severity="info" sx={{ mt: 1, py: 0 }}>
                            <Typography variant="caption">{s.instructions}</Typography>
                          </Alert>
                        )}
                      </Box>
                      <Stack direction="row" gap={1} alignItems="center">
                        <Button size="small" variant="contained" color="primary"
                          startIcon={submitting === s.period_id
                            ? <CircularProgress size={14} color="inherit" />
                            : <SendIcon sx={{ fontSize: 14 }} />}
                          disabled={!!submitting}
                          onClick={() => handleSubmit(s.period_id)}>
                          Submit
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => navigate('/ingestion')} sx={{ fontSize: 11 }}>
                          Upload PM First
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        {recent.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>Recent Submissions</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Period</TableCell>
                  <TableCell>Deadline</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recent.map(s => (
                  <TableRow key={s.period_id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{s.period_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.period_ref}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{new Date(s.deadline).toLocaleDateString()}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small"
                        label={SUB_STATUS_META[s.status]?.label ?? s.status}
                        color={SUB_STATUS_META[s.status]?.color ?? 'default'} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
