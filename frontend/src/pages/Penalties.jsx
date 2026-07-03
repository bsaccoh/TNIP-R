import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell,
  Drawer, Stack, Divider, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  CircularProgress, Alert, Tab, Tabs, Grid,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import RefreshIcon       from '@mui/icons-material/Refresh';
import AutoFixHighIcon   from '@mui/icons-material/AutoFixHigh';
import GavelIcon         from '@mui/icons-material/Gavel';
import SendIcon          from '@mui/icons-material/Send';
import PaymentIcon       from '@mui/icons-material/Payment';
import SettingsIcon      from '@mui/icons-material/Settings';
import MoneyOffIcon      from '@mui/icons-material/MoneyOff';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import { useAuth }       from '../auth/AuthContext';
import { api }           from '../api/client';
import PageHeader        from '../components/PageHeader';

/* ── Constants ───────────────────────────────────────────────────────────── */
const STATUS_META = {
  DRAFT:        { label: 'Draft',        color: 'default' },
  ISSUED:       { label: 'Issued',       color: 'warning' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: 'info'    },
  PAID:         { label: 'Paid',         color: 'success' },
  DISPUTED:     { label: 'Disputed',     color: 'error'   },
  WAIVED:       { label: 'Waived',       color: 'default' },
  CANCELLED:    { label: 'Cancelled',    color: 'default' },
};

const SEVERITY_COLOR = { LOW: '#43a047', MEDIUM: '#f9a825', HIGH: '#ef6c00', CRITICAL: '#c62828' };
const TYPE_COLOR = {
  COVERAGE: '#1565c0', ROLLOUT: '#6a1b9a', SLA: '#e65100',
  REPORTING: '#00695c', FINANCIAL: '#b71c1c', OTHER: '#455a64',
};

