import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, Tooltip, Stack,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, InputLabel, FormControl,
  FormGroup, FormControlLabel, Checkbox,
  Alert, AlertTitle, Snackbar, IconButton, Drawer,
  CircularProgress, Divider, Card, CardContent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CodeIcon from '@mui/icons-material/Code';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

/* ── helpers ─────────────────────────────────────────────────────────────── */
const ALL_SCOPES = [
  { value: 'push:pm',     label: 'PM Data Push',   desc: 'Push performance measurement counters' },
  { value: 'push:kpi',    label: 'KPI Push',        desc: 'Push KPI measurements' },
  { value: 'push:alarms', label: 'Alarm Push',      desc: 'Push network alarm events' },
];

function scopeChips(raw) {
  const scopes = typeof raw === 'string' ? JSON.parse(raw || '[]') : (raw || []);
  return scopes.map((s) => {
    const meta = ALL_SCOPES.find((x) => x.value === s);
    return <Chip key={s} label={meta?.label ?? s} size="small" variant="outlined"
                 sx={{ fontSize: '0.68rem', mr: 0.5, mb: 0.5 }} />;
  });
}

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

function timeSince(ts) {
  if (!ts) return 'Never';
  const secs = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400)return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

/* ── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, color = '#1565c0', sub }) {
  return (
    <Paper elevation={2} sx={{ p: 2, borderTop: `4px solid ${color}`, height: '100%' }}>
      <Typography variant="h4" fontWeight={700} color={color}>{value ?? '—'}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {sub && <Typography variant="caption" color="text.disabled">{sub}</Typography>}
    </Paper>
  );
}

/* ── New key revealed dialog ─────────────────────────────────────────────── */
function KeyRevealDialog({ keyData, onClose }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied]   = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(keyData.raw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={Boolean(keyData)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: 'success.main' }}>
        <CheckCircleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        API Key Created
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Copy this key now</AlertTitle>
          This key will not be shown again. Store it securely (e.g. in a secrets manager or env file).
        </Alert>
        <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 2, fontFamily: 'monospace',
                   wordBreak: 'break-all', position: 'relative' }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>
            {visible ? keyData?.raw : '•'.repeat(72)}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button size="small" startIcon={visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
              onClick={() => setVisible((v) => !v)}>
              {visible ? 'Hide' : 'Reveal'}
            </Button>
            <Button size="small" startIcon={<ContentCopyIcon />} onClick={copy}
              color={copied ? 'success' : 'primary'}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </Stack>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">Ref: </Typography>
          <Typography variant="caption" fontFamily="monospace">{keyData?.ref}</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>Done — I've saved the key</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Create key dialog ───────────────────────────────────────────────────── */
function CreateKeyDialog({ open, onClose, operators, isRegulator, defaultOperatorId, onCreated }) {
  const [form, setForm] = useState({
    operatorId: defaultOperatorId || '',
    label: '', scopes: ['push:pm', 'push:kpi'], rateLimit: 1000, expiresAt: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  useEffect(() => {
    if (open) {
      setForm({ operatorId: defaultOperatorId || '', label: '',
                scopes: ['push:pm', 'push:kpi'], rateLimit: 1000, expiresAt: '' });
      setErr('');
    }
  }, [open, defaultOperatorId]);

  const toggleScope = (s) => setForm((f) => ({
    ...f,
    scopes: f.scopes.includes(s) ? f.scopes.filter((x) => x !== s) : [...f.scopes, s],
  }));

  const save = async () => {
    if (isRegulator && !form.operatorId) { setErr('Select an operator'); return; }
    if (!form.scopes.length) { setErr('Select at least one scope'); return; }
    setSaving(true);
    try {
      const r = await api.post('/gateway/mgmt/keys', form);
      onCreated(r.data.data);
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to create key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create API Key</DialogTitle>
      <DialogContent dividers>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack spacing={2}>
          {isRegulator && (
            <FormControl fullWidth>
              <InputLabel>Operator *</InputLabel>
              <Select value={form.operatorId} label="Operator *"
                onChange={(e) => setForm((f) => ({ ...f, operatorId: e.target.value }))}>
                {operators.map((o) => (
                  <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField fullWidth label="Label (optional)"
            placeholder="e.g. Production server, Backup system"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          <Box>
            <Typography variant="subtitle2" gutterBottom>Scopes *</Typography>
            <FormGroup>
              {ALL_SCOPES.map((s) => (
                <FormControlLabel key={s.value}
                  control={<Checkbox checked={form.scopes.includes(s.value)}
                    onChange={() => toggleScope(s.value)} size="small" />}
                  label={<Box><Typography variant="body2">{s.label}</Typography>
                              <Typography variant="caption" color="text.secondary">{s.desc}</Typography></Box>} />
              ))}
            </FormGroup>
          </Box>
          <TextField fullWidth type="number" label="Rate Limit (requests/hour)"
            inputProps={{ min: 1, max: 100000 }}
            value={form.rateLimit}
            onChange={(e) => setForm((f) => ({ ...f, rateLimit: e.target.value }))} />
          <TextField fullWidth type="datetime-local" label="Expires At (optional)"
            InputLabelProps={{ shrink: true }}
            value={form.expiresAt}
            onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Generate Key'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Revoke confirm dialog ───────────────────────────────────────────────── */
function RevokeDialog({ open, keyRow, onClose, onRevoked }) {
  const [saving, setSaving] = useState(false);
  const revoke = async () => {
    setSaving(true);
    try {
      await api.delete(`/gateway/mgmt/keys/${keyRow.key_id}`);
      onRevoked();
      onClose();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Revoke API Key</DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ mb: 1 }}>
          This will immediately invalidate the key <strong>{keyRow?.key_prefix}…</strong>
          {keyRow?.label && ` (${keyRow.label})`}. Any system using it will stop being able to push data.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={revoke} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Revoke Key'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Integration guide drawer ────────────────────────────────────────────── */
function IntegrationGuide({ open, onClose, baseUrl }) {
  const url = baseUrl || 'https://api.tnipr.gov.sl';
  const sections = [
    {
      title: 'Authentication',
      code: `# Include your API key in every request
curl -H "X-Api-Key: ntk_your_key_here" \\
     ${url}/api/gateway/push/ping`,
    },
    {
      title: 'Push PM Counters',
      code: `curl -X POST ${url}/api/gateway/push/pm \\
  -H "X-Api-Key: ntk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "rows": [
      {
        "counter_name": "RRC_SETUP_SUCCESS_RATE",
        "element_id": "eNB-BO-001",
        "technology": "4G/LTE",
        "timestamp": "2026-07-03T10:00:00Z",
        "value": 98.5,
        "unit": "%"
      }
    ]
  }'`,
    },
    {
      title: 'Push KPI Measurements',
      code: `curl -X POST ${url}/api/gateway/push/kpi \\
  -H "X-Api-Key: ntk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "rows": [
      {
        "kpi_name": "VOICE_CALL_DROP_RATE",
        "technology": "2G",
        "region": "Western Area Urban",
        "period_start": "2026-07-01T00:00:00Z",
        "period_end":   "2026-07-31T23:59:59Z",
        "value": 1.2,
        "unit": "%"
      }
    ]
  }'`,
    },
    {
      title: 'Push Network Alarms',
      code: `curl -X POST ${url}/api/gateway/push/alarms \\
  -H "X-Api-Key: ntk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "rows": [
      {
        "alarm_name": "CELL_OUTAGE",
        "element_id": "BTS-KE-042",
        "technology": "3G",
        "severity": "CRITICAL",
        "description": "Cell site power failure",
        "raised_at": "2026-07-03T08:30:00Z"
      }
    ]
  }'`,
    },
  ];

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 680 } } }}>
      <Box sx={{ p: 3, background: 'linear-gradient(135deg,#0d47a1,#1565c0)', color: '#fff',
                 display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <CodeIcon />
            <Typography variant="h6" fontWeight={700}>Integration Guide</Typography>
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            How to push data to TNIP-R from your systems
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}><CloseIcon /></IconButton>
      </Box>
      <Box sx={{ p: 3, overflowY: 'auto' }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          All push endpoints accept JSON. Batch up to <strong>1,000 rows</strong> per request.
          Responses include <code>accepted</code> and <code>rejected</code> counts.
        </Alert>
        {sections.map((s) => (
          <Box key={s.title} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{s.title}</Typography>
            <Box sx={{ bgcolor: '#1e1e2e', borderRadius: 1, p: 2, position: 'relative' }}>
              <Typography component="pre" variant="caption"
                sx={{ fontFamily: 'monospace', color: '#cdd6f4', whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all', display: 'block' }}>
                {s.code}
              </Typography>
              <Tooltip title="Copy">
                <IconButton size="small"
                  sx={{ position: 'absolute', top: 8, right: 8, color: '#cdd6f4' }}
                  onClick={() => navigator.clipboard.writeText(s.code)}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        ))}
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Response Format</Typography>
        <Box sx={{ bgcolor: '#1e1e2e', borderRadius: 1, p: 2 }}>
          <Typography component="pre" variant="caption"
            sx={{ fontFamily: 'monospace', color: '#cdd6f4', whiteSpace: 'pre-wrap', display: 'block' }}>
{`{
  "success": true,
  "data": {
    "received": 5,
    "accepted": 5,
    "rejected": 0,
    "errors": []
  }
}`}
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}

/* ── Push log drawer ─────────────────────────────────────────────────────── */
function LogsDrawer({ open, onClose, operatorId }) {
  const [logs, setLogs]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = operatorId ? { operatorId } : {};
    api.get('/gateway/mgmt/logs', { params })
      .then((r) => setLogs(r.data.data?.rows || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [open, operatorId]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 700 } } }}>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider',
                 display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>Push Logs</Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>
      <Box sx={{ overflowY: 'auto' }}>
        {loading
          ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          : logs.length === 0
            ? <Box sx={{ p: 3 }}><Alert severity="info">No push activity yet.</Alert></Box>
            : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell>Time</TableCell>
                      <TableCell>Operator</TableCell>
                      <TableCell>Endpoint</TableCell>
                      <TableCell align="right">In / Out</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">ms</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.map((l) => (
                      <TableRow key={l.log_id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title={fmt(l.pushed_at)}>
                            <span>{timeSince(l.pushed_at)}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{l.operator_name}</TableCell>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace">{l.endpoint}</Typography>
                          <br />
                          <Typography variant="caption" color="text.disabled">{l.key_prefix}…</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">{l.rows_received} → {l.rows_accepted}</Typography>
                        </TableCell>
                        <TableCell>
                          {l.status_code < 300
                            ? <Chip size="small" label={l.status_code} color="success" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                            : <Tooltip title={l.error_msg}>
                                <Chip size="small" label={l.status_code} color="error" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                              </Tooltip>}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">{l.duration_ms ?? '—'}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
      </Box>
    </Drawer>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function ApiGateway() {
  const { user } = useAuth();
  const isRegulator = ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'].includes(user?.role);

  const [keys, setKeys]         = useState([]);
  const [stats, setStats]       = useState({});
  const [operators, setOperators] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [showCreate, setShowCreate]   = useState(false);
  const [newKeyData, setNewKeyData]   = useState(null);
  const [revoking, setRevoking]       = useState(null);
  const [showGuide, setShowGuide]     = useState(false);
  const [showLogs, setShowLogs]       = useState(false);
  const [snack, setSnack]             = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kRes, sRes] = await Promise.all([
        api.get('/gateway/mgmt/keys'),
        api.get('/gateway/mgmt/stats'),
      ]);
      setKeys(kRes.data.data || []);
      setStats(sRes.data.data || {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isRegulator) {
      api.get('/operators').then((r) => setOperators(r.data.data || [])).catch(() => {});
    }
  }, [isRegulator]);

  const activeKeys   = keys.filter((k) => k.status === 'ACTIVE');
  const revokedKeys  = keys.filter((k) => k.status === 'REVOKED');

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg,#0d47a1,#1565c0)', borderRadius: 2, p: 3, mb: 3, color: '#fff' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <VpnKeyIcon />
              <Typography variant="h5" fontWeight={700}>API Gateway</Typography>
            </Stack>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Manage API keys for programmatic data push — operators can push PM counters, KPIs, and alarms directly into TNIP-R.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" startIcon={<CodeIcon />}
              onClick={() => setShowGuide(true)}
              sx={{ borderColor: 'rgba(255,255,255,0.5)', color: '#fff',
                    '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
              Integration Guide
            </Button>
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => setShowCreate(true)}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}>
              New Key
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard label="Active Keys" value={activeKeys.length} color="#1565c0" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Total Push Calls" value={Number(stats.total_calls ?? 0).toLocaleString()} color="#2e7d32" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Calls (24h)" value={Number(stats.calls_24h ?? 0).toLocaleString()} color="#e65100" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Avg Latency" value={stats.avg_duration_ms ? `${stats.avg_duration_ms}ms` : '—'} color="#7b1fa2" />
        </Grid>
      </Grid>

      {/* Endpoint breakdown */}
      {(stats.byEndpoint || []).length > 0 && (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700}>Push Activity by Endpoint</Typography>
            <Button size="small" onClick={() => setShowLogs(true)}>View All Logs</Button>
          </Stack>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {stats.byEndpoint.map((e) => (
              <Paper key={e.endpoint} variant="outlined" sx={{ p: 1.5, minWidth: 160 }}>
                <Typography variant="caption" fontFamily="monospace" color="text.secondary">{e.endpoint}</Typography>
                <Typography variant="h6" fontWeight={700}>{Number(e.calls).toLocaleString()}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {Number(e.rows).toLocaleString()} rows · {e.errors} errors
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Keys table */}
      {loading
        ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        : (
          <>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Active Keys ({activeKeys.length})
            </Typography>
            <TableContainer component={Paper} elevation={2} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>Prefix</TableCell>
                    {isRegulator && <TableCell>Operator</TableCell>}
                    <TableCell>Label</TableCell>
                    <TableCell>Scopes</TableCell>
                    <TableCell align="right">Rate Limit</TableCell>
                    <TableCell>Last Used</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeKeys.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isRegulator ? 8 : 7} align="center">
                        <Typography color="text.secondary" sx={{ py: 3 }}>
                          No active API keys. Create one to start pushing data.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {activeKeys.map((k) => (
                    <TableRow key={k.key_id} hover>
                      <TableCell>
                        <Typography fontFamily="monospace" variant="body2" fontWeight={600}>
                          {k.key_prefix}…
                        </Typography>
                        <Typography variant="caption" color="text.disabled">{k.key_ref}</Typography>
                      </TableCell>
                      {isRegulator && <TableCell>{k.operator_name}</TableCell>}
                      <TableCell>{k.label || <Typography color="text.disabled" variant="caption">—</Typography>}</TableCell>
                      <TableCell>{scopeChips(k.scopes)}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{Number(k.rate_limit).toLocaleString()}/hr</Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={fmt(k.last_used_at)}>
                          <Typography variant="body2">{timeSince(k.last_used_at)}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {k.expires_at
                          ? <Chip size="small" label={new Date(k.expires_at).toLocaleDateString()}
                              color={new Date(k.expires_at) < new Date() ? 'error' : 'default'}
                              variant="outlined" sx={{ fontSize: '0.7rem' }} />
                          : <Typography variant="caption" color="text.disabled">Never</Typography>}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Revoke key">
                          <IconButton size="small" color="error" onClick={() => setRevoking(k)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {revokedKeys.length > 0 && (
              <>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }} color="text.secondary">
                  Revoked Keys ({revokedKeys.length})
                </Typography>
                <TableContainer component={Paper} elevation={1} sx={{ opacity: 0.65 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell>Prefix</TableCell>
                        {isRegulator && <TableCell>Operator</TableCell>}
                        <TableCell>Label</TableCell>
                        <TableCell>Revoked At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {revokedKeys.map((k) => (
                        <TableRow key={k.key_id}>
                          <TableCell>
                            <Typography fontFamily="monospace" variant="body2" sx={{ textDecoration: 'line-through' }}>
                              {k.key_prefix}…
                            </Typography>
                          </TableCell>
                          {isRegulator && <TableCell>{k.operator_name}</TableCell>}
                          <TableCell>{k.label || '—'}</TableCell>
                          <TableCell>{fmt(k.revoked_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </>
        )}

      {/* Dialogs */}
      <CreateKeyDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        operators={operators}
        isRegulator={isRegulator}
        defaultOperatorId={!isRegulator ? user?.operatorId : ''}
        onCreated={(data) => { setNewKeyData(data); load(); }}
      />
      <KeyRevealDialog keyData={newKeyData} onClose={() => setNewKeyData(null)} />
      <RevokeDialog open={Boolean(revoking)} keyRow={revoking}
        onClose={() => setRevoking(null)} onRevoked={() => { load(); setSnack('Key revoked'); }} />
      <IntegrationGuide open={showGuide} onClose={() => setShowGuide(false)} />
      <LogsDrawer open={showLogs} onClose={() => setShowLogs(false)}
        operatorId={!isRegulator ? user?.operatorId : undefined} />

      <Snackbar open={Boolean(snack)} autoHideDuration={3000} onClose={() => setSnack('')}
        message={snack} />
    </Box>
  );
}
