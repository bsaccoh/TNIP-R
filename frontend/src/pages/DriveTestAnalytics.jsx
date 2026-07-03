import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap, Circle } from 'react-leaflet';
import {
  Box, Card, CardContent, Typography, Stack, Grid, Chip, Alert, Tabs, Tab,
  FormControl, InputLabel, Select, MenuItem, Table, TableHead, TableBody,
  TableRow, TableCell, LinearProgress, Tooltip, Divider, Slider,
  TextField, ToggleButton, ToggleButtonGroup, Button, alpha, IconButton,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import WarningIcon from '@mui/icons-material/Warning';
import VerifiedIcon from '@mui/icons-material/Verified';
import SegmentIcon from '@mui/icons-material/Segment';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DownloadIcon from '@mui/icons-material/Download';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FilterListIcon from '@mui/icons-material/FilterList';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import { get } from '../api/client';
import { Loading, EmptyState } from '../components/ui';
import { exportCsv } from '../utils/csv';
import { colorFor } from '../theme';
import { useColorMode } from '../theme/ColorMode';

const RSRP_COLORS = [
  { min: -80,       color: '#2e9e5b', label: 'Excellent' },
  { min: -90,       color: '#8bc34a', label: 'Good'      },
  { min: -100,      color: '#e6a700', label: 'Fair'      },
  { min: -110,      color: '#ef6c00', label: 'Poor'      },
  { min: -Infinity, color: '#e0413b', label: 'No Signal' },
];

function rsrpColor(val) {
  if (val == null) return '#888';
  for (const r of RSRP_COLORS) { if (val >= r.min) return r.color; }
  return '#e0413b';
}

function rsrpLabel(val) {
  if (val == null) return '—';
  for (const r of RSRP_COLORS) { if (val >= r.min) return r.label; }
  return 'No Signal';
}

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom || 13, { duration: 1 }); }, [center, zoom, map]);
  return null;
}

/* ── Shared sub-components ──────────────────────────────────────────────── */
function StatCard({ label, value, unit, color, sub, accent }) {
  return (
    <Box sx={{
      p: 1.5, borderRadius: 2,
      bgcolor: accent ? alpha(accent, 0.07) : 'action.hover',
      border: accent ? `1px solid ${alpha(accent, 0.2)}` : '1px solid transparent',
    }}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="h6" fontWeight={800} sx={{ color: color || (accent || 'text.primary'), lineHeight: 1.2 }}>
        {value}
        {unit && <Typography component="span" variant="caption" ml={0.5} fontWeight={400}>{unit}</Typography>}
      </Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Box>
  );
}

