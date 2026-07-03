import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell,
  Drawer, Stack, Divider, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  CircularProgress, Alert, Tab, Tabs, Switch, FormControlLabel, Grid,
  Snackbar,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import EditIcon          from '@mui/icons-material/Edit';
import DeleteIcon        from '@mui/icons-material/Delete';
import PlayArrowIcon     from '@mui/icons-material/PlayArrow';
import ScheduleIcon      from '@mui/icons-material/Schedule';
import RefreshIcon       from '@mui/icons-material/Refresh';
import EmailIcon         from '@mui/icons-material/Email';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import ErrorIcon         from '@mui/icons-material/Error';
import HistoryIcon       from '@mui/icons-material/History';
import SendIcon          from '@mui/icons-material/Send';
import WifiIcon          from '@mui/icons-material/Wifi';
import AssessmentIcon    from '@mui/icons-material/Assessment';
import { get, post, put, del } from '../api/client';

/* ── Constants ───────────────────────────────────────────────────────────── */
const FREQ_COLOR = { DAILY: 'info', WEEKLY: 'primary', MONTHLY: 'secondary' };
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const TYPE_LABELS = {
  kpi: 'KPI Performance', compliance: 'Compliance Status',
  trend: 'KPI Trend', anomaly: 'Anomaly Detection',
};

