import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box, Card, CardContent, Typography, Stack, Grid, Chip,
  FormControl, InputLabel, Select, MenuItem, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Paper, LinearProgress,
} from '@mui/material';
import RouteIcon        from '@mui/icons-material/Route';
import EmojiEventsIcon  from '@mui/icons-material/EmojiEvents';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { get } from '../api/client';
import { Loading } from '../components/ui';

const QUALITY_COLOR = {
  good:    '#2e7d32',
  fair:    '#f9a825',
  poor:    '#e65100',
  dead:    '#880e4f',
  unknown: '#9e9e9e',
};

function FitRoute({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    const lats = points.map((p) => p.lat);
    const lons = points.map((p) => p.lon);
    map.fitBounds([
      [Math.min(...lats) - 0.005, Math.min(...lons) - 0.005],
      [Math.max(...lats) + 0.005, Math.max(...lons) + 0.005],
    ], { padding: [30, 30] });
  }, [points, map]);
  return null;
}

function KpiCard({ label, value, sub, color, icon }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              {label}
            </Typography>
            <Typography variant="h6" fontWeight={800} sx={{ color: color || 'text.primary', lineHeight: 1.1 }}>
              {value ?? '—'}
            </Typography>
            {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
          </Box>
          {icon && <Box sx={{ color: color || 'action.active', opacity: 0.5, mt: 0.3 }}>{icon}</Box>}
        </Stack>
      </CardContent>
    </Card>
  );
}

function rsrpTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <Box sx={{ bgcolor: 'background.paper', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, fontSize: 12 }}>
      <strong>Km {label}</strong><br />
      RSRP: {d?.avgRsrp} dBm<br />
      Quality: <span style={{ color: QUALITY_COLOR[d?.quality] }}>{d?.quality}</span><br />
      Samples: {d?.sampleCount}
    </Box>
  );
}