function ComplianceBar({ label, pct, pass, total, color: forceColor }) {
  const color = forceColor || (pct >= 95 ? '#2e9e5b' : pct >= 80 ? '#e6a700' : '#e0413b');
  return (
    <Box mb={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">{pass}/{total}</Typography>
          <Chip size="small" label={`${pct}%`}
            sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: alpha(color, 0.15), color }} />
        </Stack>
      </Stack>
      <Box sx={{ position: 'relative', height: 8, borderRadius: 4, bgcolor: 'action.hover', overflow: 'hidden' }}>
        <Box sx={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`, borderRadius: 4,
          background: `linear-gradient(90deg, ${alpha(color, 0.6)}, ${color})`,
          transition: 'width 0.5s ease',
        }} />
      </Box>
    </Box>
  );
}

function CoverageDistBar({ dist, total }) {
  const items = [
    { label: 'Excellent', count: dist.excellent,  color: RSRP_COLORS[0].color },
    { label: 'Good',      count: dist.good,       color: RSRP_COLORS[1].color },
    { label: 'Fair',      count: dist.fair,       color: RSRP_COLORS[2].color },
    { label: 'Poor',      count: dist.poor,       color: RSRP_COLORS[3].color },
    { label: 'No Signal', count: dist.noSignal,   color: RSRP_COLORS[4].color },
  ];
  const t = total || 1;
  return (
    <Box>
      <Box sx={{ display: 'flex', height: 24, borderRadius: 2, overflow: 'hidden', mb: 1 }}>
        {items.map((c) => (
          <Tooltip key={c.label} title={`${c.label}: ${c.count} (${((c.count / t) * 100).toFixed(1)}%)`}>
            <Box sx={{ width: `${(c.count / t) * 100}%`, bgcolor: c.color, transition: 'width 0.3s' }} />
          </Tooltip>
        ))}
      </Box>
      <Stack direction="row" spacing={1.5} flexWrap="wrap">
        {items.map((c) => (
          <Stack key={c.label} direction="row" spacing={0.4} alignItems="center">
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ fontSize: 10 }}>
              {c.label} <strong>{((c.count / t) * 100).toFixed(1)}%</strong>
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

function SectionLabel({ children, color = '#3da9fc' }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
      <Box sx={{ width: 4, height: 18, borderRadius: 2, bgcolor: color, flexShrink: 0 }} />
      <Typography variant="subtitle2" fontWeight={700}>{children}</Typography>
    </Stack>
  );
}

/* ── Operator Comparison Tab ────────────────────────────────────────────── */
const OP_PAIR_COLORS = ['#3da9fc', '#ef6c00'];

function CompareTab({ tests, tileVariant }) {
  const [testA, setTestA] = useState('');
  const [testB, setTestB] = useState('');
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!testA || !testB || testA === testB) { setData(null); return; }
    setLoading(true);
    get(`/drive-tests/compare?ids=${testA},${testB}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [testA, testB]);

  const mapCenter = useMemo(() => {
    if (!data?.[0]?.samples?.length) return [8.45, -13.2];
    const s = data[0].samples;
    return [Number(s[Math.floor(s.length / 2)].latitude), Number(s[Math.floor(s.length / 2)].longitude)];
  }, [data]);

  /* compute head-to-head wins */
  const wins = useMemo(() => {
    if (!data || data.length < 2) return [0, 0];
    const rows = [
      [data[0].stats.avg_rsrp, data[1].stats.avg_rsrp, true],
      [data[0].stats.avg_sinr, data[1].stats.avg_sinr, true],
      [data[0].stats.avg_rsrq, data[1].stats.avg_rsrq, true],
      [data[0].stats.avg_dl,   data[1].stats.avg_dl,   true],
    ];
    let w = [0, 0];
    rows.forEach(([a, b, higher]) => {
      const av = Number(a), bv = Number(b);
      if (av === bv) return;
      if (higher ? av > bv : av < bv) w[0]++; else w[1]++;
    });
    return w;
  }, [data]);

  return (
    <Stack spacing={2.5}>
      {/* selector row */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <CompareArrowsIcon sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }} />
            {[{ label: 'Drive Test A', val: testA, set: setTestA, color: OP_PAIR_COLORS[0] },
              { label: 'Drive Test B', val: testB, set: setTestB, color: OP_PAIR_COLORS[1] }].map(({ label, val, set, color }) => (
              <FormControl key={label} size="small" fullWidth>
                <InputLabel sx={{ '&.Mui-focused': { color } }}>{label}</InputLabel>
                <Select label={label} value={val} onChange={(e) => set(e.target.value)}
                  sx={{ '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: color } }}>
                  {tests.map((t) => (
                    <MenuItem key={t.drive_test_id} value={t.drive_test_id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colorFor(t.operator_name), flexShrink: 0 }} />
                        <span>{t.operator_name} — {t.test_name}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {loading && <LinearProgress />}

      {/* winner banner */}
      {data && data.length === 2 && (
        <>
          {wins[0] !== wins[1] && (
            <Box sx={{
              borderRadius: 2, p: 2,
              background: `linear-gradient(135deg, ${alpha(OP_PAIR_COLORS[wins[0] > wins[1] ? 0 : 1], 0.15)}, transparent)`,
              border: `1px solid ${alpha(OP_PAIR_COLORS[wins[0] > wins[1] ? 0 : 1], 0.3)}`,
            }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <EmojiEventsIcon sx={{ color: '#e6a700', fontSize: 28 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">Overall Winner</Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: OP_PAIR_COLORS[wins[0] > wins[1] ? 0 : 1] }}>
                    {data[wins[0] > wins[1] ? 0 : 1].meta.operator_name}
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto' }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {[0, 1].map((i) => (
                      <Box key={i} sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight={900} sx={{ color: OP_PAIR_COLORS[i], lineHeight: 1 }}>{wins[i]}</Typography>
                        <Typography variant="caption" color="text.secondary">{data[i].meta.operator_name}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Box>
          )}

          {/* side-by-side operator cards */}
          <Grid container spacing={2}>
            {data.map((d, idx) => (
              <Grid item xs={12} md={6} key={idx}>
                <Card sx={{
                  border: `2px solid ${alpha(OP_PAIR_COLORS[idx], 0.4)}`,
                  borderTop: `4px solid ${OP_PAIR_COLORS[idx]}`,
                }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                      <Box sx={{
                        width: 10, height: 10, borderRadius: '50%',
                        bgcolor: OP_PAIR_COLORS[idx], flexShrink: 0,
                      }} />
                      <Chip label={d.meta.operator_name} size="small"
                        sx={{ bgcolor: alpha(OP_PAIR_COLORS[idx], 0.15), color: OP_PAIR_COLORS[idx], fontWeight: 700 }} />
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>{d.meta.test_name}</Typography>
                    </Stack>

                    <Grid container spacing={1} mb={2}>
                      <Grid item xs={4}>
                        <StatCard label="Avg RSRP" value={d.stats.avg_rsrp} unit="dBm"
                          color={rsrpColor(d.stats.avg_rsrp)} accent={rsrpColor(d.stats.avg_rsrp)} />
                      </Grid>
                      <Grid item xs={4}>
                        <StatCard label="Avg SINR" value={d.stats.avg_sinr} unit="dB" accent={OP_PAIR_COLORS[idx]} />
                      </Grid>
                      <Grid item xs={4}>
                        <StatCard label="Avg DL" value={d.stats.avg_dl ? Math.round(d.stats.avg_dl) : 'N/A'} unit="kbps" accent={OP_PAIR_COLORS[idx]} />
                      </Grid>
                      <Grid item xs={4}>
                        <StatCard label="Samples" value={d.stats.total_samples?.toLocaleString()} />
                      </Grid>
                      <Grid item xs={4}>
                        <StatCard label="Min RSRP" value={d.stats.min_rsrp} unit="dBm" color={rsrpColor(d.stats.min_rsrp)} />
                      </Grid>
                      <Grid item xs={4}>
                        <StatCard label="Max DL" value={d.stats.max_dl ? Math.round(d.stats.max_dl) : 'N/A'} unit="kbps" />
                      </Grid>
                    </Grid>

                    <SectionLabel color={OP_PAIR_COLORS[idx]}>Coverage Distribution</SectionLabel>
                    <CoverageDistBar
                      dist={{ excellent: d.stats.rsrp_excellent, good: d.stats.rsrp_good,
                              fair: d.stats.rsrp_fair, poor: d.stats.rsrp_poor, noSignal: d.stats.rsrp_no_signal }}
                      total={d.stats.total_samples} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* head-to-head table */}
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <SectionLabel color="#8b5cf6">Head-to-Head Comparison</SectionLabel>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
                    <TableCell>Metric</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: OP_PAIR_COLORS[0] }} />
                        <span>{data[0].meta.operator_name}</span>
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: OP_PAIR_COLORS[1] }} />
                        <span>{data[1].meta.operator_name}</span>
                      </Stack>
                    </TableCell>
                    <TableCell align="center">Winner</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { label: 'Avg RSRP (dBm)',     a: data[0].stats.avg_rsrp,  b: data[1].stats.avg_rsrp,  higher: true },
                    { label: 'Avg SINR (dB)',      a: data[0].stats.avg_sinr,  b: data[1].stats.avg_sinr,  higher: true },
                    { label: 'Avg RSRQ (dB)',      a: data[0].stats.avg_rsrq,  b: data[1].stats.avg_rsrq,  higher: true },
                    { label: 'Avg DL (kbps)',      a: data[0].stats.avg_dl,    b: data[1].stats.avg_dl,    higher: true },
                    { label: 'Max DL (kbps)',      a: data[0].stats.max_dl,    b: data[1].stats.max_dl,    higher: true },
                    { label: 'Coverage ≥ -90 dBm',
                      a: ((Number(data[0].stats.rsrp_excellent) + Number(data[0].stats.rsrp_good)) / data[0].stats.total_samples * 100).toFixed(1) + '%',
                      b: ((Number(data[1].stats.rsrp_excellent) + Number(data[1].stats.rsrp_good)) / data[1].stats.total_samples * 100).toFixed(1) + '%',
                      higher: true, raw: true },
                  ].map((row) => {
                    const aVal = row.raw ? parseFloat(row.a) : Number(row.a);
                    const bVal = row.raw ? parseFloat(row.b) : Number(row.b);
                    const winner = aVal === bVal ? 'Tie'
                      : (row.higher ? (aVal > bVal ? data[0].meta.operator_name : data[1].meta.operator_name)
                        : (aVal < bVal ? data[0].meta.operator_name : data[1].meta.operator_name));
                    const winIdx = winner === data[0].meta.operator_name ? 0 : winner === data[1].meta.operator_name ? 1 : -1;
                    const winColor = winIdx >= 0 ? OP_PAIR_COLORS[winIdx] : 'text.secondary';
                    return (
                      <TableRow key={row.label} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell sx={{ fontWeight: 500 }}>{row.label}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: winIdx === 0 ? 800 : 400, color: winIdx === 0 ? OP_PAIR_COLORS[0] : 'text.primary' }}>{row.a}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: winIdx === 1 ? 800 : 400, color: winIdx === 1 ? OP_PAIR_COLORS[1] : 'text.primary' }}>{row.b}</TableCell>
                        <TableCell align="center">
                          <Chip size="small" label={winner}
                            sx={{ height: 22, fontSize: 11, fontWeight: 700,
                              bgcolor: winIdx >= 0 ? alpha(OP_PAIR_COLORS[winIdx], 0.15) : 'action.hover',
                              color: winIdx >= 0 ? OP_PAIR_COLORS[winIdx] : 'text.secondary' }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* overlay map */}
          <Card sx={{ overflow: 'hidden', borderRadius: 2 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="subtitle2" fontWeight={700}>Route Overlay</Typography>
                {data.map((d, idx) => (
                  <Stack key={idx} direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 24, height: 4, bgcolor: OP_PAIR_COLORS[idx], borderRadius: 1 }} />
                    <Typography variant="caption" fontWeight={600}>{d.meta.operator_name}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
            <Box sx={{ height: 420 }}>
              <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url={`https://{s}.basemaps.cartocdn.com/${tileVariant}/{z}/{x}/{y}{r}.png`} attribution="&copy; CARTO" />
                <FlyTo center={mapCenter} zoom={13} />
                {data.map((d, idx) => (
                  <Polyline key={idx}
                    positions={d.samples.map((s) => [Number(s.latitude), Number(s.longitude)])}
                    pathOptions={{ color: OP_PAIR_COLORS[idx], weight: 4, opacity: 0.75 }} />
                ))}
                {data.map((d, idx) =>
                  d.samples.filter((_, i) => i % 3 === 0).map((s, i) => (
                    <CircleMarker key={`${idx}-${i}`}
                      center={[Number(s.latitude), Number(s.longitude)]}
                      radius={3}
                      pathOptions={{ color: rsrpColor(s.rsrp), fillColor: rsrpColor(s.rsrp), fillOpacity: 0.85, weight: 0.5 }}>
                      <Popup><div style={{ fontSize: 11 }}>
                        <strong>{d.meta.operator_name}</strong><br />
                        RSRP: {s.rsrp} dBm ({rsrpLabel(s.rsrp)})<br />
                        SINR: {s.sinr} dB
                        {s.dl_throughput && <><br />DL: {Math.round(Number(s.dl_throughput))} kbps</>}
                      </div></Popup>
                    </CircleMarker>
                  ))
                )}
              </MapContainer>
            </Box>
          </Card>
        </>
      )}

      {(!testA || !testB) && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CompareArrowsIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">Select two drive tests above to compare operator performance side-by-side.</Typography>
        </Box>
      )}
      {testA && testB && testA === testB && (
        <Alert severity="warning">Please select two <strong>different</strong> drive tests.</Alert>
      )}
    </Stack>
  );
}

/* ── Coverage Gaps Tab ──────────────────────────────────────────────────── */
function GapsTab({ tests, tileVariant }) {
  const [testId,    setTestId]    = useState('');
  const [threshold, setThreshold] = useState(-100);
  const [gaps,      setGaps]      = useState(null);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    if (!testId) return;
    setLoading(true);
    get(`/drive-tests/${testId}/coverage-gaps?threshold=${threshold}`)
      .then((r) => setGaps(r.data))
      .catch(() => setGaps([]))
      .finally(() => setLoading(false));
  }, [testId, threshold]);

  const testMeta = tests.find((t) => t.drive_test_id === testId);
  const critical = gaps?.filter((g) => g.minRsrp < -110).length ?? 0;
  const moderate = gaps?.filter((g) => g.minRsrp >= -110).length ?? 0;

  return (
    <Stack spacing={2.5}>
      {/* controls */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <InputLabel>Drive Test</InputLabel>
              <Select label="Drive Test" value={testId} onChange={(e) => setTestId(e.target.value)}>
                {tests.map((t) => (
                  <MenuItem key={t.drive_test_id} value={t.drive_test_id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colorFor(t.operator_name), flexShrink: 0 }} />
                      <span>{t.operator_name} — {t.test_name}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ minWidth: 220 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>RSRP Threshold</Typography>
                <Chip size="small" label={`${threshold} dBm`}
                  sx={{ height: 18, fontSize: 10, bgcolor: alpha(rsrpColor(threshold), 0.15), color: rsrpColor(threshold), fontWeight: 700 }} />
              </Stack>
              <Slider size="small" value={threshold} onChange={(_, v) => setThreshold(v)}
                min={-120} max={-80} step={5}
                marks={[{ value: -120, label: '-120' }, { value: -100, label: '-100' }, { value: -80, label: '-80' }]}
                sx={{ color: rsrpColor(threshold), mt: 0.5 }} />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {loading && <LinearProgress />}

      {gaps && gaps.length > 0 && (
        <>
          {/* summary KPIs */}
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Card sx={{ border: '1px solid', borderColor: alpha('#e0413b', 0.3), borderLeft: '4px solid #e0413b', textAlign: 'center', p: 2 }}>
                <Typography variant="h3" fontWeight={900} sx={{ color: '#e0413b' }}>{gaps.length}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Gaps</Typography>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card sx={{ border: '1px solid', borderColor: alpha('#e0413b', 0.3), borderLeft: '4px solid #e0413b', textAlign: 'center', p: 2 }}>
                <Typography variant="h3" fontWeight={900} sx={{ color: '#e0413b' }}>{critical}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Critical (&lt; -110 dBm)</Typography>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card sx={{ border: '1px solid', borderColor: alpha('#e6a700', 0.3), borderLeft: '4px solid #e6a700', textAlign: 'center', p: 2 }}>
                <Typography variant="h3" fontWeight={900} sx={{ color: '#e6a700' }}>{moderate}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Moderate</Typography>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            <strong>{gaps.length} coverage gap{gaps.length > 1 ? 's' : ''}</strong> detected below {threshold} dBm
            {testMeta && <> for <strong>{testMeta.operator_name}</strong></>}.
            {critical > 0 && <> <strong>{critical} critical</strong> gap{critical > 1 ? 's' : ''} require immediate attention.</>}
          </Alert>

          {/* map */}
          <Card sx={{ overflow: 'hidden', borderRadius: 2 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={700}>Gap Locations</Typography>
            </Box>
            <Box sx={{ height: 380 }}>
              <MapContainer center={[gaps[0].centerLat, gaps[0].centerLon]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url={`https://{s}.basemaps.cartocdn.com/${tileVariant}/{z}/{x}/{y}{r}.png`} attribution="&copy; CARTO" />
                {gaps.map((g, idx) => (
                  <Circle key={idx} center={[g.centerLat, g.centerLon]}
                    radius={Math.max(150, g.length * 30)}
                    pathOptions={{ color: g.minRsrp < -110 ? '#e0413b' : '#e6a700', fillColor: g.minRsrp < -110 ? '#e0413b' : '#e6a700', fillOpacity: 0.22, weight: 2 }}>
                    <Popup><div style={{ fontSize: 11 }}>
                      <strong>Gap #{idx + 1}</strong> — {g.minRsrp < -110 ? '🔴 Critical' : '🟡 Moderate'}<br />
                      {g.length} weak samples<br />Min RSRP: {g.minRsrp} dBm
                    </div></Popup>
                  </Circle>
                ))}
                {gaps.flatMap((g) => g.samples.map((s) => (
                  <CircleMarker key={s.sample_id}
                    center={[Number(s.latitude), Number(s.longitude)]} radius={4}
                    pathOptions={{ color: rsrpColor(Number(s.rsrp)), fillColor: rsrpColor(Number(s.rsrp)), fillOpacity: 0.9, weight: 0.5 }} />
                )))}
              </MapContainer>
            </Box>
          </Card>

          {/* gap table */}
          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700}>Gap Details</Typography>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
                    <TableCell>#</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell align="right">Samples</TableCell>
                    <TableCell align="right">Min RSRP</TableCell>
                    <TableCell>Severity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gaps.map((g, idx) => {
                    const isCrit = g.minRsrp < -110;
                    return (
                      <TableRow key={idx} sx={{ bgcolor: isCrit ? alpha('#e0413b', 0.04) : 'transparent', '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                        <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{g.centerLat.toFixed(5)}, {g.centerLon.toFixed(5)}</Typography></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{g.length}</TableCell>
                        <TableCell align="right" sx={{ color: rsrpColor(g.minRsrp), fontWeight: 700 }}>{g.minRsrp} dBm</TableCell>
                        <TableCell>
                          <Chip size="small"
                            label={isCrit ? 'Critical' : 'Moderate'}
                            sx={{ height: 20, fontSize: 10, fontWeight: 700,
                              bgcolor: isCrit ? alpha('#e0413b', 0.15) : alpha('#e6a700', 0.15),
                              color: isCrit ? '#e0413b' : '#e6a700' }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {gaps && gaps.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <VerifiedIcon sx={{ fontSize: 56, color: '#2e9e5b', mb: 1 }} />
          <Typography variant="h6" fontWeight={700} color="#2e9e5b">No Coverage Gaps</Typography>
          <Typography variant="body2" color="text.secondary">All samples are above the {threshold} dBm threshold.</Typography>
        </Box>
      )}

      {!testId && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <WarningIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">Select a drive test to detect coverage gaps.</Typography>
        </Box>
      )}
    </Stack>
  );
}

/* ── Compliance Tab ─────────────────────────────────────────────────────── */
function ComplianceTab({ tests }) {
  const [selectedTests, setSelectedTests] = useState([]);
  const [results,       setResults]       = useState([]);
  const [loading,       setLoading]       = useState(false);

  useEffect(() => {
    if (!selectedTests.length) { setResults([]); return; }
    setLoading(true);
    Promise.all(selectedTests.map((id) => get(`/drive-tests/${id}/compliance`)))
      .then((res) => setResults(res.map((r) => r.data)))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [selectedTests]);

  return (
    <Stack spacing={2.5}>
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Select Drive Tests (multi-select)</InputLabel>
            <Select label="Select Drive Tests (multi-select)" multiple value={selectedTests}
              onChange={(e) => setSelectedTests(e.target.value)}
              renderValue={(sel) => (
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {sel.map((id) => {
                    const t = tests.find((t) => t.drive_test_id === id);
                    return <Chip key={id} size="small" label={t?.operator_name}
                      sx={{ height: 20, fontSize: 11, bgcolor: alpha(colorFor(t?.operator_name), 0.15), color: colorFor(t?.operator_name), fontWeight: 700 }} />;
                  })}
                </Stack>
              )}>
              {tests.map((t) => (
                <MenuItem key={t.drive_test_id} value={t.drive_test_id}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colorFor(t.operator_name), flexShrink: 0 }} />
                    <span>{t.operator_name} — {t.test_name}</span>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {loading && <LinearProgress />}

      {results.length > 0 && (
        <>
          <Grid container spacing={2}>
            {results.map((r, idx) => {
              const opColor = colorFor(r.meta.operator_name);
              const overallPct = r.compliance.rsrp.pct;
              const passed = overallPct >= 95;
              return (
                <Grid item xs={12} md={results.length > 1 ? 6 : 12} key={idx}>
                  <Card sx={{
                    border: `1px solid ${alpha(opColor, 0.3)}`,
                    borderTop: `4px solid ${opColor}`,
                  }}>
                    <CardContent>
                      {/* header */}
                      <Stack direction="row" spacing={1} alignItems="center" mb={2.5}>
                        <Chip label={r.meta.operator_name} size="small"
                          sx={{ bgcolor: alpha(opColor, 0.15), color: opColor, fontWeight: 700 }} />
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>{r.meta.test_name}</Typography>
                        <Chip
                          icon={passed ? <VerifiedIcon style={{ fontSize: 14 }} /> : <WarningIcon style={{ fontSize: 14 }} />}
                          label={passed ? 'PASS' : 'FAIL'}
                          sx={{
                            fontWeight: 800, fontSize: 11, height: 24,
                            bgcolor: alpha(passed ? '#2e9e5b' : '#e0413b', 0.15),
                            color: passed ? '#2e9e5b' : '#e0413b',
                          }} />
                      </Stack>

                      {/* compliance bars */}
                      <SectionLabel color={opColor}>KPI Compliance</SectionLabel>
                      <ComplianceBar label={`RSRP ≥ ${r.thresholds.rsrp} dBm`} pct={r.compliance.rsrp.pct} pass={r.compliance.rsrp.pass} total={r.total} />
                      <ComplianceBar label={`RSRQ ≥ ${r.thresholds.rsrq} dB`}  pct={r.compliance.rsrq.pct} pass={r.compliance.rsrq.pass} total={r.total} />
                      <ComplianceBar label={`SINR ≥ ${r.thresholds.sinr} dB`}  pct={r.compliance.sinr.pct} pass={r.compliance.sinr.pass} total={r.total} />
                      <ComplianceBar label={`DL ≥ ${r.thresholds.dl} kbps`}    pct={r.compliance.dl.pct}   pass={r.compliance.dl.pass}   total={r.total} />

                      <Divider sx={{ my: 2 }} />

                      <SectionLabel color={opColor}>Coverage Distribution</SectionLabel>
                      <CoverageDistBar dist={r.distribution} total={r.total} />

                      <Divider sx={{ my: 2 }} />

                      <SectionLabel color={opColor}>Signal Averages</SectionLabel>
                      <Grid container spacing={1}>
                        <Grid item xs={4}><StatCard label="Avg RSRP" value={r.averages.rsrp} unit="dBm" color={rsrpColor(r.averages.rsrp)} accent={rsrpColor(r.averages.rsrp)} /></Grid>
                        <Grid item xs={4}><StatCard label="Avg SINR" value={r.averages.sinr} unit="dB" accent={opColor} /></Grid>
                        <Grid item xs={4}><StatCard label="Avg DL" value={r.averages.dl ? Math.round(r.averages.dl) : 'N/A'} unit="kbps" accent={opColor} /></Grid>
                      </Grid>

                      {(r.events.callDrops > 0 || r.events.handovers > 0) && (
                        <>
                          <Divider sx={{ my: 2 }} />
                          <Stack direction="row" spacing={1.5}>
                            {r.events.callDrops > 0 && (
                              <Chip icon={<WarningIcon />} label={`${r.events.callDrops} Call Drop${r.events.callDrops > 1 ? 's' : ''}`}
                                sx={{ bgcolor: alpha('#e0413b', 0.12), color: '#e0413b', fontWeight: 700, border: `1px solid ${alpha('#e0413b', 0.3)}` }} size="small" />
                            )}
                            <Chip label={`${r.events.handovers} Handover${r.events.handovers > 1 ? 's' : ''}`} variant="outlined" size="small" />
                          </Stack>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {results.length >= 2 && (
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <SectionLabel color="#8b5cf6">Compliance Comparison</SectionLabel>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
                      <TableCell>KPI Threshold</TableCell>
                      {results.map((r, i) => (
                        <TableCell key={i} align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colorFor(r.meta.operator_name) }} />
                            <span>{r.meta.operator_name}</span>
                          </Stack>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {['rsrp', 'rsrq', 'sinr', 'dl'].map((kpi) => {
                      const label = kpi === 'rsrp' ? `RSRP ≥ ${results[0].thresholds.rsrp} dBm`
                        : kpi === 'rsrq' ? `RSRQ ≥ ${results[0].thresholds.rsrq} dB`
                        : kpi === 'sinr' ? `SINR ≥ ${results[0].thresholds.sinr} dB`
                        : `DL ≥ ${results[0].thresholds.dl} kbps`;
                      const pcts = results.map((r) => r.compliance[kpi].pct);
                      const best = Math.max(...pcts);
                      return (
                        <TableRow key={kpi} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                          <TableCell sx={{ fontWeight: 500 }}>{label}</TableCell>
                          {results.map((r, i) => {
                            const pct = r.compliance[kpi].pct;
                            const color = pct >= 95 ? '#2e9e5b' : pct >= 80 ? '#e6a700' : '#e0413b';
                            return (
                              <TableCell key={i} align="center">
                                <Chip size="small" label={`${pct}%`}
                                  sx={{ fontWeight: pct === best ? 800 : 600, fontSize: 11, height: 22,
                                    bgcolor: alpha(color, 0.12), color }} />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedTests.length && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <VerifiedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">Select one or more drive tests to evaluate compliance.</Typography>
        </Box>
      )}
    </Stack>
  );
}

/* ── Route Segments Tab ─────────────────────────────────────────────────── */
function SegmentsTab({ tests, tileVariant }) {
  const [testId,   setTestId]   = useState('');
  const [segments, setSegments] = useState(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!testId) return;
    setLoading(true);
    get(`/drive-tests/${testId}/segments`)
      .then((r) => setSegments(r.data))
      .catch(() => setSegments([]))
      .finally(() => setLoading(false));
  }, [testId]);

  const worst = useMemo(() => {
    if (!segments?.length) return [];
    return [...segments].sort((a, b) => a.avgRsrp - b.avgRsrp).slice(0, 5);
  }, [segments]);

  const mapCenter = useMemo(() => {
    if (!segments?.length) return [8.45, -13.2];
    return [segments[Math.floor(segments.length / 2)].centerLat, segments[Math.floor(segments.length / 2)].centerLon];
  }, [segments]);

  const rankColors = ['#e0413b', '#ef6c00', '#e6a700', '#8bc34a', '#2e9e5b'];

  return (
    <Stack spacing={2.5}>
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <FormControl size="small" sx={{ minWidth: 300 }}>
            <InputLabel>Drive Test</InputLabel>
            <Select label="Drive Test" value={testId} onChange={(e) => setTestId(e.target.value)}>
              {tests.map((t) => (
                <MenuItem key={t.drive_test_id} value={t.drive_test_id}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colorFor(t.operator_name), flexShrink: 0 }} />
                    <span>{t.operator_name} — {t.test_name}</span>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {loading && <LinearProgress />}

      {segments && segments.length > 0 && (
        <>
          {/* worst 5 cards */}
          {worst.length > 0 && (
            <Box>
              <SectionLabel color="#e0413b">5 Worst Performing Segments</SectionLabel>
              <Grid container spacing={1.5}>
                {worst.map((s, idx) => {
                  const color = rankColors[idx] || '#888';
                  const total = s.sampleCount;
                  return (
                    <Grid item xs={12} sm={6} lg={4} key={s.index}>
                      <Card sx={{ border: `1px solid ${alpha(color, 0.35)}`, borderLeft: `4px solid ${color}` }}>
                        <CardContent sx={{ pb: '12px !important' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{
                                width: 24, height: 24, borderRadius: '50%', bgcolor: alpha(color, 0.15),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 800, color,
                              }}>{idx + 1}</Box>
                              <Typography variant="caption" fontWeight={700} color="text.secondary">Segment #{s.index + 1}</Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">{s.distanceKm} km</Typography>
                          </Stack>
                          <Stack direction="row" spacing={2} mb={1}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Avg RSRP</Typography>
                              <Typography variant="h6" fontWeight={800} sx={{ color: rsrpColor(s.avgRsrp), lineHeight: 1.2 }}>{s.avgRsrp} <Typography component="span" variant="caption">dBm</Typography></Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">SINR</Typography>
                              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>{s.avgSinr} <Typography component="span" variant="caption">dB</Typography></Typography>
                            </Box>
                            {s.avgDl && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">DL</Typography>
                                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>{Math.round(s.avgDl)} <Typography component="span" variant="caption">k</Typography></Typography>
                              </Box>
                            )}
                          </Stack>
                          {/* mini coverage bar */}
                          <Box sx={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                            {[
                              { count: s.coverage.excellent, color: RSRP_COLORS[0].color },
                              { count: s.coverage.good,      color: RSRP_COLORS[1].color },
                              { count: s.coverage.fair,      color: RSRP_COLORS[2].color },
                              { count: s.coverage.poor,      color: RSRP_COLORS[3].color },
                              { count: s.coverage.noSignal,  color: RSRP_COLORS[4].color },
                            ].map((c, i) => (
                              <Box key={i} sx={{ flex: c.count / total, bgcolor: c.color }} />
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          {/* map */}
          <Card sx={{ overflow: 'hidden', borderRadius: 2 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={700}>Segment Heat Map</Typography>
            </Box>
            <Box sx={{ height: 380 }}>
              <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer url={`https://{s}.basemaps.cartocdn.com/${tileVariant}/{z}/{x}/{y}{r}.png`} attribution="&copy; CARTO" />
                <FlyTo center={mapCenter} zoom={12} />
                {segments.map((s) => (
                  <Polyline key={`line-${s.index}`}
                    positions={[[s.startLat, s.startLon], [s.endLat, s.endLon]]}
                    pathOptions={{ color: rsrpColor(s.avgRsrp), weight: 5, opacity: 0.7 }} />
                ))}
                {segments.map((s) => (
                  <CircleMarker key={s.index} center={[s.centerLat, s.centerLon]} radius={10}
                    pathOptions={{ color: rsrpColor(s.avgRsrp), fillColor: rsrpColor(s.avgRsrp), fillOpacity: 0.8, weight: 1.5 }}>
                    <Popup><div style={{ fontSize: 11, minWidth: 140 }}>
                      <strong>Segment #{s.index + 1}</strong><br />
                      Avg RSRP: {s.avgRsrp} dBm ({rsrpLabel(s.avgRsrp)})<br />
                      Avg SINR: {s.avgSinr} dB<br />
                      {s.avgDl && <>Avg DL: {Math.round(s.avgDl)} kbps<br /></>}
                      Distance: {s.distanceKm} km
                    </div></Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </Box>
          </Card>

          {/* full table */}
          <Card>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={700}>All Segments</Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
                    <TableCell>Seg</TableCell>
                    <TableCell align="right">Km</TableCell>
                    <TableCell align="right">RSRP</TableCell>
                    <TableCell align="right">SINR</TableCell>
                    <TableCell align="right">DL</TableCell>
                    <TableCell>Coverage Mix</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {segments.map((s) => {
                    const total = s.sampleCount;
                    return (
                      <TableRow key={s.index}
                        sx={{ bgcolor: s.avgRsrp < -105 ? alpha('#e0413b', 0.05) : 'transparent', '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell sx={{ fontWeight: 600 }}>#{s.index + 1}</TableCell>
                        <TableCell align="right">{s.distanceKm}</TableCell>
                        <TableCell align="right" sx={{ color: rsrpColor(s.avgRsrp), fontWeight: 700 }}>{s.avgRsrp}</TableCell>
                        <TableCell align="right">{s.avgSinr}</TableCell>
                        <TableCell align="right">{s.avgDl ? Math.round(s.avgDl) : '—'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', height: 12, width: 100, borderRadius: 2, overflow: 'hidden' }}>
                            {[
                              { count: s.coverage.excellent, color: RSRP_COLORS[0].color },
                              { count: s.coverage.good,      color: RSRP_COLORS[1].color },
                              { count: s.coverage.fair,      color: RSRP_COLORS[2].color },
                              { count: s.coverage.poor,      color: RSRP_COLORS[3].color },
                              { count: s.coverage.noSignal,  color: RSRP_COLORS[4].color },
                            ].map((c, i) => (
                              <Box key={i} sx={{ flex: c.count / total, bgcolor: c.color }} />
                            ))}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Card>
        </>
      )}

      {!testId && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <SegmentIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">Select a drive test to analyze route segments.</Typography>
        </Box>
      )}
    </Stack>
  );
}

/* ── Date helpers ────────────────────────────────────────────────────────── */
function getDateRange(preset) {
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  switch (preset) {
    case 'day':     return { from: fmt(today), to: fmt(today) };
    case 'week':    { const d = new Date(today); d.setDate(d.getDate() - 7);    return { from: fmt(d), to: fmt(today) }; }
    case 'month':   { const d = new Date(today); d.setMonth(d.getMonth() - 1);  return { from: fmt(d), to: fmt(today) }; }
    case '3months': { const d = new Date(today); d.setMonth(d.getMonth() - 3);  return { from: fmt(d), to: fmt(today) }; }
    default: return { from: '', to: '' };
  }
}

const TAB_DEFS = [
  { label: 'Comparison',    icon: <CompareArrowsIcon />, color: '#3da9fc' },
  { label: 'Coverage Gaps', icon: <WarningIcon />,       color: '#e0413b' },
  { label: 'Compliance',    icon: <VerifiedIcon />,      color: '#2e9e5b' },
  { label: 'Segments',      icon: <SegmentIcon />,       color: '#8b5cf6' },
];

/* ── Main Page ──────────────────────────────────────────────────────────── */
export default function DriveTestAnalytics() {
  const [tab,        setTab]        = useState(0);
  const [allTests,   setAllTests]   = useState(null);
  const [operators,  setOperators]  = useState([]);
  const [filterOp,   setFilterOp]   = useState('all');
  const [datePreset, setDatePreset] = useState('3months');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const { mode } = useColorMode();
  const tileVariant = mode === 'dark' ? 'dark_all' : 'light_all';

  useEffect(() => {
    get('/drive-tests').then((r) => setAllTests(r.data)).catch(() => setAllTests([]));
    get('/operators').then((r) => setOperators(r.data?.rows || r.data || [])).catch(() => setOperators([]));
  }, []);

  useEffect(() => {
    if (datePreset !== 'custom') {
      const range = getDateRange(datePreset);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }, [datePreset]);

  const tests = useMemo(() => {
    if (!allTests) return null;
    return allTests.filter((t) => {
      if (filterOp !== 'all' && t.operator_id !== Number(filterOp)) return false;
      if (dateFrom && t.test_date < dateFrom) return false;
      if (dateTo   && t.test_date > dateTo)   return false;
      return true;
    });
  }, [allTests, filterOp, dateFrom, dateTo]);

  if (!allTests) return <Loading height={400} />;

  if (!allTests.length) {
    return <EmptyState icon={<CompareArrowsIcon sx={{ fontSize: 48 }} />}
      message="No drive tests available for analysis."
      hint="Upload drive test data first from the Drive Testing page." />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

      {/* ── page header ── */}
      <Box sx={{
        borderRadius: 3, p: 3,
        background: 'linear-gradient(135deg, #0d2137 0%, #0a3d62 60%, #1a5276 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
        <Box sx={{ position: 'absolute', bottom: -20, right: 100, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
              <CompareArrowsIcon sx={{ color: '#3da9fc' }} />
              <Typography variant="h5" fontWeight={800} color="#fff">Drive Test Analytics</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Compare operators, detect coverage gaps, and evaluate compliance from drive test data
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Chip label={`${allTests.length} total tests`}
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, fontSize: 12 }} />
            <Chip label={`${operators.length} operators`}
              sx={{ bgcolor: 'rgba(61,169,252,0.2)', color: '#3da9fc', fontWeight: 600, fontSize: 12 }} />
            <Button size="small" startIcon={<DownloadIcon />} disabled={!tests?.length}
              onClick={() => exportCsv('drive_test_analytics.csv', [
                { key: 'test_name', label: 'Test Name' }, { key: 'operator_name', label: 'Operator' },
                { key: 'test_date', label: 'Date' }, { key: 'route_type', label: 'Route' },
                { key: 'technology', label: 'Tech' }, { key: 'sample_count', label: 'Samples' },
                { key: 'avg_rsrp', label: 'Avg RSRP' }, { key: 'avg_sinr', label: 'Avg SINR' },
                { key: 'avg_dl_throughput', label: 'Avg DL' },
              ], tests)}
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
              Export CSV
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ── filter bar ── */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} flexWrap="wrap">
            <Stack direction="row" spacing={1} alignItems="center">
              <FilterListIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Operator</InputLabel>
                <Select label="Operator" value={filterOp} onChange={(e) => setFilterOp(e.target.value)}>
                  <MenuItem value="all">All Operators</MenuItem>
                  {operators.map((o) => (
                    <MenuItem key={o.operator_id} value={o.operator_id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colorFor(o.operator_name), flexShrink: 0 }} />
                        <span>{o.operator_name}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              {['day', 'week', 'month', '3months', 'custom'].map((p) => (
                <Chip key={p} label={p === '3months' ? '3 Months' : p.charAt(0).toUpperCase() + p.slice(1)}
                  size="small" clickable onClick={() => setDatePreset(p)}
                  sx={{
                    fontWeight: 600, fontSize: 11,
                    bgcolor: datePreset === p ? alpha('#3da9fc', 0.15) : 'transparent',
                    color: datePreset === p ? '#3da9fc' : 'text.secondary',
                    border: `1px solid ${datePreset === p ? alpha('#3da9fc', 0.4) : 'transparent'}`,
                  }} />
              ))}
              {datePreset === 'custom' && (
                <Stack direction="row" spacing={1}>
                  <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
                    value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} sx={{ width: 140 }} />
                  <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
                    value={dateTo} onChange={(e) => setDateTo(e.target.value)} sx={{ width: 140 }} />
                </Stack>
              )}
            </Stack>

            <Box sx={{ ml: { sm: 'auto' } }}>
              <Chip label={`${tests?.length || 0} tests`}
                sx={{ fontWeight: 700, fontSize: 12, bgcolor: alpha('#3da9fc', 0.12), color: '#3da9fc' }} />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* ── tab pills ── */}
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {TAB_DEFS.map((t, i) => (
          <Box key={i} onClick={() => setTab(i)} sx={{
            display: 'flex', alignItems: 'center', gap: 0.75, px: 2, py: 1,
            borderRadius: 2, cursor: 'pointer', transition: 'all 0.15s',
            bgcolor: tab === i ? alpha(t.color, 0.15) : 'action.hover',
            border: `1px solid ${tab === i ? alpha(t.color, 0.4) : 'transparent'}`,
            color: tab === i ? t.color : 'text.secondary',
            fontWeight: tab === i ? 700 : 400,
            '&:hover': { bgcolor: alpha(t.color, 0.1), color: t.color },
          }}>
            <Box sx={{ display: 'flex', '& svg': { fontSize: 18 } }}>{t.icon}</Box>
            <Typography variant="body2" fontWeight="inherit" color="inherit">{t.label}</Typography>
          </Box>
        ))}
      </Stack>

      {/* ── tab content ── */}
      {tests && tests.length > 0 ? (
        <>
          {tab === 0 && <CompareTab    tests={tests} tileVariant={tileVariant} />}
          {tab === 1 && <GapsTab       tests={tests} tileVariant={tileVariant} />}
          {tab === 2 && <ComplianceTab tests={tests} />}
          {tab === 3 && <SegmentsTab   tests={tests} tileVariant={tileVariant} />}
        </>
      ) : (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No drive tests match the selected filters. Adjust the operator or date range.
        </Alert>
      )}
    </Box>
  );
}
