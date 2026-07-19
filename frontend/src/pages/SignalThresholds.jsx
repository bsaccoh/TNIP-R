import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Grid, TextField, Button,
  Alert, IconButton, Chip, Divider, Select, MenuItem, FormControl,
  InputLabel, Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { get, put } from '../api/client';
import { Loading } from '../components/ui';

const COLORS = ['#2e9e5b', '#8bc34a', '#e6a700', '#ef6c00', '#e0413b', '#9c27b0', '#1976d2'];

function BinRow({ bin, index, onChange, onRemove, isMaxBased }) {
  const key = isMaxBased ? 'max' : 'min';
  return (
    <TableRow>
      <TableCell sx={{ p: 0.5, width: 40 }}>
        <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: bin.color, cursor: 'pointer', position: 'relative' }}>
          <input
            type="color"
            value={bin.color}
            onChange={(e) => onChange(index, 'color', e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
          />
        </Box>
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <TextField size="small" variant="outlined" value={bin[key] ?? ''} type="number"
          onChange={(e) => onChange(index, key, e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ width: 100 }} inputProps={{ style: { fontSize: 13, padding: '6px 8px' } }} />
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <TextField size="small" variant="outlined" value={bin.label}
          onChange={(e) => onChange(index, 'label', e.target.value)}
          sx={{ width: '100%' }} inputProps={{ style: { fontSize: 13, padding: '6px 8px' } }} />
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        <TextField size="small" variant="outlined" value={bin.tier}
          onChange={(e) => onChange(index, 'tier', e.target.value)}
          sx={{ width: 120 }} inputProps={{ style: { fontSize: 13, padding: '6px 8px' } }} />
      </TableCell>
      <TableCell sx={{ p: 0.5, width: 40 }}>
        <IconButton size="small" color="error" onClick={() => onRemove(index)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

function ThresholdCard({ threshold, onSave }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(threshold.label);
  const [unit, setUnit] = useState(threshold.unit);
  const [passValue, setPassValue] = useState(threshold.pass_value);
  const [passDir, setPassDir] = useState(threshold.pass_direction);
  const [bins, setBins] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const parsed = typeof threshold.bins === 'string' ? JSON.parse(threshold.bins) : threshold.bins;
    setBins(parsed || []);
    setLabel(threshold.label);
    setUnit(threshold.unit);
    setPassValue(threshold.pass_value);
    setPassDir(threshold.pass_direction);
  }, [threshold]);

  const isMaxBased = bins.length > 0 && bins[0].max != null;

  const handleBinChange = (idx, field, value) => {
    setBins((prev) => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };

  const handleRemove = (idx) => {
    setBins((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAdd = () => {
    const newBin = isMaxBased
      ? { max: 0, color: COLORS[bins.length % COLORS.length], label: 'New Range', tier: 'New' }
      : { min: 0, color: COLORS[bins.length % COLORS.length], label: 'New Range', tier: 'New' };
    setBins((prev) => [...prev, newBin]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(threshold.id, { label, unit, pass_value: passValue, pass_direction: passDir, bins });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const passLabel = passDir === 'gte' ? `${label} >= ${passValue} ${unit}` : `${label} <= ${passValue} ${unit}`;

  return (
    <Card sx={{ border: editing ? 2 : 1, borderColor: editing ? 'primary.main' : 'divider' }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <Chip size="small" label={threshold.technology} color="primary" variant="outlined" />
          <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>{label}</Typography>
          {!editing && (
            <IconButton size="small" onClick={() => setEditing(true)}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>

        {!editing ? (
          <>
            <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
              {bins.map((bin, i) => (
                <Chip
                  key={i}
                  size="small"
                  label={`${bin.tier}: ${bin.label}`}
                  sx={{ bgcolor: bin.color + '33', color: bin.color, fontWeight: 600, fontSize: 11 }}
                />
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Pass threshold: {passLabel}
            </Typography>
          </>
        ) : (
          <>
            <Grid container spacing={1.5} mb={2}>
              <Grid item xs={4}>
                <TextField size="small" label="Label" fullWidth value={label}
                  onChange={(e) => setLabel(e.target.value)} />
              </Grid>
              <Grid item xs={2}>
                <TextField size="small" label="Unit" fullWidth value={unit}
                  onChange={(e) => setUnit(e.target.value)} />
              </Grid>
              <Grid item xs={3}>
                <TextField size="small" label="Pass Value" fullWidth type="number" value={passValue}
                  onChange={(e) => setPassValue(Number(e.target.value))} />
              </Grid>
              <Grid item xs={3}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Direction</InputLabel>
                  <Select label="Direction" value={passDir} onChange={(e) => setPassDir(e.target.value)}>
                    <MenuItem value="gte">{'>='} (higher is better)</MenuItem>
                    <MenuItem value="lte">{'<='} (lower is better)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
              Bins (ordered from best to worst)
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ p: 0.5, width: 40 }}>Color</TableCell>
                  <TableCell sx={{ p: 0.5 }}>{isMaxBased ? 'Max' : 'Min'}</TableCell>
                  <TableCell sx={{ p: 0.5 }}>Label</TableCell>
                  <TableCell sx={{ p: 0.5 }}>Rating</TableCell>
                  <TableCell sx={{ p: 0.5, width: 40 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {bins.map((bin, i) => (
                  <BinRow key={i} bin={bin} index={i} onChange={handleBinChange}
                    onRemove={handleRemove} isMaxBased={isMaxBased} />
                ))}
              </TableBody>
            </Table>

            <Stack direction="row" spacing={1} mt={1.5}>
              <Button size="small" startIcon={<AddIcon />} onClick={handleAdd}>Add Bin</Button>
              <Box sx={{ flex: 1 }} />
              <Button size="small" onClick={() => { setEditing(false); setBins(typeof threshold.bins === 'string' ? JSON.parse(threshold.bins) : threshold.bins); }}>
                Cancel
              </Button>
              <Button size="small" variant="contained" startIcon={<SaveIcon />}
                disabled={saving} onClick={handleSave}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function SignalThresholds() {
  const [thresholds, setThresholds] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    get('/drive-tests/signal-thresholds')
      .then((r) => setThresholds(r.data || []))
      .catch(() => setThresholds([]));
  }, []);

  const handleSave = async (id, data) => {
    const r = await put(`/drive-tests/signal-thresholds/${id}`, data);
    setThresholds((prev) => prev.map((t) => t.id === id ? r.data : t));
    setToast('Threshold updated successfully');
  };

  if (!thresholds) return <Loading height={400} />;

  const grouped = {};
  for (const t of thresholds) {
    const key = t.technology === 'ALL' ? 'Throughput' : t.technology;
    (grouped[key] = grouped[key] || []).push(t);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <TuneIcon color="primary" />
        <Typography variant="h5">Signal Thresholds</Typography>
      </Stack>

      <Alert severity="info" sx={{ py: 0.5 }}>
        Configure signal quality bins and pass thresholds used in Cluster Map and Throughput Analysis.
        Changes apply immediately to all analysis pages.
      </Alert>

      {Object.entries(grouped).map(([tech, items]) => (
        <Box key={tech}>
          <Typography variant="overline" color="text.secondary" display="block" mb={1}>
            {tech}
          </Typography>
          <Grid container spacing={2}>
            {items.map((t) => (
              <Grid item xs={12} md={6} key={t.id}>
                <ThresholdCard threshold={t} onSave={handleSave} />
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')}
        message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}