export default function DriveTestCorridor() {
  const [tests, setTests]           = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [opFilter, setOpFilter]     = useState('');
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [mapMetric, setMapMetric]   = useState('rsrp');

  useEffect(() => {
    get('/drive-tests/corridor/tests').then((r) => {
      setTests(r.data);
      if (r.data.length) setSelectedId(r.data[0].drive_test_id);
    });
  }, []);

  const operators = useMemo(() => [...new Set(tests.map((t) => t.operator_name))], [tests]);
  const visibleTests = useMemo(
    () => opFilter ? tests.filter((t) => t.operator_name === opFilter) : tests,
    [tests, opFilter],
  );

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    get(`/drive-tests/corridor/${selectedId}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const routeColor = (rsrp) => {
    if (rsrp == null) return QUALITY_COLOR.unknown;
    if (rsrp >= -90)  return QUALITY_COLOR.good;
    if (rsrp >= -100) return QUALITY_COLOR.fair;
    if (rsrp >= -110) return QUALITY_COLOR.poor;
    return QUALITY_COLOR.dead;
  };

  // Build polyline segments colored by quality
  const coloredSegments = data?.segments.map((seg) => ({
    positions: seg.points.map((p) => [p.lat, p.lon]),
    color: QUALITY_COLOR[seg.quality],
    seg,
  })) ?? [];

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <RouteIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>Corridor &amp; Route Analysis</Typography>
      </Stack>

      {/* Drive test selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            {/* Operator filter chips */}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={1}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Filter by operator:
              </Typography>
              <Chip
                label="All"
                size="small"
                onClick={() => setOpFilter('')}
                color={opFilter === '' ? 'primary' : 'default'}
                variant={opFilter === '' ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
              {operators.map((op) => (
                <Chip
                  key={op}
                  label={op}
                  size="small"
                  onClick={() => {
                    const next = opFilter === op ? '' : op;
                    setOpFilter(next);
                    const firstOfOp = tests.find((t) => !next || t.operator_name === next);
                    if (firstOfOp) setSelectedId(firstOfOp.drive_test_id);
                  }}
                  color={opFilter === op ? 'primary' : 'default'}
                  variant={opFilter === op ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
              <Typography variant="caption" color="text.secondary" ml="auto">
                {visibleTests.length} campaigns
              </Typography>
            </Stack>

            {/* Campaign selector */}
            <FormControl size="small" sx={{ minWidth: 400, maxWidth: '100%' }}>
              <InputLabel>Select Drive Test Campaign</InputLabel>
              <Select label="Select Drive Test Campaign" value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}>
                {visibleTests.map((t) => (
                  <MenuItem key={t.drive_test_id} value={t.drive_test_id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">{t.operator_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        — {t.test_date} — Score: {Number(t.overall_score).toFixed(1)}
                        — {t.sample_count} samples
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {data && (
        <>
          {/* KPI summary */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}>
              <KpiCard label="Route Length" value={`${data.totalDistKm} km`}
                icon={<RouteIcon />} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard label="Total Samples" value={data.totalSamples.toLocaleString()} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard label="Best Segment" color="#2e7d32" icon={<EmojiEventsIcon />}
                value={data.stats?.bestSegment
                  ? `${data.stats.bestSegment.avgRsrp} dBm`
                  : '—'}
                sub={data.stats?.bestSegment
                  ? `Km ${data.stats.bestSegment.fromKm}–${data.stats.bestSegment.toKm}`
                  : ''} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard label="Worst Segment" color="#c62828" icon={<WarningAmberIcon />}
                value={data.stats?.worstSegment
                  ? `${data.stats.worstSegment.avgRsrp} dBm`
                  : '—'}
                sub={data.stats?.worstSegment
                  ? `Km ${data.stats.worstSegment.fromKm}–${data.stats.worstSegment.toKm}`
                  : ''} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard label="Avg RSRP"
                value={data.stats?.avgRsrp != null ? `${data.stats.avgRsrp} dBm` : '—'} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard label="Dead Zone Segments"
                value={`${data.stats?.deadZonePct ?? 0}%`} color="#880e4f" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard label="Poor Coverage Segments"
                value={`${data.stats?.poorPct ?? 0}%`} color="#e65100" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard label="Route Segments" value={data.segments.length} />
            </Grid>
          </Grid>

          {/* Map */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Box sx={{ height: 460 }}>
                <MapContainer center={[8.46, -11.78]} zoom={10}
                  style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors' />
                  <FitRoute points={data.routePoints} />
                  {coloredSegments.map((cs, i) =>
                    cs.positions.length >= 2 && (
                      <Polyline key={i} positions={cs.positions}
                        pathOptions={{ color: cs.color, weight: 4, opacity: 0.85 }}>
                        <Popup>
                          <strong>Segment {cs.seg.segIndex}</strong><br />
                          Km {cs.seg.fromKm} – {cs.seg.toKm}<br />
                          Avg RSRP: {cs.seg.avgRsrp} dBm<br />
                          Avg DL: {cs.seg.avgDl != null ? `${cs.seg.avgDl.toLocaleString()} kbps` : '—'}<br />
                          Coverage: {cs.seg.coveragePct}%<br />
                          Quality: <strong style={{ color: cs.color }}>{cs.seg.quality}</strong>
                        </Popup>
                      </Polyline>
                    )
                  )}
                </MapContainer>
              </Box>
              {/* Legend */}
              <Stack direction="row" spacing={2} px={2} py={1} alignItems="center" flexWrap="wrap">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Signal Quality:</Typography>
                {Object.entries(QUALITY_COLOR).filter(([k]) => k !== 'unknown').map(([k, c]) => (
                  <Stack key={k} direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 20, height: 4, borderRadius: 2, bgcolor: c }} />
                    <Typography variant="caption" textTransform="capitalize">{k}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {/* RSRP bar chart along route */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                RSRP Along Route (by km)
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.segments} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="midKm" tick={{ fontSize: 10 }}
                    label={{ value: 'Distance (km)', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                  <YAxis domain={[-130, -60]} tick={{ fontSize: 10 }}
                    label={{ value: 'RSRP (dBm)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <RTooltip content={rsrpTooltip} />
                  <ReferenceLine y={-100} stroke="#e65100" strokeDasharray="4 2"
                    label={{ value: 'Poor', fill: '#e65100', fontSize: 10 }} />
                  <ReferenceLine y={-110} stroke="#880e4f" strokeDasharray="4 2"
                    label={{ value: 'Dead', fill: '#880e4f', fontSize: 10 }} />
                  <Bar dataKey="avgRsrp" maxBarSize={24}>
                    {data.segments.map((s, i) => (
                      <Cell key={i} fill={QUALITY_COLOR[s.quality]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Segment table */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Segment Details</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                      <TableCell>#</TableCell>
                      <TableCell>From – To (km)</TableCell>
                      <TableCell>Quality</TableCell>
                      <TableCell align="right">Avg RSRP</TableCell>
                      <TableCell align="right">Min RSRP</TableCell>
                      <TableCell align="right">Avg SINR</TableCell>
                      <TableCell align="right">Avg DL (kbps)</TableCell>
                      <TableCell align="right">Coverage %</TableCell>
                      <TableCell align="right">Samples</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.segments.map((s) => (
                      <TableRow key={s.segIndex} hover
                        sx={{ bgcolor: s.quality === 'dead' ? '#ff00001a' : undefined }}>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                          {s.segIndex}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {s.fromKm} – {s.toKm}
                        </TableCell>
                        <TableCell>
                          <Chip label={s.quality} size="small" sx={{
                            bgcolor: `${QUALITY_COLOR[s.quality]}22`,
                            color:   QUALITY_COLOR[s.quality],
                            fontWeight: 700, fontSize: '0.7rem',
                            textTransform: 'capitalize',
                          }} />
                        </TableCell>
                        <TableCell align="right"
                          sx={{ fontWeight: 600, color: QUALITY_COLOR[s.quality] }}>
                          {s.avgRsrp ?? '—'}
                        </TableCell>
                        <TableCell align="right">{s.minRsrp ?? '—'}</TableCell>
                        <TableCell align="right">{s.avgSinr ?? '—'}</TableCell>
                        <TableCell align="right">
                          {s.avgDl != null ? s.avgDl.toLocaleString() : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                            <LinearProgress variant="determinate"
                              value={Math.min(100, s.coveragePct ?? 0)}
                              sx={{ width: 40, height: 5, borderRadius: 3 }} />
                            <Typography variant="caption">{s.coveragePct ?? '—'}%</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{s.sampleCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
