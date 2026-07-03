import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Grid, TextField, Button,
  Alert, Slider, Chip, alpha, Tooltip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import WifiIcon from '@mui/icons-material/Wifi';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import GridViewIcon from '@mui/icons-material/GridView';
import RadarIcon from '@mui/icons-material/Radar';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { get, put } from '../api/client';
import TuneIcon from '@mui/icons-material/Tune';
import PageHeader from '../components/PageHeader';
import { Loading } from '../components/ui';

/* ── per-metric visual config ───────────────────────────────────────────── */
const METRICS = [
  {
    key: 'rsrp_threshold', label: 'RSRP', unit: 'dBm',
    min: -120, max: -70, step: 5, color: '#3da9fc',
    icon: <SignalCellularAltIcon />,
    desc: 'Reference Signal Received Power — minimum acceptable signal level',
    bands: [
      { from: -120, to: -100, color: '#e0413b', label: 'Poor' },
      { from: -100, to: -90,  color: '#e6a700', label: 'Fair' },
      { from: -90,  to: -80,  color: '#3da9fc', label: 'Good' },
      { from: -80,  to: -70,  color: '#2e9e5b', label: 'Excellent' },
    ],
  },
  {
    key: 'rsrq_threshold', label: 'RSRQ', unit: 'dB',
    min: -20, max: 0, step: 1, color: '#ef6c00',
    icon: <NetworkCheckIcon />,
    desc: 'Reference Signal Received Quality — signal quality floor',
    bands: [
      { from: -20, to: -15, color: '#e0413b', label: 'Poor' },
      { from: -15, to: -10, color: '#e6a700', label: 'Fair' },
      { from: -10, to: -5,  color: '#3da9fc', label: 'Good' },
      { from: -5,  to: 0,   color: '#2e9e5b', label: 'Excellent' },
    ],
  },
  {
    key: 'sinr_threshold', label: 'SINR', unit: 'dB',
    min: -5, max: 20, step: 1, color: '#2e9e5b',
    icon: <WifiIcon />,
    desc: 'Signal to Interference + Noise Ratio — interference tolerance',
    bands: [
      { from: -5, to: 0,  color: '#e0413b', label: 'Poor' },
      { from: 0,  to: 7,  color: '#e6a700', label: 'Fair' },
      { from: 7,  to: 13, color: '#3da9fc', label: 'Good' },
      { from: 13, to: 20, color: '#2e9e5b', label: 'Excellent' },
    ],
  },
  {
    key: 'dl_threshold', label: 'DL Throughput', unit: 'kbps',
    min: 500, max: 20000, step: 500, color: '#9c27b0',
    icon: <DownloadIcon />,
    desc: 'Minimum downlink speed required for compliance',
    bands: [
      { from: 500,   to: 2000,  color: '#e0413b', label: 'Poor' },
      { from: 2000,  to: 5000,  color: '#e6a700', label: 'Fair' },
      { from: 5000,  to: 10000, color: '#3da9fc', label: 'Good' },
      { from: 10000, to: 20000, color: '#2e9e5b', label: 'Excellent' },
    ],
  },
  {
    key: 'ul_threshold', label: 'UL Throughput', unit: 'kbps',
    min: 100, max: 5000, step: 100, color: '#00acc1',
    icon: <UploadIcon />,
    desc: 'Minimum uplink speed required for compliance',
    bands: [
      { from: 100,  to: 500,  color: '#e0413b', label: 'Poor' },
      { from: 500,  to: 1000, color: '#e6a700', label: 'Fair' },
      { from: 1000, to: 2000, color: '#3da9fc', label: 'Good' },
      { from: 2000, to: 5000, color: '#2e9e5b', label: 'Excellent' },
    ],
  },
];

const ANALYSIS_FIELDS = [
  {
    key: 'gap_min_samples', label: 'Gap Min Samples', icon: <FindInPageIcon />,
    color: '#e6a700', desc: 'Consecutive weak samples required to flag a coverage gap',
  },
  {
    key: 'segment_size', label: 'Segment Size', unit: 'samples', icon: <GridViewIcon />,
    color: '#3da9fc', desc: 'Samples per route segment for heatmap analysis',
  },
  {
    key: 'nearby_radius_km', label: 'Nearby Sites Radius', unit: 'km', icon: <RadarIcon />,
    color: '#2e9e5b', desc: 'Search radius for cell towers near route', step: 0.5,
  },
];