const REGULATOR_ROLES = ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmt(n, dec = 0) {
  if (n == null) return '—';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function FineAmount({ amount, currency = 'SLL', size = 'body1' }) {
  return (
    <Typography variant={size} fontWeight={700} color="error.main">
      {currency} {fmt(amount, 2)}
    </Typography>
  );
}

function StatusChip({ status }) {
  const m = STATUS_META[status] ?? { label: status, color: 'default' };
  return <Chip label={m.label} color={m.color} size="small" />;
}

function SeverityChip({ severity }) {
  if (!severity) return null;
  return (
    <Chip size="small" label={severity}
      sx={{ bgcolor: `${SEVERITY_COLOR[severity]}22`, color: SEVERITY_COLOR[severity], fontWeight: 700, fontSize: 11 }} />
  );
}

/* ── Penalty Rules Dialog ────────────────────────────────────────────────── */
function RulesDialog({ open, onClose }) {
  const [rules, setRules]   = useState([]);
  const [loading, setLoad]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm]     = useState({
    name: '', violationType: 'ANY', severity: 'ANY',
    baseAmount: '', perDayAmount: '0', maxAmount: '', currency: 'SLL', description: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const loadRules = useCallback(async () => {
    setLoad(true);
    try {
      const { data } = await api.get('/penalties/rules', { params: { active: undefined } });
      setRules(data.data ?? []);
    } finally { setLoad(false); }
  }, []);

  useEffect(() => { if (open) loadRules(); }, [open, loadRules]);

  async function saveRule() {
    if (!form.name || !form.baseAmount) { setErr('Name and base amount are required'); return; }
    setSaving(true); setErr('');
    try {
      await api.post('/penalties/rules', {
        ...form, baseAmount: Number(form.baseAmount),
        perDayAmount: Number(form.perDayAmount || 0),
        maxAmount: form.maxAmount ? Number(form.maxAmount) : null,
      });
      setCreating(false);
      setForm({ name: '', violationType: 'ANY', severity: 'ANY', baseAmount: '', perDayAmount: '0', maxAmount: '', currency: 'SLL', description: '' });
      loadRules();
    } catch (e) { setErr(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function toggleActive(rule) {
    await api.put(`/penalties/rules/${rule.rule_id}`, { isActive: rule.is_active ? 0 : 1 });
    loadRules();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ background: 'linear-gradient(135deg,#b71c1c,#d32f2f)', color: '#fff', py: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1}>
            <SettingsIcon /> Penalty Rules Configuration
          </Stack>
          <Button size="small" variant="contained" startIcon={<AddIcon />}
            sx={{ bgcolor: 'rgba(255,255,255,.15)', '&:hover': { bgcolor: 'rgba(255,255,255,.25)' } }}
            onClick={() => setCreating(true)}>
            New Rule
          </Button>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {loading && <LinearProgress />}

        {creating && (
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
            {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
            <Stack gap={2}>
              <TextField label="Rule Name *" value={form.name} onChange={set('name')} size="small" fullWidth />
              <Stack direction="row" gap={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Violation Type</InputLabel>
                  <Select value={form.violationType} onChange={set('violationType')} label="Violation Type">
                    {['ANY','COVERAGE','ROLLOUT','SLA','REPORTING','FINANCIAL','OTHER'].map(t => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>Severity</InputLabel>
                  <Select value={form.severity} onChange={set('severity')} label="Severity">
                    {['ANY','LOW','MEDIUM','HIGH','CRITICAL'].map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction="row" gap={2}>
                <TextField label="Base Fine *" type="number" value={form.baseAmount}
                  onChange={set('baseAmount')} size="small" fullWidth />
                <TextField label="Per-Day Fine" type="number" value={form.perDayAmount}
                  onChange={set('perDayAmount')} size="small" fullWidth />
                <TextField label="Max Cap" type="number" value={form.maxAmount}
                  onChange={set('maxAmount')} size="small" fullWidth placeholder="No cap" />
                <TextField label="Currency" value={form.currency} onChange={set('currency')} size="small" sx={{ width: 100 }} />
              </Stack>
              <TextField label="Description" value={form.description} onChange={set('description')} size="small" fullWidth />
              <Stack direction="row" gap={1} justifyContent="flex-end">
                <Button size="small" onClick={() => setCreating(false)}>Cancel</Button>
                <Button size="small" variant="contained" onClick={saveRule} disabled={saving}>
                  {saving ? <CircularProgress size={16} /> : 'Save Rule'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
              <TableCell>Rule</TableCell>
              <TableCell>Applies To</TableCell>
              <TableCell align="right">Base Fine</TableCell>
              <TableCell align="right">Per Day</TableCell>
              <TableCell align="right">Max Cap</TableCell>
              <TableCell align="center">Active</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map(r => (
              <TableRow key={r.rule_id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{r.name}</Typography>
                  {r.description && <Typography variant="caption" color="text.secondary">{r.description}</Typography>}
                </TableCell>
                <TableCell>
                  <Stack direction="row" gap={.5}>
                    <Chip size="small" label={r.violation_type} variant="outlined" sx={{ fontSize: 10 }} />
                    <Chip size="small" label={r.severity}
                      sx={{ fontSize: 10, bgcolor: r.severity !== 'ANY' ? `${SEVERITY_COLOR[r.severity]}18` : undefined,
                        color: r.severity !== 'ANY' ? SEVERITY_COLOR[r.severity] : undefined }} />
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700}>{r.currency} {fmt(r.base_amount, 2)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption">{r.currency} {fmt(r.per_day_amount, 2)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption">{r.max_amount ? `${r.currency} ${fmt(r.max_amount, 2)}` : '—'}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip size="small" label={r.is_active ? 'Active' : 'Inactive'}
                    color={r.is_active ? 'success' : 'default'}
                    onClick={() => toggleActive(r)} sx={{ cursor: 'pointer', fontSize: 10 }} />
                </TableCell>
              </TableRow>
            ))}
            {!loading && rules.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No rules yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Create Assessment Dialog ────────────────────────────────────────────── */
function CreateAssessmentDialog({ open, onClose, onCreated, operators, rules }) {
  const init = {
    operatorId: '', ruleId: '', title: '', violationType: 'OTHER', severity: 'MEDIUM',
    violationStart: '', violationEnd: '', baseAmount: '', perDayAmount: '0',
    adjustments: '0', adjustmentReason: '', currency: 'SLL', dueDate: '', notes: '',
  };
  const [form, setForm]   = useState(init);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr]     = useState('');
  const set = k => e => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    // live fine preview
    const base = Number(next.baseAmount || 0);
    const daily = Number(next.perDayAmount || 0);
    const days = (next.violationStart && next.violationEnd)
      ? Math.max(0, Math.ceil((new Date(next.violationEnd) - new Date(next.violationStart)) / 86400000) + 1)
      : 0;
    const calc = base + daily * days;
    const final = Math.max(0, calc + Number(next.adjustments || 0));
    setPreview({ base, daily, days, calc, final, currency: next.currency || 'SLL' });
  };

  useEffect(() => {
    if (!form.ruleId) return;
    const rule = rules.find(r => r.rule_id === Number(form.ruleId));
    if (rule) {
      setForm(f => ({
        ...f,
        baseAmount: String(rule.base_amount),
        perDayAmount: String(rule.per_day_amount),
        currency: rule.currency,
      }));
    }
  }, [form.ruleId, rules]);

  async function submit() {
    if (!form.operatorId || !form.title) { setErr('Operator and title are required'); return; }
    setSaving(true); setErr('');
    try {
      const { data } = await api.post('/penalties', {
        ...form,
        ruleId: form.ruleId ? Number(form.ruleId) : null,
        operatorId: Number(form.operatorId),
        baseAmount: Number(form.baseAmount || 0),
        perDayAmount: Number(form.perDayAmount || 0),
        adjustments: Number(form.adjustments || 0),
      });
      onCreated(data.data);
      onClose();
      setForm(init);
      setPreview(null);
    } catch (e) { setErr(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ background: 'linear-gradient(135deg,#b71c1c,#d32f2f)', color: '#fff', py: 2 }}>
        <Stack direction="row" alignItems="center" gap={1}><GavelIcon /> New Penalty Assessment</Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack gap={2.5}>
          <FormControl fullWidth>
            <InputLabel>Operator *</InputLabel>
            <Select value={form.operatorId} onChange={set('operatorId')} label="Operator *">
              {operators.map(op => <MenuItem key={op.operator_id} value={op.operator_id}>{op.operator_name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Title *" value={form.title} onChange={set('title')} fullWidth
            placeholder="e.g. Q2 Coverage SLA Breach" />
          <Stack direction="row" gap={2}>
            <FormControl fullWidth>
              <InputLabel>Penalty Rule (optional)</InputLabel>
              <Select value={form.ruleId} onChange={set('ruleId')} label="Penalty Rule (optional)">
                <MenuItem value="">— Manual —</MenuItem>
                {rules.map(r => <MenuItem key={r.rule_id} value={r.rule_id}>{r.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Violation Type</InputLabel>
              <Select value={form.violationType} onChange={set('violationType')} label="Violation Type">
                {['COVERAGE','ROLLOUT','SLA','REPORTING','FINANCIAL','OTHER'].map(t => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select value={form.severity} onChange={set('severity')} label="Severity">
                {['LOW','MEDIUM','HIGH','CRITICAL'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
          <Stack direction="row" gap={2}>
            <TextField label="Violation Start" type="date" value={form.violationStart}
              onChange={set('violationStart')} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Violation End" type="date" value={form.violationEnd}
              onChange={set('violationEnd')} fullWidth InputLabelProps={{ shrink: true }} />
          </Stack>
          <Stack direction="row" gap={2}>
            <TextField label="Base Fine *" type="number" value={form.baseAmount}
              onChange={set('baseAmount')} fullWidth />
            <TextField label="Per-Day Fine" type="number" value={form.perDayAmount}
              onChange={set('perDayAmount')} fullWidth />
            <TextField label="Currency" value={form.currency} onChange={set('currency')} sx={{ width: 100 }} />
          </Stack>
          <Stack direction="row" gap={2}>
            <TextField label="Adjustment (+/−)" type="number" value={form.adjustments}
              onChange={set('adjustments')} fullWidth helperText="Positive = surcharge, negative = discount" />
            <TextField label="Adjustment Reason" value={form.adjustmentReason}
              onChange={set('adjustmentReason')} fullWidth />
          </Stack>
          <TextField label="Due Date" type="date" value={form.dueDate}
            onChange={set('dueDate')} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Notes" value={form.notes} onChange={set('notes')} multiline rows={2} fullWidth />

          {/* Live preview */}
          {preview && (
            <Paper sx={{ p: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.light' }}>
              <Typography variant="subtitle2" fontWeight={700} color="error.main" gutterBottom>
                Fine Calculation Preview
              </Typography>
              <Stack direction="row" gap={3} flexWrap="wrap">
                <Box><Typography variant="caption" color="text.secondary">Base</Typography>
                  <Typography fontWeight={700}>{preview.currency} {fmt(preview.base, 2)}</Typography></Box>
                {preview.daily > 0 && (
                  <Box><Typography variant="caption" color="text.secondary">Daily × {preview.days}d</Typography>
                    <Typography fontWeight={700}>{preview.currency} {fmt(preview.daily * preview.days, 2)}</Typography></Box>
                )}
                {Number(form.adjustments) !== 0 && (
                  <Box><Typography variant="caption" color="text.secondary">Adjustment</Typography>
                    <Typography fontWeight={700} color={Number(form.adjustments) < 0 ? 'success.main' : 'warning.main'}>
                      {Number(form.adjustments) > 0 ? '+' : ''}{preview.currency} {fmt(Number(form.adjustments), 2)}
                    </Typography></Box>
                )}
                <Box><Typography variant="caption" color="text.secondary">TOTAL FINE</Typography>
                  <Typography variant="h6" fontWeight={800} color="error.main">
                    {preview.currency} {fmt(preview.final, 2)}
                  </Typography></Box>
              </Stack>
            </Paper>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={submit} variant="contained" color="error" disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Create Assessment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Status Action Dialog ────────────────────────────────────────────────── */
function ActionDialog({ open, onClose, assessment, onDone }) {
  const [action, setAction]   = useState('');
  const [paidAmt, setPaidAmt] = useState('');
  const [notes, setNotes]     = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');
  useEffect(() => { if (open) { setAction(''); setPaidAmt(''); setNotes(''); setErr(''); } }, [open]);

  const isIssue = assessment?.status === 'DRAFT';

  async function submit() {
    setSaving(true); setErr('');
    try {
      if (isIssue && action === 'ISSUE') {
        await api.put(`/penalties/${assessment.assessment_id}/issue`, { dueDate });
      } else {
        await api.put(`/penalties/${assessment.assessment_id}/status`, {
          status: action, paidAmount: paidAmt ? Number(paidAmt) : undefined, notes,
        });
      }
      onDone(); onClose();
    } catch (e) { setErr(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  const actions = isIssue
    ? [{ value: 'ISSUE', label: 'Issue to Operator' }]
    : [
        { value: 'ACKNOWLEDGED', label: 'Acknowledged by Operator' },
        { value: 'PAID', label: 'Mark as Paid' },
        { value: 'DISPUTED', label: 'Disputed by Operator' },
        { value: 'WAIVED', label: 'Waive Fine' },
        { value: 'CANCELLED', label: 'Cancel Assessment' },
      ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Update — {assessment?.assessment_ref}</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack gap={2.5} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Action *</InputLabel>
            <Select value={action} onChange={e => setAction(e.target.value)} label="Action *">
              {actions.map(a => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
            </Select>
          </FormControl>
          {action === 'ISSUE' && (
            <TextField label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              fullWidth InputLabelProps={{ shrink: true }} />
          )}
          {action === 'PAID' && (
            <TextField label="Amount Received" type="number" value={paidAmt}
              onChange={e => setPaidAmt(e.target.value)} fullWidth
              placeholder={assessment ? String(assessment.final_fine) : ''} />
          )}
          <TextField label="Notes" value={notes} onChange={e => setNotes(e.target.value)} multiline rows={2} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={submit} variant="contained" color="error" disabled={saving || !action}>
          {saving ? <CircularProgress size={20} /> : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function Penalties() {
  const { user } = useAuth();
  const isRegulator = REGULATOR_ROLES.includes(user?.role);

  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [summary, setSummary]   = useState(null);
  const [rules, setRules]       = useState([]);
  const [operators, setOps]     = useState([]);
  const [statusFilter, setStatus] = useState('');
  const [tab, setTab]           = useState(0);
  const [selected, setSelected] = useState(null);
  const [actionOpen, setAction] = useState(false);
  const [createOpen, setCreate] = useState(false);
  const [rulesOpen, setRules2]  = useState(false);
  const [autoRunning, setAuto]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        api.get('/penalties', { params: { status: statusFilter || undefined } }),
        api.get('/penalties/summary'),
      ]);
      setRows(listRes.data.data?.rows ?? []);
      setSummary(sumRes.data.data);
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isRegulator) return;
    api.get('/operators')
      .then((o) => setOps(o.data.data?.operators ?? o.data.data ?? []))
      .catch(() => {});
    api.get('/penalties/rules')
      .then((r) => setRules(r.data.data ?? []))
      .catch(() => {});
  }, [isRegulator]);

  async function autoGenerate() {
    setAuto(true);
    try {
      const { data } = await api.post('/penalties/auto-generate');
      await load();
      alert(`Auto-generated ${data.data.created} penalty assessment(s) from breached obligations.`);
    } finally { setAuto(false); }
  }

  const statCards = [
    { label: 'Total Fines Levied',  value: `${summary?.currency ?? 'SLL'} ${fmt(summary?.total_fines, 2)}`,    color: '#b71c1c', icon: <GavelIcon /> },
    { label: 'Outstanding',         value: `${summary?.currency ?? 'SLL'} ${fmt(summary?.total_outstanding, 2)}`, color: '#e65100', icon: <WarningAmberIcon /> },
    { label: 'Collected',           value: `${summary?.currency ?? 'SLL'} ${fmt(summary?.total_collected, 2)}`,   color: '#2e7d32', icon: <AccountBalanceIcon /> },
    { label: 'Pending Assessments', value: (summary?.statusCounts ?? []).find(s => s.status === 'ISSUED')?.count ?? 0, color: '#1565c0', icon: <MoneyOffIcon /> },
  ];

  const filteredRows = tab === 0 ? rows
    : tab === 1 ? rows.filter(r => ['DRAFT','ISSUED'].includes(r.status))
    : tab === 2 ? rows.filter(r => ['ACKNOWLEDGED','DISPUTED'].includes(r.status))
    : rows.filter(r => ['PAID','WAIVED','CANCELLED'].includes(r.status));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        icon={<AccountBalanceIcon />}
        title="Penalty & Fine Engine"
        subtitle="Assess, issue, and track regulatory fines — link to enforcement cases and license obligation breaches"
        actions={isRegulator && (
          <>
            <Button size="small" variant="outlined"
              startIcon={<SettingsIcon />} onClick={() => setRules2(true)}>
              Rules
            </Button>
            <Button size="small" variant="outlined"
              startIcon={autoRunning ? <CircularProgress size={14} color="inherit" /> : <AutoFixHighIcon />}
              onClick={autoGenerate} disabled={autoRunning}>
              Auto-Generate
            </Button>
            <Button size="small" variant="contained" startIcon={<AddIcon />}
              onClick={() => setCreate(true)}>
              New Assessment
            </Button>
          </>
        )}
      />

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map(c => (
          <Grid item xs={6} md={3} key={c.label}>
            <Paper sx={{ p: 2, borderLeft: `4px solid ${c.color}` }}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Box sx={{ color: c.color }}>{c.icon}</Box>
                <Box>
                  <Typography variant="h6" fontWeight={800} sx={{ color: c.color, lineHeight: 1.1 }}>{c.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Outstanding fines banner */}
      {summary?.recentIssued?.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={700}>
            {summary.recentIssued.length} penalty notice{summary.recentIssued.length > 1 ? 's' : ''} awaiting acknowledgement — earliest due{' '}
            {new Date(summary.recentIssued[0].due_date).toLocaleDateString()}
          </Typography>
        </Alert>
      )}

      {/* Table */}
      <Paper>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, pt: 1 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="All" />
            <Tab label="Draft / Issued" />
            <Tab label="Acknowledged / Disputed" />
            <Tab label="Closed" />
          </Tabs>
          <Stack direction="row" gap={1} alignItems="center">
            {['','DRAFT','ISSUED','PAID','DISPUTED','WAIVED'].map(s => (
              <Chip key={s} label={s || 'All'} size="small"
                variant={statusFilter === s ? 'filled' : 'outlined'}
                color={statusFilter === s ? 'error' : 'default'}
                onClick={() => setStatus(s)} sx={{ cursor: 'pointer' }} />
            ))}
            <IconButton size="small" onClick={load}><RefreshIcon /></IconButton>
          </Stack>
        </Stack>
        {loading && <LinearProgress />}
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
              <TableCell>Assessment</TableCell>
              <TableCell>Operator</TableCell>
              <TableCell>Type / Severity</TableCell>
              <TableCell>Breach Period</TableCell>
              <TableCell align="right">Fine Amount</TableCell>
              <TableCell>Status</TableCell>
              {isRegulator && <TableCell align="center">Action</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={isRegulator ? 7 : 6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  No assessments found
                </TableCell>
              </TableRow>
            )}
            {filteredRows.map(row => (
              <TableRow key={row.assessment_id} hover>
                <TableCell>
                  <Typography fontWeight={600}>{row.title}</Typography>
                  <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                    {row.assessment_ref}
                  </Typography>
                </TableCell>
                <TableCell>{row.operator_name}</TableCell>
                <TableCell>
                  <Stack gap={.5}>
                    <Chip size="small" label={row.violation_type}
                      sx={{ fontSize: 10, bgcolor: `${TYPE_COLOR[row.violation_type] ?? '#888'}18`,
                        color: TYPE_COLOR[row.violation_type] ?? '#888' }} />
                    <SeverityChip severity={row.severity} />
                  </Stack>
                </TableCell>
                <TableCell>
                  {row.violation_start ? (
                    <Box>
                      <Typography variant="caption">
                        {new Date(row.violation_start).toLocaleDateString()} →{' '}
                        {row.violation_end ? new Date(row.violation_end).toLocaleDateString() : 'ongoing'}
                      </Typography>
                      {row.days_in_breach != null && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {row.days_in_breach} day{row.days_in_breach !== 1 ? 's' : ''}
                        </Typography>
                      )}
                    </Box>
                  ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                </TableCell>
                <TableCell align="right">
                  <FineAmount amount={row.final_fine} currency={row.currency} />
                  {row.adjustments !== 0 && (
                    <Typography variant="caption" color={row.adjustments > 0 ? 'warning.main' : 'success.main'}>
                      {row.adjustments > 0 ? '+' : ''}{fmt(row.adjustments, 2)} adj.
                    </Typography>
                  )}
                  {row.status === 'PAID' && (
                    <Typography variant="caption" display="block" color="success.main">
                      Paid: {fmt(row.paid_amount, 2)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Stack gap={.5}>
                    <StatusChip status={row.status} />
                    {row.due_date && !['PAID','WAIVED','CANCELLED'].includes(row.status) && (
                      <Typography variant="caption" color={
                        new Date(row.due_date) < Date.now() ? 'error.main' : 'text.secondary'
                      }>
                        Due {new Date(row.due_date).toLocaleDateString()}
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                {isRegulator && (
                  <TableCell align="center">
                    {!['PAID','WAIVED','CANCELLED'].includes(row.status) && (
                      <Tooltip title="Update Status">
                        <IconButton size="small" color="error"
                          onClick={() => { setSelected(row); setAction(true); }}>
                          {row.status === 'DRAFT' ? <SendIcon /> : <PaymentIcon />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Dialogs */}
      {createOpen && (
        <CreateAssessmentDialog open onClose={() => setCreate(false)} operators={operators} rules={rules}
          onCreated={() => { setCreate(false); load(); }} />
      )}
      {rulesOpen && <RulesDialog open onClose={() => setRules2(false)} />}
      {actionOpen && selected && (
        <ActionDialog open onClose={() => setAction(false)} assessment={selected}
          onDone={() => { setAction(false); load(); }} />
      )}
    </Box>
  );
}
