import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap, Circle } from 'react-leaflet';
import {
  Box, Card, CardContent, Typography, Stack, Grid, Chip, Alert, Tabs, Tab,
  FormControl, InputLabel, Select, MenuItem, Table, TableHead, TableBody,
  TableRow, TableCell, LinearProgress, Tooltip, Divider, Slider,
  TextField, ToggleButton, ToggleButtonGroup, Button,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import WarningIcon from '@mui/icons-material/Warning';
import VerifiedIcon from '@mui/icons-material/Verified';
import SegmentIcon from '@mui/icons-material/Segment';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DownloadIcon from '@mui/icons-material/Download';
import { get } from '../api/client';
import { Loading, EmptyState } from '../components/ui';
import { exportCsv } from '../utils/csv';
import { colorFor } from '../theme';
import { useColorMode } from '../theme/ColorMode';

const RSRP_COLORS = [
  { min: -80, color: '#2e9e5b', label: 'Excellent' },
  { min: -90, color: '#8bc34a', label: 'Good' },
  { min: -100, color: '#e6a700', label: 'Fair' },
  { min: -110, color: '#ef6c00', label: 'Poor' },
  { min: -Infinity, color: '#e0413b', label: 'No Signal' },
];

function rsrpColor(val) {
  if (val == null) return '#888';
  for (const r of RSRP_COLORS) { if (val >= r.min) return r.color; }
  return '#e0413b';
}

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom || 13, { duration: 1 }); }, [center, zoom, map]);
  return null;
}

function StatCard({ label, value, unit, color, sub }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight={700} sx={{ color: color || 'text.primary' }}>
        {value}{unit && <Typography component="span" variant="caption" ml={0.5}>{unit}</Typography>}
      </Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Box>
  );
}

function ComplianceBar({ label, pct, pass, total }) {
  const color = pct >= 95 ? '#2e9e5b' : pct >= 80 ? '#e6a700' : '#e0413b';
  return (
    <Box mb={1.5}>
      <Stack direction="row" justifyContent="space-between" mb={0.3}>
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
        <Typography variant="body2" fontWeight={700} sx={{ color }}>{pct}%</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={pct}
        sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 } }} />
      <Typography variant="caption" color="text.secondary">{pass} / {total} samples pass</Typography>
    </Box>
  );
}

