import { useEffect, useState, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, Stack, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Alert,
  Switch, FormControlLabel, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import WifiIcon from '@mui/icons-material/Wifi';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { get, post, del } from '../api/client';
import { Loading, EmptyState } from '../components/ui';

const STATUS_COLOR = { OK: 'success', ERROR: 'error', RUNNING: 'info' };

function ConnectionDialog({ open, operators, onClose, onSaved }) {
  const blank = {
    operator_id: '', name: '', host: '', port: 22, username: '',
    auth_type: 'PASSWORD', secret: '', remote_path: '/data',
    file_pattern: '%.csv.gz', delete_after: false,
    poll_enabled: false, poll_interval_sec: 300,
  };
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm(blank); setErr(''); } }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  const save = async () => {
    if (!form.operator_id || !form.name || !form.host || !form.username) {
      setErr('Operator, name, host and username are required.'); return;
    }
    setSaving(true); setErr('');
    try {
      await post('/sftp', {
        ...form,
        operator_id: Number(form.operator_id),
        port: Number(form.port),
        poll_interval_sec: Number(form.poll_interval_sec),
      });
      onSaved(); onClose();
    } catch (e) {
      setErr(e?.response?.data?.error?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New SFTP Connection</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {err && <Alert severity="error">{err}</Alert>}
        <FormControl fullWidth size="small">
          <InputLabel>Operator</InputLabel>
          <Select label="Operator" value={form.operator_id} onChange={set('operator_id')}>
            {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" label="Connection Name" fullWidth value={form.name} onChange={set('name')} />
        <Stack direction="row" spacing={1}>
          <TextField size="small" label="Host" fullWidth value={form.host} onChange={set('host')} />
          <TextField size="small" label="Port" type="number" sx={{ width: 100 }} value={form.port} onChange={set('port')} />
        </Stack>
        <TextField size="small" label="Username" fullWidth value={form.username} onChange={set('username')} />
        <FormControl fullWidth size="small">
          <InputLabel>Auth Type</InputLabel>
          <Select label="Auth Type" value={form.auth_type} onChange={set('auth_type')}>
            <MenuItem value="PASSWORD">Password</MenuItem>
            <MenuItem value="KEY">Private Key</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" label={form.auth_type === 'KEY' ? 'Private Key (PEM)' : 'Password'}
          type={form.auth_type === 'KEY' ? 'text' : 'password'}
          fullWidth multiline={form.auth_type === 'KEY'} rows={form.auth_type === 'KEY' ? 3 : 1}
          value={form.secret} onChange={set('secret')} />
        <TextField size="small" label="Remote Path" fullWidth value={form.remote_path} onChange={set('remote_path')} />
        <TextField size="small" label="File Pattern (e.g. %.csv.gz)" fullWidth value={form.file_pattern} onChange={set('file_pattern')} />
        <Stack direction="row" spacing={2}>
          <FormControlLabel control={<Switch checked={form.delete_after} onChange={toggle('delete_after')} />}
            label="Delete after pull" />
          <FormControlLabel control={<Switch checked={form.poll_enabled} onChange={toggle('poll_enabled')} />}
            label="Auto-poll" />
        </Stack>
        {form.poll_enabled && (
          <TextField size="small" label="Poll interval (seconds, min 60)" type="number"
            value={form.poll_interval_sec} onChange={set('poll_interval_sec')} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Sftp() {
  const [conns, setConns] = useState(null);
  const [operators, setOperators] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [testing, setTesting] = useState({});
  const [pulling, setPulling] = useState({});
  const [testResult, setTestResult] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => get('/sftp').then((r) => setConns(r.data)).catch(() => setConns([]));
  useEffect(() => {
    load();
    get('/operators').then((r) => setOperators(r.data)).catch(() => {});
  }, []);

  const opMap = useMemo(() => Object.fromEntries(operators.map((o) => [o.operator_id, o.operator_name])), [operators]);

  const testConn = async (id) => {
    setTesting((t) => ({ ...t, [id]: true }));
    setTestResult((r) => ({ ...r, [id]: null }));
    try {
      const r = await post(`/sftp/${id}/test`, {});
      setTestResult((t) => ({ ...t, [id]: { ok: true, msg: `Connected — ${r.data.fileCount} files found in ${r.data.remotePath}` } }));
    } catch (e) {
      setTestResult((t) => ({ ...t, [id]: { ok: false, msg: e?.response?.data?.error?.message || 'Connection failed' } }));
    } finally { setTesting((t) => ({ ...t, [id]: false })); }
  };

  const pullNow = async (id) => {
    setPulling((p) => ({ ...p, [id]: true }));
    try {
      const r = await post(`/sftp/${id}/pull`, {});
      setTestResult((t) => ({ ...t, [id]: { ok: true, msg: `Pull complete — ${r.data.ingested} ingested, ${r.data.skipped} skipped, ${r.data.failed} failed` } }));
    } catch (e) {
      setTestResult((t) => ({ ...t, [id]: { ok: false, msg: e?.response?.data?.error?.message || 'Pull failed' } }));
    } finally { setPulling((p) => ({ ...p, [id]: false })); load(); }
  };

  if (!conns) return <Loading />;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CloudSyncIcon color="primary" />
          <Typography variant="h6">SFTP Connections</Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Add Connection
        </Button>
      </Stack>

      {!conns.length ? (
        <EmptyState message="No SFTP connections configured." hint='Click "Add Connection" to set up automated PM file delivery from an operator SFTP server.' />
      ) : (
        <Stack spacing={2}>
          {conns.map((c) => (
            <Card key={c.sftp_id}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" fontWeight={700}>{c.name}</Typography>
                      <Chip size="small" label={opMap[c.operator_id] || `Op ${c.operator_id}`} variant="outlined" />
                      {c.poll_enabled
                        ? <Chip size="small" label={`Auto-poll ${c.poll_interval_sec}s`} color="primary" />
                        : <Chip size="small" label="Manual" />}
                      {c.last_status && (
                        <Chip size="small" label={c.last_status}
                          color={STATUS_COLOR[c.last_status] || 'default'} />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {c.username}@{c.host}:{c.port}{c.remote_path} · {c.file_pattern}
                    </Typography>
                    {c.last_run_at && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Last run: {new Date(c.last_run_at).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Test connection">
                      <span>
                        <IconButton size="small" onClick={() => testConn(c.sftp_id)} disabled={testing[c.sftp_id]}>
                          {testing[c.sftp_id] ? <CircularProgress size={18} /> : <WifiIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Pull now">
                      <span>
                        <IconButton size="small" color="primary" onClick={() => pullNow(c.sftp_id)} disabled={pulling[c.sftp_id]}>
                          {pulling[c.sftp_id] ? <CircularProgress size={18} /> : <PlayArrowIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(c)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>

                {testResult[c.sftp_id] && (
                  <Alert severity={testResult[c.sftp_id].ok ? 'success' : 'error'} sx={{ mt: 1.5 }}>
                    {testResult[c.sftp_id].msg}
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <ConnectionDialog open={addOpen} operators={operators} onClose={() => setAddOpen(false)} onSaved={load} />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle>Delete Connection</DialogTitle>
        <DialogContent>
          <Typography>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={async () => {
            await del(`/sftp/${deleteTarget.sftp_id}`).catch(() => {});
            setDeleteTarget(null); load();
          }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
