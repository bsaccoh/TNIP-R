import { useEffect, useState } from 'react';
import {
  Card, CardContent, Typography, Box, Table, TableHead, TableBody, TableRow,
  TableCell, TablePagination, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, Alert, IconButton, Stack, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import { get, post } from '../api/client';
import { Loading, EmptyState } from '../components/ui';

export default function KpiBuilder() {
  const [kpis, setKpis] = useState(null);
  const [operators, setOperators] = useState([]);
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [filterOp, setFilterOp] = useState('ALL');
  const [page, setPage] = useState(0);

  const fetchKpis = () => get('/kpis/definitions').then((r) => setKpis(r.data || [])).catch(() => setKpis([]));
  useEffect(() => {
    fetchKpis();
    get('/operators').then((r) => setOperators(r.data?.rows || r.data || [])).catch(() => {});
  }, []);

  const filtered = (kpis || []).filter((k) => {
    if (filterOp === 'ALL') return true;
    const ids = (k.operator_ids || '').split(',').map(Number);
    return ids.includes(Number(filterOp)) || !k.operator_ids;
  });

  const pageRows = filtered.slice(page * 10, page * 10 + 10);

  if (!kpis) return <Loading />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h5">KPI Formula Builder</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Operator</InputLabel>
            <Select label="Operator" value={filterOp} onChange={(e) => { setFilterOp(e.target.value); setPage(0); }}>
              <MenuItem value="ALL">All Operators</MenuItem>
              {operators.map((o) => (
                <MenuItem key={o.operator_id} value={String(o.operator_id)}>{o.operator_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
            Add KPI
          </Button>
        </Stack>
      </Stack>

      <Card>
        <CardContent>
          {!filtered.length ? <EmptyState message="No KPIs found." hint="Click 'Add KPI' to create one." /> : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell>KPI Key</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.map((k) => (
                    <TableRow key={k.kpi_id} hover>
                      <TableCell><Chip size="small" label={k.category || 'General'} /></TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{k.kpi_key}</TableCell>
                      <TableCell>{k.name}</TableCell>
                      <TableCell>{k.unit}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block' }}>
                          {k.description || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => setSelected(k)} color="primary" title="Edit formula">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
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

      {selected && (
        <FormulaEditorDialog kpi={selected} operators={operators} onClose={() => setSelected(null)} />
      )}
      {addOpen && (
        <AddKpiDialog onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); fetchKpis(); }} />
      )}
    </Box>
  );
}

function AddKpiDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({ kpi_key: '', name: '', unit: '%', category: 'Accessibility', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const categories = ['Accessibility', 'Retainability', 'Availability', 'Mobility', 'Integrity', 'Utilization', 'Custom'];

  const handleSave = async () => {
    if (!form.kpi_key || !form.name) { setError('KPI Key and Name are required'); return; }
    setSaving(true); setError('');
    try {
      await post('/kpis/definitions', form);
      onCreated();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New KPI Definition</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField label="KPI Key" required size="small" value={form.kpi_key}
            onChange={(e) => setForm({ ...form, kpi_key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
            helperText="Unique identifier, e.g. CSSR_3G" InputProps={{ sx: { fontFamily: 'monospace' } }} />
          <TextField label="Name" required size="small" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            helperText="Human-readable name" />
          <Stack direction="row" spacing={2}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Category</InputLabel>
              <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Unit</InputLabel>
              <Select label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {['%', 'ms', 'kbps', 'Mbps', 'count', 'ratio', 'dB', 'Erlang'].map((u) => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <TextField label="Description" size="small" multiline rows={2} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}

function FormulaEditorDialog({ kpi, operators, onClose }) {
  const [formula, setFormula] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [technologyId, setTechnologyId] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [formulas, setFormulas] = useState(null);

  useEffect(() => {
    get(`/kpis/definitions/${kpi.kpi_id}/formulas`).then((r) => setFormulas(r.data || [])).catch(() => setFormulas([]));
  }, [kpi.kpi_id]);

  const handleValidate = async () => {
    if (!formula.trim()) return;
    setTesting(true); setResult(null);
    try {
      await post('/kpis/validate', { expression: formula });
      setResult({ type: 'success', msg: 'Formula is valid!' });
    } catch (e) {
      setResult({ type: 'error', msg: e.response?.data?.error || e.message });
    } finally { setTesting(false); }
  };

  const handleSave = async () => {
    if (!formula.trim()) return;
    setSaving(true); setResult(null);
    try {
      const saved = await post('/kpis/formulas', {
        kpi_id: kpi.kpi_id,
        expression: formula,
        operator_id: operatorId || null,
        technology_id: technologyId || null,
      });
      setResult({ type: 'success', msg: 'Formula saved and activated!' });
      setFormulas((prev) => [saved.data, ...(prev || []).map((f) => ({ ...f, is_active: 0 }))]);
    } catch (e) {
      setResult({ type: 'error', msg: e.response?.data?.error || e.message });
    } finally { setSaving(false); }
  };

  const techs = [{ id: 1, key: '2G' }, { id: 2, key: '3G' }, { id: 3, key: '4G' }, { id: 4, key: '5G' }];

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Formula: {kpi.name} ({kpi.kpi_key})</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: 13 } }}>
            Write formulas using counter references: <code>c("COUNTER_KEY")</code>. Operators: +, -, *, /.
            Example: <code>c("RRC.SuccConnEstab") / c("RRC.AttConnEstab") * 100</code>
          </Alert>

          <Stack direction="row" spacing={2}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Operator (optional)</InputLabel>
              <Select label="Operator (optional)" value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
                <MenuItem value="">All Operators</MenuItem>
                {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Technology</InputLabel>
              <Select label="Technology" value={technologyId} onChange={(e) => setTechnologyId(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {techs.map((t) => <MenuItem key={t.id} value={t.id}>{t.key}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>

          <TextField label="Formula Expression" multiline rows={3} value={formula}
            onChange={(e) => setFormula(e.target.value)} fullWidth
            placeholder='c("L.E-RAB.SuccEst") / c("L.E-RAB.AttEst") * 100'
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: 13 } }} />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="outlined" startIcon={<PlayArrowIcon />} onClick={handleValidate}
              disabled={!formula.trim() || testing}>Validate</Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}
              disabled={!formula.trim() || saving}>Save Formula</Button>
          </Stack>

          {result && <Alert severity={result.type}>{result.msg}</Alert>}

          {/* Existing formulas */}
          {formulas?.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Existing Formulas</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Expression</TableCell>
                    <TableCell>Operator</TableCell>
                    <TableCell>Tech</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formulas.map((f) => (
                    <TableRow key={f.formula_id} hover sx={{ cursor: 'pointer' }}
                      onClick={() => { setFormula(f.expression); setOperatorId(f.operator_id || ''); setTechnologyId(f.technology_id || ''); }}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, maxWidth: 300 }}>
                        <Typography variant="caption" noWrap sx={{ fontFamily: 'monospace', display: 'block', maxWidth: 300 }}>
                          {f.expression}
                        </Typography>
                      </TableCell>
                      <TableCell>{f.operator_name || 'All'}</TableCell>
                      <TableCell>{f.tech_key || 'All'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={f.is_active ? 'Active' : 'Inactive'}
                          color={f.is_active ? 'success' : 'default'} sx={{ height: 20, fontSize: 10 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