/* ── threshold band bar ─────────────────────────────────────────────────── */
function BandBar({ bands, value, min, max }) {
  const total = max - min;
  const thumbPct = ((value - min) / total) * 100;
  return (
    <Box sx={{ position: 'relative', height: 8, borderRadius: 4, overflow: 'hidden', mt: 1 }}>
      <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
        {bands.map((b) => (
          <Box key={b.label}
            sx={{ flex: (b.to - b.from) / total, bgcolor: b.color, opacity: 0.55 }} />
        ))}
      </Box>
      {/* thumb marker */}
      <Box sx={{
        position: 'absolute', top: '50%', left: `${thumbPct}%`,
        transform: 'translate(-50%, -50%)',
        width: 14, height: 14, borderRadius: '50%',
        bgcolor: '#fff', border: '2.5px solid',
        borderColor: (() => {
          const band = bands.find(b => value >= b.from && value < b.to) ?? bands[bands.length - 1];
          return band.color;
        })(),
        boxShadow: '0 0 6px rgba(0,0,0,.6)',
        zIndex: 1,
      }} />
    </Box>
  );
}

/* ── single metric card ─────────────────────────────────────────────────── */
function MetricCard({ m, value, onChange }) {
  const activeBand = m.bands.find(b => value >= b.from && value < b.to) ?? m.bands[m.bands.length - 1];
  return (
    <Card sx={{
      height: '100%',
      border: `1px solid ${alpha(m.color, 0.25)}`,
      borderLeft: `4px solid ${m.color}`,
      position: 'relative', overflow: 'visible',
    }}>
      <CardContent sx={{ pb: '16px !important' }}>
        {/* header */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{
              width: 40, height: 40, borderRadius: 2,
              bgcolor: alpha(m.color, 0.15),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: m.color, flexShrink: 0,
            }}>
              {m.icon}
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>{m.label}</Typography>
              <Typography variant="caption" color="text.secondary">{m.desc}</Typography>
            </Box>
          </Stack>
          <Chip
            label={activeBand.label}
            size="small"
            sx={{ bgcolor: alpha(activeBand.color, 0.18), color: activeBand.color, fontWeight: 700, fontSize: 11 }}
          />
        </Stack>

        {/* big value */}
        <Box sx={{
          bgcolor: alpha(m.color, 0.07), borderRadius: 2, p: 1.5, mb: 2,
          display: 'flex', alignItems: 'baseline', gap: 0.5,
        }}>
          <Typography variant="h4" fontWeight={800} sx={{ color: m.color, lineHeight: 1 }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>{m.unit}</Typography>
        </Box>

        {/* slider */}
        <Slider
          value={value}
          onChange={(_, v) => onChange(v)}
          min={m.min} max={m.max} step={m.step}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `${v} ${m.unit}`}
          sx={{
            color: m.color, mt: 0.5,
            '& .MuiSlider-thumb': { width: 18, height: 18 },
            '& .MuiSlider-rail': { opacity: 0.25 },
          }}
        />
        <Stack direction="row" justifyContent="space-between" sx={{ mt: -0.5 }}>
          <Typography variant="caption" color="text.secondary">{m.min} {m.unit}</Typography>
          <Typography variant="caption" color="text.secondary">{m.max} {m.unit}</Typography>
        </Stack>

        {/* band bar */}
        <BandBar bands={m.bands} value={value} min={m.min} max={m.max} />
        <Stack direction="row" justifyContent="space-between" mt={0.75}>
          {m.bands.map(b => (
            <Typography key={b.label} variant="caption" sx={{ color: b.color, fontSize: 9, fontWeight: 600 }}>
              {b.label}
            </Typography>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

/* ── main page ──────────────────────────────────────────────────────────── */
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ── page header ── */}
      <Box>
        <PageHeader
          icon={<TuneIcon />}
          title="Drive Test Configuration"
          subtitle="Set compliance thresholds and analysis parameters for drive test evaluation"
          actions={
            <Button
              variant="contained"
              size="small"
              color={saved ? 'success' : 'primary'}
              startIcon={saving ? null : saved ? <CheckCircleIcon /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Configuration'}
            </Button>
          }
        />
        {saved && (
          <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
            Configuration saved successfully.
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      </Box>

      {/* ── section label ── */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 4, height: 22, borderRadius: 2, bgcolor: '#3da9fc' }} />
        <Typography variant="subtitle1" fontWeight={700}>Compliance Thresholds</Typography>
        <Typography variant="caption" color="text.secondary">— samples below these values are flagged as non-compliant</Typography>
      </Stack>

      {/* ── metric cards ── */}
      <Grid container spacing={2}>
        {METRICS.map((m) => (
          <Grid key={m.key} item xs={12} sm={6} lg={4}>
            <MetricCard m={m} value={config[m.key] ?? 0} onChange={(v) => update(m.key, v)} />
          </Grid>
        ))}
      </Grid>

      {/* ── coverage target ── */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 4, height: 22, borderRadius: 2, bgcolor: '#ff7900' }} />
        <Typography variant="subtitle1" fontWeight={700}>Coverage Target</Typography>
        <Typography variant="caption" color="text.secondary">— minimum % of samples that must pass the RSRP threshold</Typography>
      </Stack>

      <Card sx={{ border: '1px solid', borderColor: alpha('#ff7900', 0.25), borderLeft: '4px solid #ff7900' }}>
        <CardContent>
          <Grid container spacing={4} alignItems="center">
            {/* ring */}
            <Grid item xs={12} sm="auto">
              <Box sx={{ position: 'relative', width: 120, height: 120, mx: 'auto' }}>
                <svg viewBox="0 0 120 120" width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,121,0,0.15)" strokeWidth="12" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#ff7900" strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - (config.coverage_target ?? 95) / 100)}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.3s' }} />
                </svg>
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h4" fontWeight={800} sx={{ color: '#ff7900', lineHeight: 1 }}>
                    {config.coverage_target ?? 95}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>%</Typography>
                </Box>
              </Box>
            </Grid>

            {/* slider */}
            <Grid item xs={12} sm>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <TrackChangesIcon sx={{ color: '#ff7900', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={700}>Coverage Target (%)</Typography>
                <Chip
                  size="small"
                  label={(config.coverage_target ?? 95) >= 95 ? 'Strict' : (config.coverage_target ?? 95) >= 85 ? 'Standard' : 'Lenient'}
                  sx={{
                    bgcolor: alpha((config.coverage_target ?? 95) >= 95 ? '#2e9e5b' : (config.coverage_target ?? 95) >= 85 ? '#e6a700' : '#e0413b', 0.15),
                    color: (config.coverage_target ?? 95) >= 95 ? '#2e9e5b' : (config.coverage_target ?? 95) >= 85 ? '#e6a700' : '#e0413b',
                    fontWeight: 700, fontSize: 11,
                  }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Operators must achieve this percentage of drive-test samples above the RSRP threshold to pass compliance checks.
              </Typography>
              <Slider
                value={config.coverage_target ?? 95}
                onChange={(_, v) => update('coverage_target', v)}
                min={70} max={100} step={1}
                marks={[{ value: 70, label: '70%' }, { value: 80, label: '80%' }, { value: 90, label: '90%' }, { value: 95, label: '95%' }, { value: 100, label: '100%' }]}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v}%`}
                sx={{ color: '#ff7900', '& .MuiSlider-thumb': { width: 18, height: 18 } }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── analysis settings ── */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 4, height: 22, borderRadius: 2, bgcolor: '#8b5cf6' }} />
        <Typography variant="subtitle1" fontWeight={700}>Analysis Settings</Typography>
        <Typography variant="caption" color="text.secondary">— parameters for route segmentation and gap detection</Typography>
      </Stack>

      <Grid container spacing={2}>
        {ANALYSIS_FIELDS.map((f) => (
          <Grid key={f.key} item xs={12} sm={4}>
            <Card sx={{ height: '100%', border: `1px solid ${alpha(f.color, 0.25)}`, borderLeft: `4px solid ${f.color}` }}>
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: 2,
                    bgcolor: alpha(f.color, 0.15), color: f.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {f.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>{f.label}</Typography>
                    {f.unit && <Typography variant="caption" color="text.secondary">{f.unit}</Typography>}
                  </Box>
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>{f.desc}</Typography>
                <TextField
                  size="small" fullWidth type="number"
                  value={config[f.key] ?? ''}
                  onChange={(e) => update(f.key, Number(e.target.value))}
                  inputProps={{ step: f.step ?? 1 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': { borderColor: f.color },
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── summary strip ── */}
      <Card sx={{ bgcolor: alpha('#3da9fc', 0.05), border: '1px solid', borderColor: alpha('#3da9fc', 0.2) }}>
        <CardContent sx={{ py: '12px !important' }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={1}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mr: 0.5 }}>
              Active thresholds:
            </Typography>
            {[
              { label: `RSRP ≥ ${config.rsrp_threshold} dBm`, color: '#3da9fc' },
              { label: `RSRQ ≥ ${config.rsrq_threshold} dB`, color: '#ef6c00' },
              { label: `SINR ≥ ${config.sinr_threshold} dB`, color: '#2e9e5b' },
              { label: `DL ≥ ${config.dl_threshold} kbps`, color: '#9c27b0' },
              { label: `UL ≥ ${config.ul_threshold} kbps`, color: '#00acc1' },
              { label: `Target ${config.coverage_target}%`, color: '#ff7900' },
            ].map(({ label, color }) => (
              <Chip key={label} label={label} size="small"
                sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 700, fontSize: 11, border: `1px solid ${alpha(color, 0.3)}` }} />
            ))}
          </Stack>
        </CardContent>
      </Card>

    </Box>
  );
}
