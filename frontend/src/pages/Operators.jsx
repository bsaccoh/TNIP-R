import { useEffect, useState } from 'react';
import {
  Card, CardContent, Typography, Table, TableHead, TableBody, TableRow, TableCell, Chip, Box,
  Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Select, FormControl, InputLabel, Alert, IconButton, Tooltip, CircularProgress, TablePagination,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import { get, post, put, del } from '../api/client';
import { Loading, EmptyState } from '../components/ui';
import { colorFor } from '../theme';
import { exportCsv } from '../utils/csv';

const STATUS_COLOR = { ACTIVE: 'success', SUSPENDED: 'error', UNDER_REVIEW: 'warning' };
const STATUSES = ['ACTIVE', 'SUSPENDED', 'UNDER_REVIEW'];
const LICENSE_TYPES = ['Mobile', 'Fixed', 'ISP', 'MVNO', 'Converged'];

export default function Operators() {
  const [ops, setOps] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const load = () => get('/operators').then((r) => setOps(r.data)).catch(() => setOps([]));
  useEffect(() => { load(); }, []);

  const filteredOps = ops ? ops.filter((o) => {
    const q = search.toLowerCase();
    return !q || (o.operator_name || '').toLowerCase().includes(q) ||
      (o.license_number || '').toLowerCase().includes(q) ||
      (o.license_type || '').toLowerCase().includes(q) ||
      (o.status || '').toLowerCase().includes(q);
  }) : [];

  if (!ops) return <Loading />;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Licensed Operators</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<DownloadIcon />} disabled={!ops?.length}
            onClick={() => exportCsv('operators.csv', [
              { key: 'operator_name', label: 'Operator' }, { key: 'license_number', label: 'License #' },
              { key: 'license_type', label: 'Type' }, { key: 'country', label: 'Country' },
              { key: 'contact_email', label: 'Email' }, { key: 'status', label: 'Status' },
            ], ops)}>Export</Button>
          <Button size="small" startIcon={<UploadFileIcon />} onClick={() => setImportOpen(true)}>Import CSV</Button>
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => { setEditRow(null); setEditOpen(true); }}>
            Add Operator
          </Button>
        </Stack>
      </Stack>

      <Card>
        <CardContent>
          <TextField
            size="small" placeholder="Search operators…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ mb: 2, width: 280 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          {!ops.length ? (
            <EmptyState message="No operators configured." hint='Click "Add Operator" to register a telecom operator.' />
          ) : !filteredOps.length ? (
            <EmptyState message="No operators match your search." />
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Operator</TableCell>
                      <TableCell>License #</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Country</TableCell>
                      <TableCell>Contact Email</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOps.slice(page * 10, page * 10 + 10).map((o) => (
                      <TableRow key={o.operator_id} hover>
                        <TableCell>
                          <Chip label={o.operator_name} sx={{ bgcolor: colorFor(o.operator_name) + '33' }} />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{o.license_number || '—'}</TableCell>
                        <TableCell>{o.license_type || '—'}</TableCell>
                        <TableCell>{o.country || '—'}</TableCell>
                        <TableCell>{o.contact_email || '—'}</TableCell>
                        <TableCell>
                          <Chip size="small" color={STATUS_COLOR[o.status] || 'default'} label={o.status} />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => { setEditRow(o); setEditOpen(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(o)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <TablePagination component="div" count={filteredOps.length} page={page} rowsPerPage={10}
                rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />
            </>
          )}
        </CardContent>
      </Card>

      <OperatorFormDialog
        open={editOpen}
        initial={editRow}
        onClose={() => setEditOpen(false)}
        onSaved={() => { setEditOpen(false); load(); }}
      />

      <DeleteOperatorDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => { setDeleteTarget(null); load(); }}
      />

      <ImportOperatorsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { setImportOpen(false); load(); }}
      />
    </Box>
  );
}

