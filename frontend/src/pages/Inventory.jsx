import { useEffect, useState, useRef } from 'react';
import {
  Card, CardContent, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  Grid, TextField, TablePagination, Box, Button, Stack, Dialog, DialogTitle,
  DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel,
  Alert, LinearProgress, Chip, IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import { get, post, put, del } from '../api/client';
import { KpiCard, Loading, EmptyState } from '../components/ui';
import { exportCsv } from '../utils/csv';
import { useAuth } from '../auth/AuthContext';

const STATUSES = ['ACTIVE', 'DEGRADED', 'DOWN', 'PLANNED'];

export default function Inventory() {
  const { user } = useAuth();
  const isRegulator = ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'].includes(user?.role);

  const [stats, setStats] = useState(null);
  const [sites, setSites] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [ops, setOps] = useState([]);
  const [operatorId, setOperatorId] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadStats = () =>
    get('/inventory/stats').then((r) => setStats(r.data)).catch(() => setStats({}));

  const loadSites = () => {
    const t = setTimeout(() => {
      get('/inventory/sites', {
        page: page + 1, limit: 10,
        search: search || undefined,
        operatorId: operatorId || undefined,
      })
        .then((r) => { setSites(r.data); setTotal(r.meta?.total || 0); })
        .catch(() => setSites([]));
    }, 250);
    return () => clearTimeout(t);
  };

  useEffect(() => { loadStats(); }, []);
  useEffect(() => {
    if (!isRegulator) return;
    get('/operators').then((r) => setOps(r.data.data ?? r.data ?? [])).catch(() => {});
  }, [isRegulator]);
  useEffect(loadSites, [page, search, operatorId]);

  const handleImported = () => {
    loadStats();
    setPage(0);
    setSearch('');
    setSites(null);
    get('/inventory/sites', { page: 1, limit: 10 })
      .then((r) => { setSites(r.data); setTotal(r.meta?.total || 0); })
      .catch(() => setSites([]));
  };

  const handleExport = () => {
    if (!sites?.length) return;
    exportCsv('network_inventory.csv', [
      { key: 'site_code', label: 'Site Code' },
      { key: 'site_name', label: 'Site Name' },
      { key: 'region', label: 'Region' },
      { key: 'district', label: 'District' },
      { key: 'technologies', label: 'Technologies' },
      { key: 'classification', label: 'Classification' },
      { key: 'latitude', label: 'Latitude' },
      { key: 'longitude', label: 'Longitude' },
      { key: 'status', label: 'Status' },
    ], sites);
  };

  const reload = () => { setSites(null); loadSites(); loadStats(); };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Network Inventory</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}
            disabled={!sites?.length}>Export CSV</Button>
          <Button variant="outlined" startIcon={<AddIcon />}
            onClick={() => { setEditRow(null); setEditOpen(true); }}>Add Site</Button>
          <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => setImportOpen(true)}>
            Import Geo-Dimension
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} md={3}><KpiCard label="Total Sites" value={stats?.sites?.toLocaleString() ?? '—'} /></Grid>
        <Grid item xs={6} md={3}><KpiCard label="Total Cells" value={stats?.cells?.toLocaleString() ?? '—'} /></Grid>
        {(stats?.byTech || []).slice(0, 2).map((t) => (
          <Grid item xs={6} md={3} key={t.tech_key}>
            <KpiCard label={`${t.tech_key} Cells`} value={t.c?.toLocaleString()} />
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} mb={2} alignItems="center">
            <TextField size="small" label="Search site code / name" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }} sx={{ flex: 1 }} />
            {isRegulator && (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Operator</InputLabel>
                <Select label="Operator" value={operatorId}
                  onChange={(e) => { setOperatorId(e.target.value); setPage(0); }}>
                  <MenuItem value="">All operators</MenuItem>
                  {ops.map((o) => (
                    <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Button size="small" startIcon={<RefreshIcon />} onClick={reload}>Refresh</Button>
          </Stack>

          {!sites ? <Loading /> : !sites.length ? (
            <EmptyState
              message="No sites loaded yet."
              hint='Click "Import Geo-Dimension" above to load the Orange Geo-Dimension Excel workbook (649 sites, 24 500+ cells).'
            />
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Site Code</TableCell>
                      <TableCell>Site Name</TableCell>
                      <TableCell>Region</TableCell>
                      <TableCell>District</TableCell>
                      <TableCell>Technologies</TableCell>
                      <TableCell>Classification</TableCell>
                      <TableCell>Latitude</TableCell>
                      <TableCell>Longitude</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sites.map((s) => (
                      <TableRow key={s.site_id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.site_code}</TableCell>
                        <TableCell>{s.site_name}</TableCell>
                        <TableCell>{s.region}</TableCell>
                        <TableCell>{s.district}</TableCell>
                        <TableCell>
                          {(s.technologies || '').split(',').filter(Boolean).map((t) => (
                            <Chip key={t} label={t.trim()} size="small" sx={{ mr: 0.5 }} />
                          ))}
                        </TableCell>
                        <TableCell>{s.classification}</TableCell>
                        <TableCell>{s.latitude ? Number(s.latitude).toFixed(5) : '—'}</TableCell>
                        <TableCell>{s.longitude ? Number(s.longitude).toFixed(5) : '—'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={s.status || 'ACTIVE'}
                            color={s.status === 'ACTIVE' ? 'success' : s.status === 'DEGRADED' ? 'warning' : s.status === 'DOWN' ? 'error' : 'default'} />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => { setEditRow(s); setEditOpen(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(s)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <TablePagination component="div" count={total} page={page} rowsPerPage={10}
                rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />
            </>
          )}
        </CardContent>
      </Card>

      <ImportGeoDimDialog open={importOpen} onClose={() => setImportOpen(false)}
        onImported={() => { setImportOpen(false); handleImported(); }} />

      <SiteFormDialog open={editOpen} initial={editRow}
        onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); reload(); }} />

      <DeleteSiteDialog target={deleteTarget}
        onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); reload(); }} />
    </Box>
  );
}

function SiteFormDialog({ open, initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [ops, setOps] = useState([]);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    get('/operators').then((r) => setOps(r.data || [])).catch(() => {});
    if (initial) {
      setForm({
        operator_id: initial.operator_id || '',
        site_code: initial.site_code || '',
        site_name: initial.site_name || '',
        region: initial.region || '',
        district: initial.district || '',
        classification: initial.classification || '',
        latitude: initial.latitude || '',
        longitude: initial.longitude || '',
        status: initial.status || 'ACTIVE',
      });
    } else {
      setForm({ operator_id: '', site_code: '', site_name: '', region: '', district: '',
        classification: '', latitude: '', longitude: '', status: 'ACTIVE' });
    }
  }, [open, initial]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.site_code?.trim()) { setError('Site code is required.'); return; }
    if (!isEdit && !form.operator_id) { setError('Operator is required.'); return; }
    setBusy(true); setError('');
    try {
      const body = {
        operator_id: Number(form.operator_id) || undefined,
        site_code: form.site_code.trim(),
        site_name: form.site_name?.trim() || undefined,
        region: form.region?.trim() || undefined,
        district: form.district?.trim() || undefined,
        classification: form.classification?.trim() || undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        status: form.status,
      };
      if (isEdit) await put(`/inventory/sites/${initial.site_id}`, body);
      else await post('/inventory/sites', body);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Save failed');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Site' : 'Add Site'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {error && <Alert severity="error">{error}</Alert>}
          {!isEdit && (
            <FormControl size="small" fullWidth>
              <InputLabel>Operator *</InputLabel>
              <Select label="Operator *" value={form.operator_id || ''} onChange={set('operator_id')}>
                {ops.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          <TextField label="Site Code *" size="small" value={form.site_code || ''} onChange={set('site_code')} />
          <TextField label="Site Name" size="small" value={form.site_name || ''} onChange={set('site_name')} />
          <Stack direction="row" spacing={2}>
            <TextField label="Region" size="small" fullWidth value={form.region || ''} onChange={set('region')} />
            <TextField label="District" size="small" fullWidth value={form.district || ''} onChange={set('district')} />
          </Stack>
          <TextField label="Classification" size="small" value={form.classification || ''} onChange={set('classification')}
            helperText="e.g. Urban, Suburban, Rural" />
          <Stack direction="row" spacing={2}>
            <TextField label="Latitude" size="small" fullWidth type="number" inputProps={{ step: 0.000001 }}
              value={form.latitude || ''} onChange={set('latitude')} />
            <TextField label="Longitude" size="small" fullWidth type="number" inputProps={{ step: 0.000001 }}
              value={form.longitude || ''} onChange={set('longitude')} />
          </Stack>
          <FormControl size="small" fullWidth>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={form.status || 'ACTIVE'} onChange={set('status')}>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
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

function DeleteSiteDialog({ target, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (target) setError(''); }, [target]);

  const confirm = async () => {
    setBusy(true); setError('');
    try {
      await del(`/inventory/sites/${target.site_id}`);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Delete failed');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!target} onClose={() => !busy && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Site</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography>Are you sure you want to delete site <strong>{target?.site_code}</strong> — {target?.site_name}?</Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          This will also remove all cells associated with this site. This cannot be undone.
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

function ImportGeoDimDialog({ open, onClose, onImported }) {
  const [ops, setOps] = useState([]);
  const [operatorId, setOperatorId] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    get('/operators').then((r) => {
      const list = r.data || [];
      setOps(list);
      if (list[0]) setOperatorId(String(list[0].operator_id));
    }).catch(() => setError('Could not load operators — check that the backend is running.'));
  }, [open]);

  const handleClose = () => {
    if (busy) return;
    setFile(null); setError(''); setResult(null);
    onClose();
  };

  const submit = async () => {
    if (!file || !operatorId) { setError('Select an operator and an Excel file.'); return; }
    setBusy(true); setError(''); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('operator_id', operatorId);
      const r = await post('/inventory/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(r.data ?? r);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Import failed');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Geo-Dimension Workbook</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Alert severity="info">
            Upload the <strong>Geo-Dimension_Newsites_Upgrade_2026_V1.xlsx</strong> workbook
            (or any Huawei Geo-Dim export). Contains two sheets:
            <em> OSL_Physical Sites</em> (649 sites) and <em>GEO-DIM 2G_3G_4G_5G</em> (24 500+ cells).
          </Alert>
          {error && <Alert severity="error">{error}</Alert>}
          {result ? (
            <Alert severity="success">
              Imported <strong>{result.sites}</strong> sites and <strong>{result.cells}</strong> cells
              ({result.skipped ?? 0} rows skipped).
              <br />Click <em>Done</em> to refresh the table.
            </Alert>
          ) : (
            <>
              <FormControl fullWidth size="small">
                <InputLabel>Operator</InputLabel>
                <Select label="Operator" value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
                  {ops.map((o) => (
                    <MenuItem key={o.operator_id} value={String(o.operator_id)}>{o.operator_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="outlined" component="label"
                color={file ? 'success' : 'primary'} startIcon={<UploadFileIcon />}>
                {file ? file.name : 'Choose .xlsx file'}
                <input hidden type="file" accept=".xlsx,.xls"
                  onChange={(e) => { setFile(e.target.files[0]); setError(''); }} />
              </Button>
              {busy && <LinearProgress />}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>Cancel</Button>
        {result ? (
          <Button variant="contained" onClick={onImported}>Done</Button>
        ) : (
          <Button variant="contained" onClick={submit} disabled={busy || !file}>
            {busy ? 'Importing…' : 'Import'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
