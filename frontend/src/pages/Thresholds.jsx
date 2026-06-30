import { useEffect, useState, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Table, TableHead, TableBody,
  TableRow, TableCell, TablePagination, Chip, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, Alert, Switch, FormControlLabel, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TuneIcon from '@mui/icons-material/Tune';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import { get, post, put, del } from '../api/client';
import { Loading, EmptyState } from '../components/ui';

const COMPARATOR_LABEL = { GTE: '≥', LTE: '≤', GT: '>', LT: '<' };
const COMPARATOR_HINT = {
  GTE: 'Value must be ≥ threshold (e.g. success rate)',
  LTE: 'Value must be ≤ threshold (e.g. drop rate)',
  GT: 'Value must be > threshold', LT: 'Value must be < threshold',
};

const blank = {
  kpi_id: '', technology_id: '', operator_id: '',
  comparator: 'GTE', required_value: '', warning_margin: '0',
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: '', is_active: true,
};

function ThresholdDialog({ open, row, kpis, operators, technologies, onClose, onSaved }) {
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(row);

  useEffect(() => {
    if (open) {
      setForm(row ? {
        kpi_id: row.kpi_id, technology_id: row.technology_id ?? '',
        operator_id: row.operator_id ?? '', comparator: row.comparator,
        required_value: row.required_value, warning_margin: row.warning_margin ?? 0,
        effective_from: row.effective_from?.slice(0, 10) ?? '',
        effective_to: row.effective_to?.slice(0, 10) ?? '', is_active: Boolean(row.is_active),
      } : { ...blank });
      setErr('');
    }
  }, [open, row]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.kpi_id || form.required_value === '') { setErr('KPI and required value are mandatory.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        kpi_id: Number(form.kpi_id),
        technology_id: form.technology_id ? Number(form.technology_id) : null,
        operator_id: form.operator_id ? Number(form.operator_id) : null,
        comparator: form.comparator,
        required_value: Number(form.required_value),
        warning_margin: Number(form.warning_margin) || 0,
        effective_from: form.effective_from,
        effective_to: form.effective_to || null,
        is_active: form.is_active,
      };
      if (isEdit) await put(`/thresholds/${row.threshold_id}`, payload);
      else await post('/thresholds', payload);
      onSaved(); onClose();
    } catch (e) {
      setErr(e?.response?.data?.error?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Threshold' : 'New Threshold'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {err && <Alert severity="error">{err}</Alert>}
        <FormControl size="small" fullWidth>
          <InputLabel>KPI *</InputLabel>
          <Select label="KPI *" value={form.kpi_id} onChange={set('kpi_id')}>
            {kpis.map((k) => <MenuItem key={k.kpi_id} value={k.kpi_id}>{k.kpi_key} — {k.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" fullWidth>
            <InputLabel>Technology (optional)</InputLabel>
            <Select label="Technology (optional)" value={form.technology_id} onChange={set('technology_id')}>
              <MenuItem value="">All Technologies</MenuItem>
              {technologies.map((t) => <MenuItem key={t.technology_id} value={t.technology_id}>{t.tech_key} — {t.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Operator (optional)</InputLabel>
            <Select label="Operator (optional)" value={form.operator_id} onChange={set('operator_id')}>
              <MenuItem value="">All Operators (global)</MenuItem>
              {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
        <FormControl size="small" fullWidth>
          <InputLabel>Comparator</InputLabel>
          <Select label="Comparator" value={form.comparator} onChange={set('comparator')}>
            {Object.entries(COMPARATOR_LABEL).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v} ({COMPARATOR_HINT[k]})</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Stack direction="row" spacing={2}>
          <TextField size="small" label="Required Value *" type="number" fullWidth
            value={form.required_value} onChange={set('required_value')} />
          <TextField size="small" label="Warning Margin" type="number" fullWidth
            value={form.warning_margin} onChange={set('warning_margin')}
            helperText="Triggers WARNING instead of FAIL" />
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField size="small" label="Effective From" type="date" fullWidth
            InputLabelProps={{ shrink: true }} value={form.effective_from} onChange={set('effective_from')} />
          <TextField size="small" label="Effective To (optional)" type="date" fullWidth
            InputLabelProps={{ shrink: true }} value={form.effective_to} onChange={set('effective_to')} />
        </Stack>
        <FormControlLabel
          control={<Switch checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />}
          label="Active" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Thresholds() {
  const [rows, setRows] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [operators, setOperators] = useState([]);
  const [technologies] = useState([
    { technology_id: 1, tech_key: '2G', name: 'GSM' },
    { technology_id: 2, tech_key: '3G', name: 'UMTS' },
    { technology_id: 3, tech_key: '4G', name: 'LTE' },
    { technology_id: 4, tech_key: '5G', name: 'NR' },
  ]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editRow, setEditRow] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => get('/thresholds').then((r) => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => {
    load();
    get('/kpis/definitions').then((r) => setKpis(r.data || []));
    get('/operators').then((r) => setOperators(r.data || []));
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.toLowerCase();
    return rows.filter((r) =>
      !q || (r.kpi_key || '').toLowerCase().includes(q) ||
      (r.kpi_name || '').toLowerCase().includes(q) ||
      (r.operator_name || '').toLowerCase().includes(q) ||
      (r.tech_key || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (!rows) return <Loading />;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TuneIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>KPI Thresholds</Typography>
          <Chip size="small" label={`${rows.length} total`} />
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditRow(null); setDialogOpen(true); }}>
          Add Threshold
        </Button>
      </Stack>

      <Card>
        <CardContent>
          <TextField size="small" placeholder="Search KPI, operator, technology…" sx={{ mb: 2, width: 320 }}
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />

          {!filtered.length ? <EmptyState message="No thresholds found." /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>KPI</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Technology</TableCell>
                  <TableCell>Operator</TableCell>
                  <TableCell>Threshold</TableCell>
                  <TableCell>Margin</TableCell>
                  <TableCell>Effective</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.slice(page * 10, page * 10 + 10).map((r) => (
                  <TableRow key={r.threshold_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{r.kpi_key}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.kpi_name}</Typography>
                    </TableCell>
                    <TableCell><Chip size="small" label={r.category || '—'} variant="outlined" /></TableCell>
                    <TableCell>{r.tech_key || <Typography variant="caption" color="text.secondary">All</Typography>}</TableCell>
                    <TableCell>{r.operator_name || <Typography variant="caption" color="text.secondary">Global</Typography>}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {COMPARATOR_LABEL[r.comparator]} {r.required_value} {r.unit}
                      </Typography>
                    </TableCell>
                    <TableCell>±{r.warning_margin}</TableCell>
                    <TableCell>
                      <Typography variant="caption">{r.effective_from?.slice(0, 10)}</Typography>
                      {r.effective_to && <Typography variant="caption" color="text.secondary"> → {r.effective_to?.slice(0, 10)}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={r.is_active ? 'Active' : 'Inactive'}
                        color={r.is_active ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => { setEditRow(r); setDialogOpen(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(r)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filtered.length > 10 && (
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              rowsPerPage={10}
              rowsPerPageOptions={[10]}
              onPageChange={(_, p) => setPage(p)}
            />
          )}
        </CardContent>
      </Card>

      <ThresholdDialog open={dialogOpen} row={editRow} kpis={kpis} operators={operators}
        technologies={technologies} onClose={() => setDialogOpen(false)} onSaved={load} />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle>Delete Threshold</DialogTitle>
        <DialogContent>
          <Typography>Delete threshold for <strong>{deleteTarget?.kpi_key}</strong>
            {deleteTarget?.operator_name ? ` (${deleteTarget.operator_name})` : ' (global)'}? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={async () => {
            await del(`/thresholds/${deleteTarget.threshold_id}`).catch(() => {});
            setDeleteTarget(null); load();
          }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