function CoverageDistBar({ dist, total }) {
  const items = [
    { label: 'Excellent', count: dist.excellent, color: RSRP_COLORS[0].color },
    { label: 'Good', count: dist.good, color: RSRP_COLORS[1].color },
    { label: 'Fair', count: dist.fair, color: RSRP_COLORS[2].color },
    { label: 'Poor', count: dist.poor, color: RSRP_COLORS[3].color },
    { label: 'No Signal', count: dist.noSignal, color: RSRP_COLORS[4].color },
  ];
  const t = total || 1;
  return (
    <Box>
      <Box sx={{ display: 'flex', height: 22, borderRadius: 1, overflow: 'hidden', mb: 0.5 }}>
        {items.map((c) => (
          <Tooltip key={c.label} title={`${c.label}: ${c.count} (${((c.count / t) * 100).toFixed(1)}%)`}>
            <Box sx={{ width: `${(c.count / t) * 100}%`, bgcolor: c.color, transition: 'width 0.3s' }} />
          </Tooltip>
        ))}
      </Box>
      <Stack direction="row" spacing={1.5} flexWrap="wrap">
        {items.map((c) => (
          <Stack key={c.label} direction="row" spacing={0.3} alignItems="center">
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.color }} />
            <Typography variant="caption" sx={{ fontSize: 10 }}>{c.label}: {((c.count / t) * 100).toFixed(1)}%</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

// ─── Tab: Operator Comparison ─────────────────────────────────────────────
function CompareTab({ tests, tileVariant }) {
  const [testA, setTestA] = useState('');
  const [testB, setTestB] = useState('');
  const [data, setData] = useState(null);
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

  const OPERATOR_COLORS = ['#3da9fc', '#ef6c00'];

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControl size="small" fullWidth>
          <InputLabel>Operator A</InputLabel>
          <Select label="Operator A" value={testA} onChange={(e) => setTestA(e.target.value)}>
            {tests.map((t) => (
              <MenuItem key={t.drive_test_id} value={t.drive_test_id}>
                {t.operator_name} — {t.test_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Operator B</InputLabel>
          <Select label="Operator B" value={testB} onChange={(e) => setTestB(e.target.value)}>
            {tests.map((t) => (
              <MenuItem key={t.drive_test_id} value={t.drive_test_id}>
                {t.operator_name} — {t.test_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {loading && <LinearProgress />}

      {data && data.length === 2 && (
        <>
          {/* Side-by-side stats */}
          <Grid container spacing={2}>
            {data.map((d, idx) => (
              <Grid item xs={12} md={6} key={idx}>
                <Card sx={{ borderTop: 3, borderColor: OPERATOR_COLORS[idx] }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                      <Chip label={d.meta.operator_name} size="small"
                        sx={{ bgcolor: OPERATOR_COLORS[idx] + '33', fontWeight: 700 }} />
                      <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>{d.meta.test_name}</Typography>
                    </Stack>
                    <Grid container spacing={2}>
                      <Grid item xs={4}><StatCard label="Avg RSRP" value={d.stats.avg_rsrp} unit="dBm" color={rsrpColor(d.stats.avg_rsrp)} /></Grid>
                      <Grid item xs={4}><StatCard label="Avg SINR" value={d.stats.avg_sinr} unit="dB" /></Grid>
                      <Grid item xs={4}><StatCard label="Avg DL" value={d.stats.avg_dl ? Math.round(d.stats.avg_dl) : 'N/A'} unit="kbps" /></Grid>
                      <Grid item xs={4}><StatCard label="Samples" value={d.stats.total_samples?.toLocaleString()} /></Grid>
                      <Grid item xs={4}><StatCard label="Min RSRP" value={d.stats.min_rsrp} unit="dBm" color={rsrpColor(d.stats.min_rsrp)} /></Grid>
                      <Grid item xs={4}><StatCard label="Max DL" value={d.stats.max_dl ? Math.round(d.stats.max_dl) : 'N/A'} unit="kbps" /></Grid>
                    </Grid>
                    <Divider sx={{ my: 1.5 }} />
                    <CoverageDistBar
                      dist={{ excellent: d.stats.rsrp_excellent, good: d.stats.rsrp_good,
                              fair: d.stats.rsrp_fair, poor: d.stats.rsrp_poor, noSignal: d.stats.rsrp_no_signal }}
                      total={d.stats.total_samples} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Comparison summary */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" mb={1}>Head-to-Head Comparison</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Metric</TableCell>
                    <TableCell align="center">{data[0].meta.operator_name}</TableCell>
                    <TableCell align="center">{data[1].meta.operator_name}</TableCell>
                    <TableCell align="center">Winner</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { label: 'Avg RSRP (dBm)', a: data[0].stats.avg_rsrp, b: data[1].stats.avg_rsrp, higher: true },
                    { label: 'Avg SINR (dB)', a: data[0].stats.avg_sinr, b: data[1].stats.avg_sinr, higher: true },
                    { label: 'Avg RSRQ (dB)', a: data[0].stats.avg_rsrq, b: data[1].stats.avg_rsrq, higher: true },
                    { label: 'Avg DL (kbps)', a: data[0].stats.avg_dl, b: data[1].stats.avg_dl, higher: true },
                    { label: 'Max DL (kbps)', a: data[0].stats.max_dl, b: data[1].stats.max_dl, higher: true },
                    { label: 'Coverage ≥ -90 dBm', a: ((Number(data[0].stats.rsrp_excellent) + Number(data[0].stats.rsrp_good)) / data[0].stats.total_samples * 100).toFixed(1) + '%',
                      b: ((Number(data[1].stats.rsrp_excellent) + Number(data[1].stats.rsrp_good)) / data[1].stats.total_samples * 100).toFixed(1) + '%', higher: true, raw: true },
                  ].map((row) => {
                    const aVal = row.raw ? parseFloat(row.a) : Number(row.a);
                    const bVal = row.raw ? parseFloat(row.b) : Number(row.b);
                    const winner = aVal === bVal ? 'Tie' : (row.higher ? (aVal > bVal ? data[0].meta.operator_name : data[1].meta.operator_name)
                      : (aVal < bVal ? data[0].meta.operator_name : data[1].meta.operator_name));
                    const winColor = winner === data[0].meta.operator_name ? OPERATOR_COLORS[0] : winner === data[1].meta.operator_name ? OPERATOR_COLORS[1] : 'text.secondary';
                    return (
                      <TableRow key={row.label}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: winner === data[0].meta.operator_name ? 700 : 400 }}>{row.a}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: winner === data[1].meta.operator_name ? 700 : 400 }}>{row.b}</TableCell>
                        <TableCell align="center"><Chip size="small" label={winner} sx={{ bgcolor: winColor + '22', color: winColor, fontWeight: 700, height: 22, fontSize: 11 }} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Overlay map */}
          <Card sx={{ height: 450 }}>
            <CardContent sx={{ height: '100%', p: '0 !important', position: 'relative' }}>
              <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url={`https://{s}.basemaps.cartocdn.com/${tileVariant}/{z}/{x}/{y}{r}.png`}
                  attribution="&copy; CARTO" />
                <FlyTo center={mapCenter} zoom={13} />
                {data.map((d, idx) => (
                  <Polyline key={idx}
                    positions={d.samples.map((s) => [Number(s.latitude), Number(s.longitude)])}
                    pathOptions={{ color: OPERATOR_COLORS[idx], weight: 4, opacity: 0.7 }} />
                ))}
                {data.map((d, idx) =>
                  d.samples.filter((_, i) => i % 3 === 0).map((s, i) => (
                    <CircleMarker key={`${idx}-${i}`}
                      center={[Number(s.latitude), Number(s.longitude)]}
                      radius={3}
                      pathOptions={{ color: rsrpColor(s.rsrp), fillColor: rsrpColor(s.rsrp), fillOpacity: 0.8, weight: 0.5 }}>
                      <Popup><div style={{ fontSize: 11 }}>
                        <strong>{d.meta.operator_name}</strong><br />
                        RSRP: {s.rsrp} dBm | SINR: {s.sinr} dB
                        {s.dl_throughput && <><br />DL: {Math.round(Number(s.dl_throughput))} kbps</>}
                      </div></Popup>
                    </CircleMarker>
                  ))
                )}
              </MapContainer>
              <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, bgcolor: 'background.paper', borderRadius: 2, p: 1.5, boxShadow: 2, opacity: 0.92 }}>
                {data.map((d, idx) => (
                  <Stack key={idx} direction="row" spacing={0.5} alignItems="center" mb={0.3}>
                    <Box sx={{ width: 14, height: 4, bgcolor: OPERATOR_COLORS[idx], borderRadius: 1 }} />
                    <Typography variant="caption" fontWeight={600}>{d.meta.operator_name}</Typography>
                  </Stack>
                ))}
              </Box>
            </CardContent>
          </Card>
        </>
      )}

      {!testA || !testB ? (
        <Alert severity="info">Select two drive tests to compare operator performance side-by-side.</Alert>
      ) : testA === testB ? (
        <Alert severity="warning">Please select two different drive tests.</Alert>
      ) : null}
    </Stack>
  );
}

// ─── Tab: Coverage Gaps ───────────────────────────────────────────────────
function GapsTab({ tests, tileVariant }) {
  const [testId, setTestId] = useState('');
  const [threshold, setThreshold] = useState(-100);
  const [gaps, setGaps] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!testId) return;
    setLoading(true);
    get(`/drive-tests/${testId}/coverage-gaps?threshold=${threshold}`)
      .then((r) => setGaps(r.data))
      .catch(() => setGaps([]))
      .finally(() => setLoading(false));
  }, [testId, threshold]);

  const testMeta = tests.find((t) => t.drive_test_id === testId);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 300 }}>
          <InputLabel>Drive Test</InputLabel>
          <Select label="Drive Test" value={testId} onChange={(e) => setTestId(e.target.value)}>
            {tests.map((t) => (
              <MenuItem key={t.drive_test_id} value={t.drive_test_id}>
                {t.operator_name} — {t.test_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ minWidth: 200 }}>
          <Typography variant="caption" color="text.secondary">RSRP Threshold: {threshold} dBm</Typography>
          <Slider size="small" value={threshold} onChange={(_, v) => setThreshold(v)}
            min={-120} max={-80} step={5}
            marks={[{ value: -120, label: '-120' }, { value: -100, label: '-100' }, { value: -80, label: '-80' }]} />
        </Box>
      </Stack>

      {loading && <LinearProgress />}

      {gaps && (
        <>
          {gaps.length === 0 ? (
            <Alert severity="success">No coverage gaps found below {threshold} dBm threshold.</Alert>
          ) : (
            <>
              <Alert severity="warning">{gaps.length} coverage gap{gaps.length > 1 ? 's' : ''} detected below {threshold} dBm for {testMeta?.operator_name}.</Alert>

              <Card sx={{ height: 400 }}>
                <CardContent sx={{ height: '100%', p: '0 !important', position: 'relative' }}>
                  <MapContainer center={[gaps[0].centerLat, gaps[0].centerLon]} zoom={13}
                    style={{ height: '100%', width: '100%' }}>
                    <TileLayer url={`https://{s}.basemaps.cartocdn.com/${tileVariant}/{z}/{x}/{y}{r}.png`}
                      attribution="&copy; CARTO" />
                    {gaps.map((g, idx) => (
                      <Circle key={idx}
                        center={[g.centerLat, g.centerLon]}
                        radius={Math.max(150, g.length * 30)}
                        pathOptions={{ color: '#e0413b', fillColor: '#e0413b', fillOpacity: 0.25, weight: 2 }}>
                        <Popup><div style={{ fontSize: 11 }}>
                          <strong>Coverage Gap #{idx + 1}</strong><br />
                          {g.length} weak samples<br />
                          Min RSRP: {g.minRsrp} dBm
                        </div></Popup>
                      </Circle>
                    ))}
                    {gaps.flatMap((g) => g.samples.map((s) => (
                      <CircleMarker key={s.sample_id}
                        center={[Number(s.latitude), Number(s.longitude)]}
                        radius={4}
                        pathOptions={{ color: rsrpColor(Number(s.rsrp)), fillColor: rsrpColor(Number(s.rsrp)), fillOpacity: 0.9, weight: 0.5 }} />
                    )))}
                  </MapContainer>
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell align="right">Samples</TableCell>
                        <TableCell align="right">Min RSRP</TableCell>
                        <TableCell>Severity</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gaps.map((g, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <Typography variant="caption">{g.centerLat.toFixed(5)}, {g.centerLon.toFixed(5)}</Typography>
                          </TableCell>
                          <TableCell align="right">{g.length}</TableCell>
                          <TableCell align="right" sx={{ color: rsrpColor(g.minRsrp), fontWeight: 700 }}>{g.minRsrp} dBm</TableCell>
                          <TableCell>
                            <Chip size="small" sx={{ height: 20, fontSize: 10 }}
                              color={g.minRsrp < -110 ? 'error' : 'warning'}
                              label={g.minRsrp < -110 ? 'Critical' : 'Moderate'} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </Stack>
  );
}

// ─── Tab: Compliance ──────────────────────────────────────────────────────
function ComplianceTab({ tests }) {
  const [selectedTests, setSelectedTests] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedTests.length) { setResults([]); return; }
    setLoading(true);
    Promise.all(selectedTests.map((id) => get(`/drive-tests/${id}/compliance`)))
      .then((res) => setResults(res.map((r) => r.data)))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [selectedTests]);

  return (
    <Stack spacing={2}>
      <FormControl size="small" fullWidth>
        <InputLabel>Select Drive Tests</InputLabel>
        <Select label="Select Drive Tests" multiple value={selectedTests}
          onChange={(e) => setSelectedTests(e.target.value)}
          renderValue={(sel) => sel.map((id) => tests.find((t) => t.drive_test_id === id)?.operator_name).join(', ')}>
          {tests.map((t) => (
            <MenuItem key={t.drive_test_id} value={t.drive_test_id}>
              {t.operator_name} — {t.test_name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {loading && <LinearProgress />}

      {results.length > 0 && (
        <Grid container spacing={2}>
          {results.map((r, idx) => (
            <Grid item xs={12} md={results.length > 1 ? 6 : 12} key={idx}>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <Chip label={r.meta.operator_name} size="small"
                      sx={{ bgcolor: colorFor(r.meta.operator_name) + '33', fontWeight: 700 }} />
                    <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>{r.meta.test_name}</Typography>
                  </Stack>

                  <ComplianceBar label={`RSRP ≥ ${r.thresholds.rsrp} dBm`} pct={r.compliance.rsrp.pct} pass={r.compliance.rsrp.pass} total={r.total} />
                  <ComplianceBar label={`RSRQ ≥ ${r.thresholds.rsrq} dB`} pct={r.compliance.rsrq.pct} pass={r.compliance.rsrq.pass} total={r.total} />
                  <ComplianceBar label={`SINR ≥ ${r.thresholds.sinr} dB`} pct={r.compliance.sinr.pct} pass={r.compliance.sinr.pass} total={r.total} />
                  <ComplianceBar label={`DL ≥ ${r.thresholds.dl} kbps`} pct={r.compliance.dl.pct} pass={r.compliance.dl.pass} total={r.total} />

                  <Divider sx={{ my: 1.5 }} />

                  <Typography variant="subtitle2" mb={1}>Coverage Distribution</Typography>
                  <CoverageDistBar dist={r.distribution} total={r.total} />

                  <Divider sx={{ my: 1.5 }} />

                  <Grid container spacing={1}>
                    <Grid item xs={4}><StatCard label="Avg RSRP" value={r.averages.rsrp} unit="dBm" color={rsrpColor(r.averages.rsrp)} /></Grid>
                    <Grid item xs={4}><StatCard label="Avg SINR" value={r.averages.sinr} unit="dB" /></Grid>
                    <Grid item xs={4}><StatCard label="Avg DL" value={r.averages.dl ? Math.round(r.averages.dl) : 'N/A'} unit="kbps" /></Grid>
                  </Grid>

                  {(r.events.callDrops > 0 || r.events.handovers > 0) && (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <Stack direction="row" spacing={3}>
                        {r.events.callDrops > 0 && (
                          <Chip icon={<WarningIcon />} label={`${r.events.callDrops} Call Drops`} color="error" variant="outlined" size="small" />
                        )}
                        <Chip label={`${r.events.handovers} Handovers`} variant="outlined" size="small" />
                      </Stack>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Compliance comparison table for multiple operators */}
      {results.length >= 2 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" mb={1}>Compliance Comparison</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>KPI Threshold</TableCell>
                  {results.map((r, i) => (
                    <TableCell key={i} align="center">{r.meta.operator_name}</TableCell>
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
                    <TableRow key={kpi}>
                      <TableCell>{label}</TableCell>
                      {results.map((r, i) => {
                        const pct = r.compliance[kpi].pct;
                        const color = pct >= 95 ? '#2e9e5b' : pct >= 80 ? '#e6a700' : '#e0413b';
                        return (
                          <TableCell key={i} align="center" sx={{ fontWeight: pct === best ? 700 : 400, color }}>
                            {pct}%
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
    </Stack>
  );
}

// ─── Tab: Route Segments ──────────────────────────────────────────────────
function SegmentsTab({ tests, tileVariant }) {
  const [testId, setTestId] = useState('');
  const [segments, setSegments] = useState(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <Stack spacing={2}>
      <FormControl size="small" sx={{ minWidth: 300 }}>
        <InputLabel>Drive Test</InputLabel>
        <Select label="Drive Test" value={testId} onChange={(e) => setTestId(e.target.value)}>
          {tests.map((t) => (
            <MenuItem key={t.drive_test_id} value={t.drive_test_id}>
              {t.operator_name} — {t.test_name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {loading && <LinearProgress />}

      {segments && segments.length > 0 && (
        <>
          {worst.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" mb={1}>5 Worst Performing Segments</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Segment</TableCell>
                      <TableCell align="right">Avg RSRP</TableCell>
                      <TableCell align="right">Min RSRP</TableCell>
                      <TableCell align="right">Avg SINR</TableCell>
                      <TableCell align="right">Avg DL</TableCell>
                      <TableCell>Coverage Mix</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {worst.map((s, idx) => {
                      const total = s.sampleCount;
                      return (
                        <TableRow key={s.index}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>#{s.index + 1} ({s.distanceKm} km)</TableCell>
                          <TableCell align="right" sx={{ color: rsrpColor(s.avgRsrp), fontWeight: 700 }}>{s.avgRsrp}</TableCell>
                          <TableCell align="right" sx={{ color: rsrpColor(s.minRsrp) }}>{s.minRsrp}</TableCell>
                          <TableCell align="right">{s.avgSinr}</TableCell>
                          <TableCell align="right">{s.avgDl ? Math.round(s.avgDl) : '—'}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', height: 12, width: 100, borderRadius: 1, overflow: 'hidden' }}>
                              {[
                                { count: s.coverage.excellent, color: RSRP_COLORS[0].color },
                                { count: s.coverage.good, color: RSRP_COLORS[1].color },
                                { count: s.coverage.fair, color: RSRP_COLORS[2].color },
                                { count: s.coverage.poor, color: RSRP_COLORS[3].color },
                                { count: s.coverage.noSignal, color: RSRP_COLORS[4].color },
                              ].map((c, i) => (
                                <Box key={i} sx={{ width: `${(c.count / total) * 100}%`, bgcolor: c.color }} />
                              ))}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Segment map */}
          <Card sx={{ height: 400 }}>
            <CardContent sx={{ height: '100%', p: '0 !important' }}>
              <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer url={`https://{s}.basemaps.cartocdn.com/${tileVariant}/{z}/{x}/{y}{r}.png`}
                  attribution="&copy; CARTO" />
                <FlyTo center={mapCenter} zoom={12} />
                {segments.map((s) => (
                  <CircleMarker key={s.index}
                    center={[s.centerLat, s.centerLon]}
                    radius={10}
                    pathOptions={{ color: rsrpColor(s.avgRsrp), fillColor: rsrpColor(s.avgRsrp), fillOpacity: 0.8, weight: 1.5 }}>
                    <Popup><div style={{ fontSize: 11, minWidth: 140 }}>
                      <strong>Segment #{s.index + 1}</strong><br />
                      Avg RSRP: {s.avgRsrp} dBm<br />
                      Avg SINR: {s.avgSinr} dB<br />
                      {s.avgDl && <>Avg DL: {Math.round(s.avgDl)} kbps<br /></>}
                      Distance: {s.distanceKm} km
                    </div></Popup>
                  </CircleMarker>
                ))}
                {segments.map((s) => (
                  <Polyline key={`line-${s.index}`}
                    positions={[[s.startLat, s.startLon], [s.endLat, s.endLon]]}
                    pathOptions={{ color: rsrpColor(s.avgRsrp), weight: 5, opacity: 0.6 }} />
                ))}
              </MapContainer>
            </CardContent>
          </Card>

          {/* Full segment table */}
          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Seg</TableCell>
                    <TableCell align="right">Km</TableCell>
                    <TableCell align="right">RSRP</TableCell>
                    <TableCell align="right">SINR</TableCell>
                    <TableCell align="right">DL</TableCell>
                    <TableCell align="right">Exc</TableCell>
                    <TableCell align="right">Good</TableCell>
                    <TableCell align="right">Fair</TableCell>
                    <TableCell align="right">Poor</TableCell>
                    <TableCell align="right">None</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {segments.map((s) => (
                    <TableRow key={s.index} sx={{ bgcolor: s.avgRsrp < -105 ? 'error.main' + '11' : 'transparent' }}>
                      <TableCell>#{s.index + 1}</TableCell>
                      <TableCell align="right">{s.distanceKm}</TableCell>
                      <TableCell align="right" sx={{ color: rsrpColor(s.avgRsrp), fontWeight: 600 }}>{s.avgRsrp}</TableCell>
                      <TableCell align="right">{s.avgSinr}</TableCell>
                      <TableCell align="right">{s.avgDl ? Math.round(s.avgDl) : '—'}</TableCell>
                      <TableCell align="right" sx={{ color: RSRP_COLORS[0].color }}>{s.coverage.excellent}</TableCell>
                      <TableCell align="right" sx={{ color: RSRP_COLORS[1].color }}>{s.coverage.good}</TableCell>
                      <TableCell align="right" sx={{ color: RSRP_COLORS[2].color }}>{s.coverage.fair}</TableCell>
                      <TableCell align="right" sx={{ color: RSRP_COLORS[3].color }}>{s.coverage.poor}</TableCell>
                      <TableCell align="right" sx={{ color: RSRP_COLORS[4].color }}>{s.coverage.noSignal}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  );
}

function getDateRange(preset) {
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  switch (preset) {
    case 'day': return { from: fmt(today), to: fmt(today) };
    case 'week': { const d = new Date(today); d.setDate(d.getDate() - 7); return { from: fmt(d), to: fmt(today) }; }
    case 'month': { const d = new Date(today); d.setMonth(d.getMonth() - 1); return { from: fmt(d), to: fmt(today) }; }
    case '3months': { const d = new Date(today); d.setMonth(d.getMonth() - 3); return { from: fmt(d), to: fmt(today) }; }
    default: return { from: '', to: '' };
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function DriveTestAnalytics() {
  const [tab, setTab] = useState(0);
  const [allTests, setAllTests] = useState(null);
  const [operators, setOperators] = useState([]);
  const [filterOp, setFilterOp] = useState('all');
  const [datePreset, setDatePreset] = useState('3months');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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
      if (dateTo && t.test_date > dateTo) return false;
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <CompareArrowsIcon color="primary" />
        <Typography variant="h5" sx={{ flex: 1 }}>Drive Test Analytics</Typography>
        <Button size="small" startIcon={<DownloadIcon />} disabled={!tests?.length}
          onClick={() => exportCsv('drive_test_analytics.csv', [
            { key: 'test_name', label: 'Test Name' }, { key: 'operator_name', label: 'Operator' },
            { key: 'test_date', label: 'Date' }, { key: 'route_type', label: 'Route' },
            { key: 'technology', label: 'Tech' }, { key: 'sample_count', label: 'Samples' },
            { key: 'avg_rsrp', label: 'Avg RSRP' }, { key: 'avg_sinr', label: 'Avg SINR' },
            { key: 'avg_dl_throughput', label: 'Avg DL Throughput' },
          ], tests)}>Export</Button>
      </Stack>

      {/* Filters row */}
      <Card>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Operator</InputLabel>
              <Select label="Operator" value={filterOp} onChange={(e) => setFilterOp(e.target.value)}>
                <MenuItem value="all">All Operators</MenuItem>
                {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
              </Select>
            </FormControl>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

            <Stack direction="row" spacing={1} alignItems="center">
              <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <ToggleButtonGroup size="small" exclusive value={datePreset}
                onChange={(_, v) => { if (v) setDatePreset(v); }}>
                <ToggleButton value="day">Day</ToggleButton>
                <ToggleButton value="week">Week</ToggleButton>
                <ToggleButton value="month">Month</ToggleButton>
                <ToggleButton value="3months">3 Months</ToggleButton>
                <ToggleButton value="custom">Custom</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {datePreset === 'custom' && (
              <Stack direction="row" spacing={1}>
                <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
                  value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
                  value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </Stack>
            )}

            <Chip label={`${tests?.length || 0} tests`} size="small" variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
        <Tab icon={<CompareArrowsIcon />} iconPosition="start" label="Operator Comparison" />
        <Tab icon={<WarningIcon />} iconPosition="start" label="Coverage Gaps" />
        <Tab icon={<VerifiedIcon />} iconPosition="start" label="Compliance" />
        <Tab icon={<SegmentIcon />} iconPosition="start" label="Route Segments" />
      </Tabs>

      {tests && tests.length > 0 ? (
        <>
          {tab === 0 && <CompareTab tests={tests} tileVariant={tileVariant} />}
          {tab === 1 && <GapsTab tests={tests} tileVariant={tileVariant} />}
          {tab === 2 && <ComplianceTab tests={tests} />}
          {tab === 3 && <SegmentsTab tests={tests} tileVariant={tileVariant} />}
        </>
      ) : (
        <Alert severity="info">No drive tests match the selected filters. Adjust the operator or date range.</Alert>
      )}
    </Box>
  );
}
