import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import {
  Box, Card, CardContent, Typography, Stack, Grid, Chip, Alert,
  FormControl, InputLabel, Select, MenuItem, FormGroup, FormControlLabel,
  Checkbox, LinearProgress, Table, TableHead, TableBody, TableRow, TableCell,
  ToggleButtonGroup, ToggleButton, Button, Paper, Divider,
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import PrintIcon from '@mui/icons-material/Print';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { get } from '../api/client';
import { Loading, EmptyState } from '../components/ui';
import { colorFor } from '../theme';

const FALLBACK_DL_BINS = [
  { min: 20000, color: '#2e9e5b', label: '≥ 20 Mbps',        tier: 'Excellent' },
  { min: 10000, color: '#8bc34a', label: '10 – 20 Mbps',      tier: 'Good'      },
  { min: 5000,  color: '#e6a700', label: '5 – 10 Mbps',       tier: 'Fair'      },
  { min: 1000,  color: '#ef6c00', label: '1 – 5 Mbps',        tier: 'Poor'      },
  { min: 0,     color: '#e0413b', label: '< 1 Mbps',          tier: 'Very Poor' },
];

const FALLBACK_UL_BINS = [
  { min: 10000, color: '#2e9e5b', label: '≥ 10 Mbps',        tier: 'Excellent' },
  { min: 5000,  color: '#8bc34a', label: '5 – 10 Mbps',      tier: 'Good'      },
  { min: 2000,  color: '#e6a700', label: '2 – 5 Mbps',       tier: 'Fair'      },
  { min: 500,   color: '#ef6c00', label: '0.5 – 2 Mbps',     tier: 'Poor'      },
  { min: 0,     color: '#e0413b', label: '< 0.5 Mbps',       tier: 'Very Poor' },
];

function toMbps(kbps) { return kbps != null ? (Number(kbps) / 1000) : null; }

function binColor(kbps, bins) {
  if (kbps == null) return '#888';
  const v = Number(kbps);
  for (const b of bins) { if (v >= b.min) return b.color; }
  return '#e0413b';
}

function testType(testName) {
  const first = (testName || '').split(' — ')[0].trim().toLowerCase();
  if (first.includes(' dl') || first.includes('lte dl')) return 'DL';
  if (first.includes(' ul') || first.includes('lte ul')) return 'UL';
  if (first.includes('ping')) return 'Ping';
  if (first.includes('idle')) return 'Idle';
  if (first.includes('mos')) return 'MOS';
  return 'Other';
}

function clusterFromName(name) {
  if (!name) return null;
  const parts = name.split(' — ');
  if (parts.length >= 2) return parts[1].trim();
  const stripped = name.replace(/_\d{8}T\d{6}Z?$/i, '').trim();
  return stripped || name;
}

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom, { duration: 0.8 }); }, [center, zoom, map]);
  return null;
}

function StatsRow({ label, value, unit }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.3 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="caption" fontWeight={600}>{value != null ? `${value} ${unit}` : '—'}</Typography>
    </Stack>
  );
}

