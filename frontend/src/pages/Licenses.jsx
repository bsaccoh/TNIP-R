import { useEffect, useState, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, Alert, Tooltip, LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import { get, post, put, del } from '../api/client';
import { Loading, EmptyState } from '../components/ui';

const TECHS = ['2G', '3G', '4G', '5G', 'WiMAX', 'Fixed', 'National Mobile', 'ISP'];

function expiryColor(days) {
  if (days == null) return 'default';
  if (days < 0) return 'error';
  if (days <= 30) return 'error';
  if (days <= 90) return 'warning';
  return 'success';
}

function LicenseDialog({ open, row, operators, onClose, onSaved }) {
  const blank = {
    operator_id: '', license_number: '', technology: '',
    coverage_obligation: '', spectrum_bands: '',
    annual_fee: '', notes: '',
    valid_from: '', valid_to: '',
  };
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(row ? {
        operator_id: row.operator_id, license_number: row.license_number ?? '',
        technology: row.technology ?? '', coverage_obligation: row.coverage_obligation ?? '',
        spectrum_bands: row.spectrum_bands ?? '', annual_fee: row.annual_fee ?? '',
        notes: row.notes ?? '',
        valid_from: row.valid_from?.slice(0, 10) ?? '',
        valid_to: row.valid_to?.slice(0, 10) ?? '',
      } : { ...blank });
      setErr('');
    }
  }, [open, row]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.operator_id) { setErr('Operator is required.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        operator_id: Number(form.operator_id),
        license_number: form.license_number || null,
        technology: form.technology || null,
        coverage_obligation: form.coverage_obligation || null,
        spectrum_bands: form.spectrum_bands || null,
        annual_fee: form.annual_fee ? Number(form.annual_fee) : null,
        notes: form.notes || null,
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
      };
      if (row) await put(`/licenses/${row.license_id}`, payload);
      else await post('/licenses', payload);
      onSaved(); onClose();
    } catch (e) {
      setErr(e?.response?.data?.error?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{row ? 'Edit License' : 'New License'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {err && <Alert severity="error">{err}</Alert>}
        <FormControl size="small" fullWidth>
          <InputLabel>Operator *</InputLabel>
          <Select label="Operator *" value={form.operator_id} onChange={set('operator_id')}>
            {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
          </Select>
        </FormControl>
        <Stack direction="row" spacing={2}>
          <TextField size="small" label="License Number" fullWidth value={form.license_number} onChange={set('license_number')} />
          <FormControl size="small" fullWidth>
            <InputLabel>Technology</InputLabel>
            <Select label="Technology" value={form.technology} onChange={set('technology')}>
              <MenuItem value="">—</MenuItem>
              {TECHS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
        <TextField size="small" label="Spectrum Bands (e.g. 900MHz, 1800MHz, 2100MHz)"
          fullWidth value={form.spectrum_bands} onChange={set('spectrum_bands')} />
        <TextField size="small" label="Coverage Obligation" fullWidth multiline rows={2}
          value={form.coverage_obligation} onChange={set('coverage_obligation')}
          placeholder="e.g. 80% population coverage within 3 years" />
        <TextField size="small" label="Annual Fee (USD)" type="number"
          value={form.annual_fee} onChange={set('annual_fee')} />
        <Stack direction="row" spacing={2}>
          <TextField size="small" label="Valid From" type="date" fullWidth
            InputLabelProps={{ shrink: true }} value={form.valid_from} onChange={set('valid_from')} />
          <TextField size="small" label="Valid To" type="date" fullWidth
            InputLabelProps={{ shrink: true }} value={form.valid_to} onChange={set('valid_to')} />
        </Stack>
        <TextField size="small" label="Notes" fullWidth multiline rows={2}
          value={form.notes} onChange={set('notes')} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Licenses() {
  const [licenses, setLicenses] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [operators, setOperators] = useState([]);
  const [search, setSearch] = useState('');
  const [editRow, setEditRow] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    get('/licenses').then((r) => setLicenses(r.data)).catch(() => setLicenses([]));
    get('/licenses/alerts').then((r) => setAlerts(r.data)).catch(() => {});
  };
  useEffect(() => {
    load();
    get('/operators').then((r) => setOperators(r.data || []));
  }, []);

  const filtered = useMemo(() => {
    if (!licenses) return [];
    const q = search.toLowerCase();
    return licenses.filter((l) =>
      !q || (l.operator_name || '').toLowerCase().includes(q) ||
      (l.license_number || '').toLowerCase().includes(q) ||
      (l.technology || '').toLowerCase().includes(q)
    );
  }, [licenses, search]);

  if (!licenses) return <Loading />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CardMembershipIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>License Management</Typography>
          <Chip size="small" label={`${licenses.length} licenses`} />
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditRow(null); setDialogOpen(true); }}>
          Add License
        </Button>
      </Stack>

      {alerts.length > 0 && (
        <Alert severity="warning" icon={<WarningAmberIcon />}>
          <strong>{alerts.length} license{alerts.length > 1 ? 's' : ''} expiring within 90 days:</strong>{' '}
          {alerts.map((a) => `${a.operator_name} (${a.technology || a.license_number || 'N/A'}) — ${a.days_remaining} days`).join(' · ')}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TextField size="small" placeholder="Search operator, license, technology…" sx={{ mb: 2, width: 320 }}
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />

          {!filtered.length ? <EmptyState message="No licenses found." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Operator</TableCell>
                  <TableCell>License No.</TableCell>
                  <TableCell>Technology</TableCell>
                  <TableCell>Spectrum</TableCell>
                  <TableCell>Valid From</TableCell>
                  <TableCell>Expiry</TableCell>
                  <TableCell>Days Left</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.license_id} hover>
                    <TableCell><Typography variant="body2" fontWeight={600}>{l.operator_name}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{l.license_number || '—'}</Typography></TableCell>
                    <TableCell>{l.technology ? <Chip size="small" label={l.technology} /> : '—'}</TableCell>
                    <TableCell>
                      <Typography variant="caption">{l.spectrum_bands || '—'}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="caption">{l.valid_from?.slice(0, 10) || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{l.valid_to?.slice(0, 10) || '—'}</Typography></TableCell>
                    <TableCell>
                      {l.valid_to ? (
                        <Chip size="small"
                          label={l.days_remaining < 0 ? 'EXPIRED' : `${l.days_remaining}d`}
                          color={expiryColor(l.days_remaining)} />
                      ) : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => { setEditRow(l); setDialogOpen(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(l)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LicenseDialog open={dialogOpen} row={editRow} operators={operators}
        onClose={() => setDialogOpen(false)} onSaved={load} />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle>Delete License</DialogTitle>
        <DialogContent>
          <Typography>Delete <strong>{deleteTarget?.license_number || 'this license'}</strong> for <strong>{deleteTarget?.operator_name}</strong>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={async () => {
            await del(`/licenses/${deleteTarget.license_id}`).catch(() => {});
            setDeleteTarget(null); load();
          }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