/* ── Schedule Dialog ─────────────────────────────────────────────────────── */
function ScheduleDialog({ open, row, operators, onClose, onSaved }) {
  const blank = {
    name: '', report_type: 'compliance', operator_id: '',
    format: 'XLSX', frequency: 'MONTHLY',
    day_of_week: 1, day_of_month: 1,
    recipients: '', is_active: true,
  };
  const [form, setForm] = useState(blank);
  const [err, setErr]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(row ? {
        name: row.name, report_type: row.report_type, operator_id: row.operator_id ?? '',
        format: row.format, frequency: row.frequency,
        day_of_week: row.day_of_week ?? 1, day_of_month: row.day_of_month ?? 1,
        recipients: row.recipients ?? '', is_active: Boolean(row.is_active),
      } : { ...blank });
      setErr('');
    }
  }, [open, row]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.name) { setErr('Name is required'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        ...form,
        operator_id: form.operator_id ? Number(form.operator_id) : null,
        day_of_week:  form.frequency === 'WEEKLY'  ? Number(form.day_of_week)  : null,
        day_of_month: form.frequency === 'MONTHLY' ? Number(form.day_of_month) : null,
      };
      if (row) await put(`/reports/schedules/${row.schedule_id}`, payload);
      else     await post('/reports/schedules', payload);
      onSaved(); onClose();
    } catch (e) {
      setErr(e?.response?.data?.error?.message || 'Save failed');
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ background: 'linear-gradient(135deg,#0d47a1,#1976d2)', color: '#fff', py: 2 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <ScheduleIcon /> {row ? 'Edit Schedule' : 'New Scheduled Report'}
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack gap={2.5}>
          <TextField label="Schedule Name *" value={form.name} onChange={set('name')} fullWidth
            placeholder="e.g. Monthly Compliance Digest" />
          <Stack direction="row" gap={2}>
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select value={form.report_type} onChange={set('report_type')} label="Report Type">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select value={form.format} onChange={set('format')} label="Format">
                <MenuItem value="XLSX">Excel (.xlsx)</MenuItem>
                <MenuItem value="PDF">PDF</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <FormControl fullWidth>
            <InputLabel>Operator Filter</InputLabel>
            <Select value={form.operator_id} onChange={set('operator_id')} label="Operator Filter">
              <MenuItem value="">All Operators</MenuItem>
              {operators.map(o => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Frequency</InputLabel>
            <Select value={form.frequency} onChange={set('frequency')} label="Frequency">
              <MenuItem value="DAILY">Daily (06:00)</MenuItem>
              <MenuItem value="WEEKLY">Weekly</MenuItem>
              <MenuItem value="MONTHLY">Monthly</MenuItem>
            </Select>
          </FormControl>
          {form.frequency === 'WEEKLY' && (
            <FormControl fullWidth>
              <InputLabel>Day of Week</InputLabel>
              <Select value={form.day_of_week} onChange={set('day_of_week')} label="Day of Week">
                {DAYS.map((d, i) => <MenuItem key={i} value={i}>{d}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          {form.frequency === 'MONTHLY' && (
            <TextField label="Day of Month (1–28)" type="number"
              inputProps={{ min: 1, max: 28 }} value={form.day_of_month} onChange={set('day_of_month')} fullWidth />
          )}
          <TextField label="Email Recipients (comma-separated)" value={form.recipients}
            onChange={set('recipients')} fullWidth multiline rows={2}
            placeholder="compliance@tnipr.gov, ceo@operator.sl" />
          <FormControlLabel
            control={<Switch checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />}
            label="Active (scheduler will run this automatically)" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={save} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Save Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── SMTP Test Dialog ────────────────────────────────────────────────────── */
function SmtpTestDialog({ open, onClose }) {
  const [to, setTo]       = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState(null);

  useEffect(() => { if (open) { setTo(''); setResult(null); } }, [open]);

  async function send() {
    if (!to) return;
    setSending(true); setResult(null);
    try {
      await post('/reports/schedules/smtp-test', { to });
      setResult({ ok: true, msg: `Test email sent to ${to}` });
    } catch (e) {
      setResult({ ok: false, msg: e?.response?.data?.error?.message || 'SMTP test failed' });
    } finally { setSending(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" gap={1}><WifiIcon color="primary" /> SMTP Test</Stack>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Send a test email to verify your SMTP configuration is working correctly.
        </Typography>
        {result && (
          <Alert severity={result.ok ? 'success' : 'error'} sx={{ mb: 2 }}>{result.msg}</Alert>
        )}
        <TextField label="Send test to" type="email" value={to} onChange={e => setTo(e.target.value)}
          fullWidth placeholder="your@email.com" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button onClick={send} variant="contained" disabled={sending || !to} startIcon={<SendIcon />}>
          {sending ? <CircularProgress size={20} /> : 'Send Test'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Run Log Drawer ──────────────────────────────────────────────────────── */
function RunLogDrawer({ schedule, open, onClose }) {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoad]  = useState(false);

  useEffect(() => {
    if (!open || !schedule) return;
    setLoad(true);
    get(`/reports/schedules/${schedule.schedule_id}/logs`)
      .then(r => setLogs(r.data ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoad(false));
  }, [open, schedule]);

  if (!schedule) return null;

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}>
      <Box sx={{ background: 'linear-gradient(135deg,#0d47a1,#1976d2)', px: 3, py: 2.5, color: '#fff' }}>
        <Typography variant="h6" fontWeight={700}>{schedule.name}</Typography>
        <Typography variant="body2" sx={{ opacity: .7 }}>
          {TYPE_LABELS[schedule.report_type] ?? schedule.report_type} · {schedule.frequency}
        </Typography>
        {schedule.recipients && (
          <Typography variant="caption" sx={{ opacity: .6 }}>→ {schedule.recipients}</Typography>
        )}
      </Box>
      <Box sx={{ px: 3, py: 2 }}>
        <Stack direction="row" alignItems="center" gap={1} mb={2}>
          <HistoryIcon color="action" fontSize="small" />
          <Typography variant="subtitle2" fontWeight={700}>Run History ({logs.length})</Typography>
        </Stack>
        {loading && <LinearProgress />}
        {!loading && logs.length === 0 && (
          <Typography color="text.secondary" variant="body2">No runs yet — use "Run Now" to trigger manually.</Typography>
        )}
        {logs.map(log => (
          <Box key={log.log_id} sx={{
            mb: 1.5, p: 1.5, borderRadius: 2,
            bgcolor: log.status === 'FAILED' ? 'error.50' : 'action.hover',
            border: '1px solid',
            borderColor: log.status === 'FAILED' ? 'error.light' : 'divider',
          }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" gap={1}>
                {log.status === 'SUCCESS'
                  ? <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  : <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />}
                <Typography variant="body2" fontWeight={600}>
                  {log.status} · {log.triggered_by}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {new Date(log.created_at).toLocaleString()}
              </Typography>
            </Stack>
            <Stack direction="row" gap={2} mt={.5} flexWrap="wrap">
              {log.rows_exported != null && (
                <Typography variant="caption" color="text.secondary">{log.rows_exported} rows</Typography>
              )}
              {log.emailed ? (
                <Chip size="small" icon={<EmailIcon sx={{ fontSize: 12 }} />} label="Emailed"
                  color="success" sx={{ height: 18, fontSize: 10 }} />
              ) : (
                <Chip size="small" label="No email" sx={{ height: 18, fontSize: 10 }} />
              )}
              {log.duration_ms != null && (
                <Typography variant="caption" color="text.secondary">{log.duration_ms}ms</Typography>
              )}
            </Stack>
            {log.error_message && (
              <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                <Typography variant="caption">{log.error_message}</Typography>
              </Alert>
            )}
          </Box>
        ))}
      </Box>
    </Drawer>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function ScheduledReports() {
  const [schedules, setSchedules] = useState([]);
  const [operators, setOperators] = useState([]);
  const [stats, setStats]         = useState(null);
  const [recentLogs, setRecent]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState(0);
  const [editRow, setEditRow]     = useState(null);
  const [dialogOpen, setDialog]   = useState(false);
  const [deleteTarget, setDelete] = useState(null);
  const [smtpOpen, setSmtp]       = useState(false);
  const [logTarget, setLogTarget] = useState(null);
  const [runningId, setRunning]   = useState(null);
  const [snack, setSnack]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [schRes, statsRes, logsRes] = await Promise.all([
        get('/reports/schedules'),
        get('/reports/schedules/stats'),
        get('/reports/schedules/logs', { params: { limit: 30 } }),
      ]);
      setSchedules(schRes.data ?? []);
      setStats(statsRes.data ?? null);
      setRecent(logsRes.data ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    get('/operators').then(r => setOperators(r.data?.operators ?? r.data ?? [])).catch(() => {});
  }, [load]);

  async function runNow(s) {
    setRunning(s.schedule_id);
    try {
      const r = await post(`/reports/schedules/${s.schedule_id}/run`);
      setSnack(`"${s.name}" ran successfully — ${r.data?.rows ?? 0} rows${r.data?.emailed ? ', emailed' : ''}`);
      await load();
    } catch {
      setSnack(`"${s.name}" failed — check server logs`);
    } finally { setRunning(null); }
  }

  async function deleteSchedule() {
    await del(`/reports/schedules/${deleteTarget.schedule_id}`).catch(() => {});
    setDelete(null);
    load();
  }

  const statCards = [
    { label: 'Total Schedules', value: stats?.total_schedules ?? 0,   icon: <ScheduleIcon />,   color: '#1565c0' },
    { label: 'Active',          value: stats?.active_schedules ?? 0,  icon: <CheckCircleIcon />, color: '#2e7d32' },
    { label: 'Total Runs',      value: stats?.total_runs ?? 0,         icon: <AssessmentIcon />,  color: '#6a1b9a' },
    { label: 'Emails Sent',     value: stats?.emails_sent ?? 0,        icon: <EmailIcon />,       color: '#00695c' },
  ];

  const filtered = tab === 0 ? schedules
    : tab === 1 ? schedules.filter(s => s.is_active)
    : schedules.filter(s => !s.is_active);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg,#0d47a1,#1976d2)', borderRadius: 3, p: 3, mb: 3, color: '#fff' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1.5}>
            <ScheduleIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={700}>Report Auto-Distribution</Typography>
              <Typography variant="body2" sx={{ opacity: .8 }}>
                Schedule regulatory reports for automatic generation and email delivery to recipients
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" gap={1}>
            <Tooltip title="Test SMTP email configuration">
              <Button size="small" variant="outlined"
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}
                startIcon={<WifiIcon />} onClick={() => setSmtp(true)}>
                SMTP Test
              </Button>
            </Tooltip>
            <Button size="small" variant="contained" startIcon={<AddIcon />}
              sx={{ bgcolor: 'rgba(255,255,255,.15)', '&:hover': { bgcolor: 'rgba(255,255,255,.25)' } }}
              onClick={() => { setEditRow(null); setDialog(true); }}>
              New Schedule
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map(c => (
          <Grid item xs={6} md={3} key={c.label}>
            <Paper sx={{ p: 2, borderLeft: `4px solid ${c.color}` }}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Box sx={{ color: c.color }}>{c.icon}</Box>
                <Box>
                  <Typography variant="h4" fontWeight={800} sx={{ color: c.color, lineHeight: 1 }}>{c.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Next scheduled run notice */}
      {stats?.nextDue && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<ScheduleIcon />}>
          Next scheduled run: <strong>{stats.nextDue.name}</strong> at{' '}
          {new Date(stats.nextDue.next_run_at).toLocaleString()}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Schedules table */}
        <Grid item xs={12} lg={8}>
          <Paper>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, pt: 1 }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                <Tab label={`All (${schedules.length})`} />
                <Tab label="Active" />
                <Tab label="Paused" />
              </Tabs>
              <IconButton size="small" onClick={load}><RefreshIcon /></IconButton>
            </Stack>
            {loading && <LinearProgress />}
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                  <TableCell>Schedule</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Recipients</TableCell>
                  <TableCell>Next Run</TableCell>
                  <TableCell>Last Run</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No schedules yet — create one to start automating report delivery
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(s => (
                  <TableRow key={s.schedule_id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Box>
                          <Typography fontWeight={600}>{s.name}</Typography>
                          <Stack direction="row" gap={.5} mt={.25}>
                            <Chip size="small" label={TYPE_LABELS[s.report_type] ?? s.report_type}
                              variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                            {s.operator_name && (
                              <Chip size="small" label={s.operator_name} sx={{ fontSize: 10, height: 18 }} />
                            )}
                            <Chip size="small" label={s.is_active ? 'Active' : 'Paused'}
                              color={s.is_active ? 'success' : 'default'} sx={{ height: 18, fontSize: 10 }} />
                          </Stack>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={s.frequency} color={FREQ_COLOR[s.frequency] ?? 'default'} />
                    </TableCell>
                    <TableCell>
                      {s.recipients
                        ? <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.recipients}
                          </Typography>
                        : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {s.next_run_at ? new Date(s.next_run_at).toLocaleString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color={s.last_run_at ? 'text.secondary' : 'text.disabled'}>
                        {s.last_run_at ? new Date(s.last_run_at).toLocaleString() : 'Never'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" justifyContent="center">
                        <Tooltip title="Run Now">
                          <IconButton size="small" color="primary" disabled={runningId === s.schedule_id}
                            onClick={() => runNow(s)}>
                            {runningId === s.schedule_id
                              ? <CircularProgress size={16} />
                              : <PlayArrowIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Run History">
                          <IconButton size="small" onClick={() => setLogTarget(s)}>
                            <HistoryIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => { setEditRow(s); setDialog(true); }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => setDelete(s)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        {/* Recent activity feed */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Stack direction="row" alignItems="center" gap={1} mb={2}>
              <HistoryIcon color="action" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700}>Recent Activity</Typography>
            </Stack>
            {recentLogs.length === 0 && !loading && (
              <Typography variant="body2" color="text.secondary">No runs yet.</Typography>
            )}
            {recentLogs.map(log => (
              <Box key={log.log_id} sx={{
                mb: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider',
                '&:last-child': { border: 'none', mb: 0, pb: 0 },
              }}>
                <Stack direction="row" alignItems="flex-start" gap={1}>
                  {log.status === 'SUCCESS'
                    ? <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main', mt: .3 }} />
                    : <ErrorIcon sx={{ fontSize: 14, color: 'error.main', mt: .3 }} />}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" fontWeight={600} display="block"
                      sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.schedule_name}
                    </Typography>
                    <Stack direction="row" gap={.5} flexWrap="wrap">
                      <Typography variant="caption" color="text.secondary">
                        {new Date(log.created_at).toLocaleString()}
                      </Typography>
                      {log.emailed && (
                        <Chip size="small" icon={<EmailIcon sx={{ fontSize: 10 }} />} label="Emailed"
                          color="success" sx={{ height: 16, fontSize: 9 }} />
                      )}
                      <Chip size="small" label={log.triggered_by}
                        sx={{ height: 16, fontSize: 9 }} />
                    </Stack>
                    {log.error_message && (
                      <Typography variant="caption" color="error.main"
                        sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.error_message}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>

      {/* Dialogs */}
      <ScheduleDialog open={dialogOpen} row={editRow} operators={operators}
        onClose={() => setDialog(false)} onSaved={load} />

      <SmtpTestDialog open={smtpOpen} onClose={() => setSmtp(false)} />

      <RunLogDrawer schedule={logTarget} open={!!logTarget} onClose={() => setLogTarget(null)} />

      <Dialog open={!!deleteTarget} onClose={() => setDelete(null)} maxWidth="xs">
        <DialogTitle>Delete Schedule</DialogTitle>
        <DialogContent>
          <Typography>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={deleteSchedule}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(snack)} autoHideDuration={5000} onClose={() => setSnack('')}
        message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}