function calcPct(arr, p) {
  const sorted = arr.filter((v) => !isNaN(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return +(sorted[idx] / 1000).toFixed(2);
}

export default function DriveTestThroughput() {
  const [allTests, setAllTests] = useState(null);
  const [operators, setOperators] = useState([]);
  const [selectedTech, setSelectedTech] = useState('4G');
  const [selectedCluster, setSelectedCluster] = useState('');
  const [selectedOps, setSelectedOps] = useState([]);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapMetric, setMapMetric] = useState('dl');
  const [flyTarget, setFlyTarget] = useState(null);
  const [dlBins, setDlBins] = useState(FALLBACK_DL_BINS);
  const [ulBins, setUlBins] = useState(FALLBACK_UL_BINS);
  const [dlPassValue, setDlPassValue] = useState(10000);
  const [ulPassValue, setUlPassValue] = useState(5000);


  useEffect(() => {
    get('/drive-tests').then((r) => setAllTests(r.data)).catch(() => setAllTests([]));
    get('/operators').then((r) => setOperators(r.data?.rows || r.data || [])).catch(() => setOperators([]));
    get('/drive-tests/signal-thresholds').then((r) => {
      const rows = r.data || [];
      for (const row of rows) {
        const bins = typeof row.bins === 'string' ? JSON.parse(row.bins) : row.bins;
        if (row.metric === 'dl_throughput' && bins?.length) {
          setDlBins(bins);
          setDlPassValue(Number(row.pass_value));
        }
        if (row.metric === 'ul_throughput' && bins?.length) {
          setUlBins(bins);
          setUlPassValue(Number(row.pass_value));
        }
      }
    }).catch(() => {});
  }, []);

  const clusters = useMemo(() => {
    if (!allTests) return [];
    const seen = new Set();
    for (const t of allTests) { const c = clusterFromName(t.test_name); if (c) seen.add(c); }
    return [...seen].sort();
  }, [allTests]);

  const availableOps = useMemo(() => {
    if (!allTests || !selectedCluster) return [];
    const opIds = new Set(
      allTests.filter((t) =>
        (selectedTech === 'all' || t.technology === selectedTech) &&
        clusterFromName(t.test_name) === selectedCluster &&
        ['DL', 'UL'].includes(testType(t.test_name))
      ).map((t) => t.operator_id)
    );
    return operators.filter((o) => opIds.has(o.operator_id));
  }, [allTests, selectedTech, selectedCluster, operators]);

  useEffect(() => { setSelectedOps(availableOps.map((o) => o.operator_id)); }, [availableOps]);

  useEffect(() => {
    if (!selectedCluster) { setSamples([]); return; }
    setLoading(true);
    get(`/drive-tests/throughput-analysis?cluster=${encodeURIComponent(selectedCluster)}&technology=${selectedTech}`)
      .then((r) => {
        const data = r.data || [];
        setSamples(data);
        if (data.length) {
          const mid = data[Math.floor(data.length / 2)];
          setFlyTarget([Number(mid.latitude), Number(mid.longitude)]);
        }
      })
      .catch(() => setSamples([]))
      .finally(() => setLoading(false));
  }, [selectedCluster, selectedTech]);

  const filtered = useMemo(() => {
    if (!selectedOps.length) return samples;
    return samples.filter((s) => selectedOps.includes(s.operator_id));
  }, [samples, selectedOps]);

  const dlSamples = useMemo(() => filtered.filter((s) => {
    return s.dl_throughput != null && Number(s.dl_throughput) > 0;
  }), [filtered]);

  const ulSamples = useMemo(() => filtered.filter((s) => {
    return s.ul_throughput != null && Number(s.ul_throughput) > 0;
  }), [filtered]);

  const opNames = useMemo(() => [...new Set(filtered.map((s) => s.operator_name).filter(Boolean))], [filtered]);

  const barData = useMemo(() => {
    return opNames.map((op) => {
      const opDL = dlSamples.filter((s) => s.operator_name === op);
      const opUL = ulSamples.filter((s) => s.operator_name === op);
      const avgDL = opDL.length ? opDL.reduce((a, s) => a + Number(s.dl_throughput), 0) / opDL.length : 0;
      const avgUL = opUL.length ? opUL.reduce((a, s) => a + Number(s.ul_throughput), 0) / opUL.length : 0;
      const maxDL = opDL.length ? Math.max(...opDL.map((s) => Number(s.dl_throughput))) : 0;
      const maxUL = opUL.length ? Math.max(...opUL.map((s) => Number(s.ul_throughput))) : 0;
      return {
        operator: op,
        'Avg DL': +(avgDL / 1000).toFixed(2),
        'Max DL': +(maxDL / 1000).toFixed(2),
        'Avg UL': +(avgUL / 1000).toFixed(2),
        'Max UL': +(maxUL / 1000).toFixed(2),
        color: colorFor(op),
      };
    });
  }, [opNames, dlSamples, ulSamples]);

  const activeSamples = mapMetric === 'dl' ? dlSamples : ulSamples;
  const activeBins = mapMetric === 'dl' ? dlBins : ulBins;
  const activeKey = mapMetric === 'dl' ? 'dl_throughput' : 'ul_throughput';

  if (!allTests) return <Loading height={400} />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <SpeedIcon color="primary" />
        <Typography variant="h5">Throughput Analysis</Typography>
        {dlSamples.length > 0 && (
          <Chip size="small" label={`DL: ${dlSamples.length} · UL: ${ulSamples.length} samples`} variant="outlined" />
        )}
      </Stack>

      {/* Filters */}
      <Card>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Technology</InputLabel>
                <Select label="Technology" value={selectedTech}
                  onChange={(e) => { setSelectedTech(e.target.value); setSelectedCluster(''); }}>
                  {['3G', '4G'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small" disabled={!clusters.length}>
                <InputLabel>Cluster</InputLabel>
                <Select label="Cluster" value={selectedCluster}
                  onChange={(e) => setSelectedCluster(e.target.value)}>
                  <MenuItem value="">— select —</MenuItem>
                  {clusters.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={6}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Operators</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {availableOps.length === 0
                  ? <Typography variant="caption" color="text.disabled">
                      {selectedCluster ? 'No DL/UL tests for this selection' : 'Select a cluster first'}
                    </Typography>
                  : availableOps.map((op) => (
                    <FormControlLabel key={op.operator_id}
                      control={
                        <Checkbox size="small" checked={selectedOps.includes(op.operator_id)}
                          sx={{ color: colorFor(op.operator_name), '&.Mui-checked': { color: colorFor(op.operator_name) } }}
                          onChange={(e) => setSelectedOps((prev) =>
                            e.target.checked ? [...prev, op.operator_id] : prev.filter((id) => id !== op.operator_id)
                          )}
                        />
                      }
                      label={<Typography variant="caption">{op.operator_name}</Typography>}
                    />
                  ))
                }
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {!selectedCluster && (
        <EmptyState icon={<SpeedIcon sx={{ fontSize: 48 }} />}
          message="Select a cluster to view throughput data."
          hint="Shows DL and UL throughput from actual speed test drive logs." />
      )}

      {loading && <LinearProgress />}

      {selectedCluster && !loading && dlSamples.length === 0 && ulSamples.length === 0 && (
        <Alert severity="info">No throughput test data found for {selectedTech} · {selectedCluster}.</Alert>
      )}

      {selectedCluster && (dlSamples.length > 0 || ulSamples.length > 0) && (
        <>
          {/* Bar chart comparison */}
          {barData.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} mb={2}>
                  Average & Peak Throughput by Operator (Mbps)
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="operator" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: 'Mbps', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                    <RTooltip formatter={(v) => `${v} Mbps`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Avg DL" fill="#1976d2" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Max DL" fill="#1976d233" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Avg UL" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Max UL" fill="#2e7d3233" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Map + toggle */}
          <Card>
            <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={700}>Map Color:</Typography>
                <ToggleButtonGroup size="small" exclusive value={mapMetric}
                  onChange={(_, v) => { if (v) setMapMetric(v); }}>
                  <ToggleButton value="dl">DL Throughput</ToggleButton>
                  <ToggleButton value="ul">UL Throughput</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ height: 460 }}>
            <CardContent sx={{ height: '100%', p: '0 !important', position: 'relative' }}>
              <MapContainer center={[8.4, -11.8]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                {flyTarget && <FlyTo center={flyTarget} zoom={14} />}
                {activeSamples.map((s) => {
                  const color = binColor(s[activeKey], activeBins);
                  return (
                    <CircleMarker key={s.sample_id}
                      center={[Number(s.latitude), Number(s.longitude)]}
                      radius={4}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.88, weight: 0.5 }}>
                      <Popup>
                        <div style={{ minWidth: 160, fontSize: 12 }}>
                          <strong>{s.operator_name}</strong> · {s.technology}<br />
                          <strong>DL:</strong> {toMbps(s.dl_throughput)?.toFixed(2) ?? 'N/A'} Mbps<br />
                          <strong>UL:</strong> {toMbps(s.ul_throughput)?.toFixed(2) ?? 'N/A'} Mbps<br />
                          {s.rsrp != null && <><strong>RSRP:</strong> {s.rsrp} dBm<br /></>}
                          <span style={{ color: '#888', fontSize: 11 }}>
                            {Number(s.latitude).toFixed(5)}, {Number(s.longitude).toFixed(5)}
                          </span>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>

              {/* Legend */}
              <Box sx={{
                position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
                bgcolor: 'background.paper', borderRadius: 2, p: 1.5,
                boxShadow: 2, opacity: 0.95, minWidth: 160,
              }}>
                <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
                  {mapMetric === 'dl' ? 'DL' : 'UL'} Throughput
                </Typography>
                {[...activeBins].reverse().map((bin) => (
                  <Stack key={bin.label} direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: bin.color, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ fontSize: 10 }}>{bin.label}</Typography>
                  </Stack>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Per-operator stats */}
          <Grid container spacing={2}>
            {opNames.map((op) => {
              const opDL = dlSamples.filter((s) => s.operator_name === op);
              const opUL = ulSamples.filter((s) => s.operator_name === op);
              const dlVals = opDL.map((s) => Number(s.dl_throughput));
              const ulVals = opUL.map((s) => Number(s.ul_throughput));
              const avgDL = dlVals.length ? (dlVals.reduce((a, b) => a + b, 0) / dlVals.length / 1000).toFixed(2) : null;
              const maxDL = dlVals.length ? (Math.max(...dlVals) / 1000).toFixed(2) : null;
              const minDL = dlVals.length ? (Math.min(...dlVals) / 1000).toFixed(2) : null;
              const avgUL = ulVals.length ? (ulVals.reduce((a, b) => a + b, 0) / ulVals.length / 1000).toFixed(2) : null;
              const maxUL = ulVals.length ? (Math.max(...ulVals) / 1000).toFixed(2) : null;
              const minUL = ulVals.length ? (Math.min(...ulVals) / 1000).toFixed(2) : null;

              const dlPass = dlVals.filter((v) => v >= dlPassValue).length;
              const dlPct = dlVals.length ? ((dlPass / dlVals.length) * 100).toFixed(1) : '—';

              const dlBinCounts = dlBins.map((bin, i) => {
                const nextMin = dlBins[i - 1]?.min ?? Infinity;
                const count = dlVals.filter((v) => v >= bin.min && v < nextMin).length;
                return { ...bin, count };
              });

              return (
                <Grid item xs={12} md={opNames.length > 1 ? 6 : 12} key={op}>
                  <Card>
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                        <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: colorFor(op) }} />
                        <Typography variant="subtitle2" fontWeight={700}>{op}</Typography>
                        <Chip size="small" label={`DL: ${opDL.length} · UL: ${opUL.length}`}
                          sx={{ bgcolor: colorFor(op) + '22', fontSize: 10 }} />
                      </Stack>

                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" fontWeight={700} color="primary">DL Throughput</Typography>
                          <StatsRow label="Average" value={avgDL} unit="Mbps" />
                          <StatsRow label="Peak" value={maxDL} unit="Mbps" />
                          <StatsRow label="Min" value={minDL} unit="Mbps" />
                          <StatsRow label="Samples" value={opDL.length} unit="" />
                          <Divider sx={{ my: 0.5 }} />
                          <StatsRow label="P5 (edge)" value={calcPct(dlVals, 5)} unit="Mbps" />
                          <StatsRow label="P50 (median)" value={calcPct(dlVals, 50)} unit="Mbps" />
                          <StatsRow label="P95 (peak)" value={calcPct(dlVals, 95)} unit="Mbps" />
                          <Divider sx={{ my: 0.5 }} />
                          <StatsRow label={`≥ ${(dlPassValue / 1000).toFixed(0)} Mbps`} value={dlPct} unit="%" />
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" fontWeight={700} color="success.main">UL Throughput</Typography>
                          <StatsRow label="Average" value={avgUL} unit="Mbps" />
                          <StatsRow label="Peak" value={maxUL} unit="Mbps" />
                          <StatsRow label="Min" value={minUL} unit="Mbps" />
                          <StatsRow label="Samples" value={opUL.length} unit="" />
                          {ulVals.length > 0 && (
                            <>
                              <Divider sx={{ my: 0.5 }} />
                              <StatsRow label="P5 (edge)" value={calcPct(ulVals, 5)} unit="Mbps" />
                              <StatsRow label="P50 (median)" value={calcPct(ulVals, 50)} unit="Mbps" />
                              <StatsRow label="P95 (peak)" value={calcPct(ulVals, 95)} unit="Mbps" />
                            </>
                          )}
                        </Grid>
                      </Grid>

                      {dlVals.length > 0 && (
                        <>
                          <Divider sx={{ my: 1.5 }} />
                          <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
                            DL Distribution
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: 'action.hover' }}>
                                <TableCell sx={{ width: 14, p: 0.5 }} />
                                <TableCell>Range</TableCell>
                                <TableCell align="right">Samples</TableCell>
                                <TableCell align="right">%</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {[...dlBinCounts].reverse().map((bin) => (
                                <TableRow key={bin.label} hover>
                                  <TableCell sx={{ p: 0.5 }}>
                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: bin.color }} />
                                  </TableCell>
                                  <TableCell><Typography variant="caption">{bin.label} ({bin.tier})</Typography></TableCell>
                                  <TableCell align="right"><Typography variant="caption">{bin.count}</Typography></TableCell>
                                  <TableCell align="right">
                                    <Typography variant="caption" fontWeight={bin.count > 0 ? 600 : 400}>
                                      {((bin.count / dlVals.length) * 100).toFixed(1)}%
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}
    </Box>
  );
}
