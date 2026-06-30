import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Card, CardContent, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  Box, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  FormControl, InputLabel, CircularProgress, Alert, Pagination, Chip, IconButton,
  TextField, Tooltip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Papa from 'papaparse';
import { get, post, put, del } from '../api/client';
import { Loading, EmptyState } from '../components/ui';
import { exportCsv } from '../utils/csv';

const TECHS = ['2G', '3G', '4G', '5G'];

export default function CounterDictionary() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tech, setTech] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const fetchCounters = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await get('/counters', { page: p, limit: 10, search: search || undefined, technology: tech || undefined, status: status || undefined });
      setRows(res.data || []);
      setMeta(res.meta || { page: 1, limit: 10, total: 0 });
    } catch {
      setRows([]);
      setMeta({ page: 1, limit: 10, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [page, search, tech, status]);

  useEffect(() => { fetchCounters(page); }, [page, tech, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCounters(1);
  };

  const reload = () => { setPage(1); fetchCounters(1); };

  // ── CRUD dialogs state ──
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const downloadSampleCsv = () => {
    const csvRows = [
      ['counter_id', 'counter_name', 'category', 'measurement_object', 'aggregation', 'unit'],
      ['50331710', 'VS.RRC.ConnReq.Att', 'Accessibility', 'ULoCell', 'SUM', 'Attempts'],
      ['50331724', 'VS.RRC.ConnReq.Succ', 'Accessibility', 'ULoCell', 'SUM', 'Successes'],
      ['50341690', 'VS.HSDPA.UE.Traffic.DL', 'Throughput', 'ULoCell', 'SUM', 'kbps'],
      ['50341691', 'VS.HSDPA.UE.Traffic.DL.Cell', 'Throughput', 'ULoCell', 'SUM', 'kbps'],
      ['50341692', 'VS.HSUPA.UE.Traffic.UL', 'Throughput', 'ULoCell', 'SUM', 'kbps'],
      ['L.Traffic.User.Avg', 'Average Connected Users', 'Capacity', 'EUtranCellFDD', 'AVG', 'Users'],
      ['L.RRC.ConnEstabAtt.Sum', 'RRC Setup Attempts', 'Accessibility', 'EUtranCellFDD', 'SUM', 'Attempts'],
      ['L.RRC.ConnEstabSucc.Sum', 'RRC Setup Successes', 'Accessibility', 'EUtranCellFDD', 'SUM', 'Successes'],
      ['L.E-RAB.NormRelease', 'E-RAB Normal Releases', 'Retainability', 'EUtranCellFDD', 'SUM', 'Releases'],
      ['L.E-RAB.AbnormRelease', 'E-RAB Abnormal Releases', 'Retainability', 'EUtranCellFDD', 'SUM', 'Releases'],
      ['L.Thrp.bits.DL', 'DL Throughput Bits', 'Throughput', 'EUtranCellFDD', 'SUM', 'bits'],
      ['L.Thrp.Time.DL', 'DL Throughput Time', 'Throughput', 'EUtranCellFDD', 'SUM', 'ms'],
    ];
    const csv = csvRows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'counter_dictionary_sample.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h5">Counter Dictionary</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} disabled={!rows?.length}
            onClick={() => exportCsv('counter_dictionary.csv', [
              { key: 'tech_key', label: 'Technology' }, { key: 'counter_key', label: 'Counter Key' },
              { key: 'counter_name', label: 'Counter Name' }, { key: 'category', label: 'Category' },
              { key: 'measurement_object', label: 'Meas. Object' }, { key: 'aggregation', label: 'Aggregation' },
              { key: 'raw_unit', label: 'Unit' }, { key: 'status', label: 'Status' },
            ], rows)}>Export</Button>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={downloadSampleCsv}>
            Sample CSV
          </Button>
          <Button variant="outlined" size="small" startIcon={<AddIcon />}
            onClick={() => { setEditRow(null); setEditOpen(true); }}>
            Add Counter
          </Button>
          <ImportDialog onImported={reload} />
        </Stack>
      </Stack>

      {/* Filters */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Technology</InputLabel>
              <Select label="Technology" value={tech} onChange={(e) => { setTech(e.target.value); setPage(1); }}>
                <MenuItem value="">All</MenuItem>
                {TECHS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="MAPPED">MAPPED</MenuItem>
                <MenuItem value="UNKNOWN">UNKNOWN</MenuItem>
              </Select>
            </FormControl>
            <form onSubmit={handleSearch} style={{ display: 'flex', flex: 1, gap: '8px', minWidth: 200 }}>
              <TextField size="small" fullWidth placeholder="Search counter ID or name…"
                value={search} onChange={(e) => setSearch(e.target.value)} />
              <Button type="submit" variant="outlined" startIcon={<SearchIcon />}>Search</Button>
            </form>
          </Box>

          {/* Table */}
          {loading ? <Loading /> : !rows.length ? (
            <EmptyState
              message="No counters found."
              hint='Import a counter dictionary CSV or add counters one at a time using "Add Counter".'
            />
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" mb={1}>
                {meta.total} counter{meta.total !== 1 ? 's' : ''} total
              </Typography>
              <Box sx={{ overflowX: 'auto', mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tech</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Counter ID / Key</TableCell>
                      <TableCell>Counter Name</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Meas. Object</TableCell>
                      <TableCell>Aggregation</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((c) => (
                      <TableRow key={c.counter_id} hover>
                        <TableCell>
                          <Chip size="small" label={c.tech_key || '—'} />
                        </TableCell>
                        <TableCell>
                          <Chip size="small"
                            color={c.status === 'MAPPED' ? 'success' : c.status === 'UNKNOWN' ? 'warning' : 'default'}
                            label={c.status} />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{c.counter_key}</TableCell>
                        <TableCell>{c.counter_name || '—'}</TableCell>
                        <TableCell>{c.category || '—'}</TableCell>
                        <TableCell>{c.measurement_object || '—'}</TableCell>
                        <TableCell>{c.aggregation || '—'}</TableCell>
                        <TableCell>{c.raw_unit || '—'}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => { setEditRow(c); setEditOpen(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(c)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              {meta.total > meta.limit && (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Pagination count={Math.ceil(meta.total / meta.limit)} page={page}
                    onChange={(_, p) => setPage(p)} color="primary" />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <CounterFormDialog
        open={editOpen}
        initial={editRow}
        onClose={() => setEditOpen(false)}
        onSaved={reload}
      />

      {/* Delete confirmation */}
      <DeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={reload}
      />
    </Box>
  );
}

// ──────────────────────────────────────────────────
// Add / Edit single counter dialog
// ──────────────────────────────────────────────────
function CounterFormDialog({ open, initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (initial) {
      setForm({
        counter_key: initial.counter_key || '',
        counter_name: initial.counter_name || '',
        technology: initial.tech_key || '3G',
        category: initial.category || '',
        measurement_object: initial.measurement_object || '',
        aggregation: initial.aggregation || 'SUM',
        unit: initial.raw_unit || '',
      });
    } else {
      setForm({ counter_key: '', counter_name: '', technology: '3G', category: '', measurement_object: '', aggregation: 'SUM', unit: '' });
    }
  }, [open, initial]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.counter_key?.trim() || !form.counter_name?.trim()) {
      setError('Counter ID/Key and Name are required.'); return;
    }
    setBusy(true); setError('');
    try {
      if (isEdit) {
        await put(`/counters/${initial.counter_id}`, {
          counter_key: form.counter_key.trim(),
          counter_name: form.counter_name.trim(),
          category: form.category || null,
          measurement_object: form.measurement_object || null,
          aggregation: form.aggregation || 'SUM',
          raw_unit: form.unit || null,
        });
      } else {
        await post('/counters', {
          counter_key: form.counter_key.trim(),
          counter_name: form.counter_name.trim(),
          technology: form.technology,
          category: form.category || undefined,
          measurement_object: form.measurement_object || undefined,
          aggregation: form.aggregation || 'SUM',
          unit: form.unit || undefined,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Save failed');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Counter' : 'Add Counter'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField label="Counter ID / Key *" size="small" value={form.counter_key || ''}
            onChange={set('counter_key')} disabled={isEdit}
            helperText="Numeric ID (e.g. 50331710) or named key (e.g. L.RRC.ConnEstabAtt.Sum)" />

          <TextField label="Counter Name *" size="small" value={form.counter_name || ''} onChange={set('counter_name')} />

          <FormControl size="small" fullWidth>
            <InputLabel>Technology</InputLabel>
            <Select label="Technology" value={form.technology || '3G'} onChange={set('technology')} disabled={isEdit}>
              {TECHS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField label="Category" size="small" value={form.category || ''} onChange={set('category')}
            helperText="e.g. Accessibility, Retainability, Throughput, Capacity, Mobility" />

          <TextField label="Measurement Object" size="small" value={form.measurement_object || ''} onChange={set('measurement_object')}
            helperText="e.g. ULoCell, EUtranCellFDD, ENODEB" />

          <FormControl size="small" fullWidth>
            <InputLabel>Aggregation</InputLabel>
            <Select label="Aggregation" value={form.aggregation || 'SUM'} onChange={set('aggregation')}>
              {['SUM', 'AVG', 'MAX', 'MIN'].map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField label="Unit" size="small" value={form.unit || ''} onChange={set('unit')}
            helperText="e.g. Attempts, kbps, bits, ms" />
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

// ──────────────────────────────────────────────────
// Delete confirmation dialog
// ──────────────────────────────────────────────────
function DeleteDialog({ target, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (target) setError(''); }, [target]);

  const confirm = async () => {
    setBusy(true); setError('');
    try {
      await del(`/counters/${target.counter_id}`);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Delete failed');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!target} onClose={() => !busy && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Counter</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography>
          Are you sure you want to delete counter <strong>{target?.counter_key}</strong>
          {target?.counter_name ? ` (${target.counter_name})` : ''}?
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          This cannot be undone. Counters referenced by ingested PM data cannot be deleted.
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

// ──────────────────────────────────────────────────
// Bulk CSV import dialog
// ──────────────────────────────────────────────────
function ImportDialog({ onImported }) {
  const [open, setOpen] = useState(false);
  const [tech, setTech] = useState('3G');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImport = async () => {
    if (!file) return;
    setUploading(true); setError(''); setSuccess('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const mappings = results.data.map((row) => ({
            counter_id: row.counter_id || row.id || row.ID || row.counter_key,
            counter_name: row.counter_name || row.name || row.Name,
            category: row.category || row.Category,
            measurement_object: row.measurement_object || row.MeasurementObject,
            aggregation: row.aggregation || row.Aggregation,
            unit: row.unit || row.Unit,
          })).filter((m) => m.counter_id && m.counter_name);

          if (!mappings.length) {
            throw new Error("No valid rows found. Ensure CSV has 'counter_id' and 'counter_name' columns.");
          }

          const res = await post('/counters/import', { technology: tech, mappings });
          setSuccess(`Imported ${res.data?.upserted ?? res.data?.mapped ?? 0} counters for ${tech}.`);
          onImported();
          setTimeout(() => { setOpen(false); setSuccess(''); setFile(null); }, 2000);
        } catch (e) {
          setError(e.response?.data?.error?.message || e.message || 'Import failed.');
        } finally {
          setUploading(false);
        }
      },
      error: (err) => { setError(err.message); setUploading(false); },
    });
  };

  return (
    <>
      <Button variant="contained" size="small" startIcon={<UploadFileIcon />} onClick={() => setOpen(true)}>
        Import CSV
      </Button>
      <Dialog open={open} onClose={() => !uploading && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Counter Dictionary (CSV)</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Alert severity="info">
              Upload a CSV with counter mappings.<br />
              <strong>Required:</strong> <code>counter_id</code>, <code>counter_name</code><br />
              <strong>Optional:</strong> <code>category</code>, <code>measurement_object</code>, <code>aggregation</code>, <code>unit</code><br />
              Use <em>Download Sample CSV</em> on the main page for a template.
            </Alert>

            <FormControl size="small" fullWidth>
              <InputLabel>Technology</InputLabel>
              <Select label="Technology" value={tech} onChange={(e) => setTech(e.target.value)}>
                {TECHS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>

            <Button variant="outlined" component="label" color={file ? 'success' : 'primary'}>
              {file ? file.name : 'Select CSV File'}
              <input type="file" hidden accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
            </Button>

            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={uploading}>Cancel</Button>
          <Button onClick={handleImport} variant="contained" disabled={!file || uploading}>
            {uploading ? <CircularProgress size={24} /> : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
