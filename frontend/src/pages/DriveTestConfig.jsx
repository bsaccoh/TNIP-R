import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Grid, TextField, Button,
  Alert, Divider, Slider, Chip,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import SpeedIcon from '@mui/icons-material/Speed';
import TuneIcon from '@mui/icons-material/Tune';
import { get, put } from '../api/client';
import { Loading } from '../components/ui';

export default function DriveTestConfig() {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    get('/drive-tests/config').then((r) => setConfig(r.data)).catch(() => setConfig({}));
  }, []);

  const update = (key, val) => setConfig((c) => ({ ...c, [key]: val }));

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await put('/drive-tests/config', config);
      setConfig(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (!config) return <Loading height={400} />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1} alignItems="center">
          <SettingsIcon color="primary" />
          <Typography variant="h5">Drive Test Configuration</Typography>
        </Stack>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </Stack>

      {saved && <Alert severity="success">Configuration saved successfully.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      {/* Compliance Thresholds */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <SignalCellularAltIcon color="primary" />
            <Typography variant="h6">Compliance Thresholds</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Samples below these values are flagged as non-compliant in drive test analysis.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>RSRP Threshold</Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Slider value={config.rsrp_threshold} onChange={(_, v) => update('rsrp_threshold', v)}
                  min={-120} max={-70} step={5}
                  marks={[{ value: -120, label: '-120' }, { value: -100, label: '-100' }, { value: -70, label: '-70' }]}
                  valueLabelDisplay="on" valueLabelFormat={(v) => `${v} dBm`} />
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>RSRQ Threshold</Typography>
              <Slider value={config.rsrq_threshold} onChange={(_, v) => update('rsrq_threshold', v)}
                min={-20} max={0} step={1}
                marks={[{ value: -20, label: '-20' }, { value: -15, label: '-15' }, { value: 0, label: '0' }]}
                valueLabelDisplay="on" valueLabelFormat={(v) => `${v} dB`} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>SINR Threshold</Typography>
              <Slider value={config.sinr_threshold} onChange={(_, v) => update('sinr_threshold', v)}
                min={-5} max={20} step={1}
                marks={[{ value: -5, label: '-5' }, { value: 0, label: '0' }, { value: 20, label: '20' }]}
                valueLabelDisplay="on" valueLabelFormat={(v) => `${v} dB`} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>DL Throughput Threshold</Typography>
              <Slider value={config.dl_threshold} onChange={(_, v) => update('dl_threshold', v)}
                min={500} max={20000} step={500}
                marks={[{ value: 500, label: '500' }, { value: 2000, label: '2000' }, { value: 20000, label: '20000' }]}
                valueLabelDisplay="on" valueLabelFormat={(v) => `${v} kbps`} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>UL Throughput Threshold</Typography>
              <Slider value={config.ul_threshold} onChange={(_, v) => update('ul_threshold', v)}
                min={100} max={5000} step={100}
                marks={[{ value: 100, label: '100' }, { value: 500, label: '500' }, { value: 5000, label: '5000' }]}
                valueLabelDisplay="on" valueLabelFormat={(v) => `${v} kbps`} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Coverage Target */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <SpeedIcon color="primary" />
            <Typography variant="h6">Coverage Targets</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Operators should achieve this percentage of samples passing the RSRP threshold.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>Coverage Target (%)</Typography>
              <Slider value={config.coverage_target} onChange={(_, v) => update('coverage_target', v)}
                min={70} max={100} step={1}
                marks={[{ value: 70, label: '70%' }, { value: 95, label: '95%' }, { value: 100, label: '100%' }]}
                valueLabelDisplay="on" valueLabelFormat={(v) => `${v}%`} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Analysis Settings */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <TuneIcon color="primary" />
            <Typography variant="h6">Analysis Settings</Typography>
          </Stack>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <TextField size="small" fullWidth type="number" label="Gap Min Samples"
                helperText="Minimum consecutive weak samples to flag as a coverage gap"
                value={config.gap_min_samples} onChange={(e) => update('gap_min_samples', Number(e.target.value))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField size="small" fullWidth type="number" label="Segment Size (samples)"
                helperText="Number of samples per route segment in analysis"
                value={config.segment_size} onChange={(e) => update('segment_size', Number(e.target.value))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField size="small" fullWidth type="number" label="Nearby Sites Radius (km)"
                helperText="Search radius for cell towers near drive test route"
                inputProps={{ step: 0.5 }}
                value={config.nearby_radius_km} onChange={(e) => update('nearby_radius_km', Number(e.target.value))} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Current Values */}
      <Card>
        <CardContent>
          <Typography variant="subtitle2" mb={1}>Current Saved Configuration</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label={`RSRP: ${config.rsrp_threshold} dBm`} size="small" variant="outlined" />
            <Chip label={`RSRQ: ${config.rsrq_threshold} dB`} size="small" variant="outlined" />
            <Chip label={`SINR: ${config.sinr_threshold} dB`} size="small" variant="outlined" />
            <Chip label={`DL: ${config.dl_threshold} kbps`} size="small" variant="outlined" />
            <Chip label={`UL: ${config.ul_threshold} kbps`} size="small" variant="outlined" />
            <Chip label={`Target: ${config.coverage_target}%`} size="small" color="primary" variant="outlined" />
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