function OperatorFormDialog({ open, initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (initial) {
      setForm({
        operator_name: initial.operator_name || '',
        license_number: initial.license_number || '',
        license_type: initial.license_type || '',
        status: initial.status || 'ACTIVE',
        country: initial.country || 'Sierra Leone',
        contact_email: initial.contact_email || '',
        logo_url: initial.logo_url || '',
      });
    } else {
      setForm({ operator_name: '', license_number: '', license_type: 'Mobile', status: 'ACTIVE', country: 'Sierra Leone', contact_email: '', logo_url: '' });
    }
  }, [open, initial]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.operator_name?.trim()) { setError('Operator name is required.'); return; }
    setBusy(true); setError('');
    try {
      const body = {
        operator_name: form.operator_name.trim(),
        license_number: form.license_number || undefined,
        license_type: form.license_type || undefined,
        status: form.status,
        country: form.country || undefined,
        contact_email: form.contact_email || undefined,
        logo_url: form.logo_url || undefined,
      };
      if (isEdit) {
        await put(`/operators/${initial.operator_id}`, body);
      } else {
        await post('/operators', body);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Save failed');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Operator' : 'Add Operator'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Operator Name *" size="small" value={form.operator_name || ''} onChange={set('operator_name')}
            helperText="e.g. Orange, Africell, Qcell, SierraTel" />
          <TextField label="License Number" size="small" value={form.license_number || ''} onChange={set('license_number')}
            helperText="e.g. SL-LIC-005" />
          <FormControl size="small" fullWidth>
            <InputLabel>License Type</InputLabel>
            <Select label="License Type" value={form.license_type || ''} onChange={set('license_type')}>
              <MenuItem value="">—</MenuItem>
              {LICENSE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={form.status || 'ACTIVE'} onChange={set('status')}>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Country" size="small" value={form.country || ''} onChange={set('country')} />
          <TextField label="Contact Email" size="small" type="email" value={form.contact_email || ''} onChange={set('contact_email')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy}>
          {busy ? <CircularProgress size={20} /> : isEdit ? 'Save' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeleteOperatorDialog({ target, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (target) setError(''); }, [target]);

  const confirm = async () => {
    setBusy(true); setError('');
    try {
      await del(`/operators/${target.operator_id}`);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Delete failed');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!target} onClose={() => !busy && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Operator</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography>
          Are you sure you want to delete <strong>{target?.operator_name}</strong>?
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          This will remove the operator and all associated data. This cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" color="error" onClick={confirm} disabled={busy}>
          {busy ? <CircularProgress size={20} /> : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ImportOperatorsDialog({ open, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => { if (open) { setFile(null); setPreview(null); setError(''); setResult(null); } }, [open]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    setFile(f);
    setError('');
    if (!f) { setPreview(null); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter((l) => l.trim());
      if (lines.length < 2) { setError('CSV must have a header row and at least one data row.'); return; }
      const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
      if (!headers.includes('operator_name')) { setError('CSV must have an "operator_name" column.'); return; }
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(',').map((v) => v.replace(/^"|"$/g, '').trim());
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      }).filter((r) => r.operator_name);
      setPreview(rows);
    };
    reader.readAsText(f);
  };

  const submit = async () => {
    if (!preview?.length) { setError('No valid rows to import.'); return; }
    setBusy(true); setError('');
    let created = 0, failed = 0;
    for (const row of preview) {
      try {
        await post('/operators', {
          operator_name: row.operator_name,
          license_number: row.license_number || undefined,
          license_type: row.license_type || undefined,
          status: row.status || 'ACTIVE',
          country: row.country || 'Sierra Leone',
          contact_email: row.contact_email || undefined,
        });
        created++;
      } catch { failed++; }
    }
    setBusy(false);
    setResult({ created, failed });
    if (!failed) setTimeout(onImported, 1500);
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Import Operators from CSV</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info">
            Upload a CSV with columns: <strong>operator_name</strong> (required),
            <em> license_number, license_type, status, country, contact_email</em> (optional).
          </Alert>
          {error && <Alert severity="error">{error}</Alert>}
          {result ? (
            <Alert severity={result.failed ? 'warning' : 'success'}>
              Created {result.created} operator{result.created !== 1 ? 's' : ''}.
              {result.failed > 0 && ` ${result.failed} failed (may already exist).`}
            </Alert>
          ) : (
            <>
              <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                {file ? file.name : 'Choose CSV file'}
                <input hidden type="file" accept=".csv" onChange={handleFile} />
              </Button>
              {preview && (
                <Typography variant="body2" color="text.secondary">
                  {preview.length} operator{preview.length !== 1 ? 's' : ''} found in CSV — ready to import.
                </Typography>
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        {result ? (
          <Button variant="contained" onClick={onImported}>Done</Button>
        ) : (
          <Button variant="contained" onClick={submit} disabled={busy || !preview?.length}>
            {busy ? <CircularProgress size={20} /> : 'Import'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
