import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box, Card, CardContent, Typography, Stack, Grid, Chip, Alert,
  Slider, FormControl, InputLabel, Select, MenuItem, Table,
  TableHead, TableBody, TableRow, TableCell, TableContainer, Paper,
  LinearProgress,
} from '@mui/material';
import LocationOffIcon   from '@mui/icons-material/LocationOff';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import SignalCellularOffIcon from '@mui/icons-material/SignalCellularOff';
import { get } from '../api/client';
import { Loading } from '../components/ui';

const SL_CENTER = [8.46, -11.78];

const SEVERITY_COLOR = {
  critical: '#880e4f',
  severe:   '#d32f2f',
  poor:     '#f57c00',
};

function rsrpColor(rsrp) {
  if (rsrp == null) return '#9e9e9e';
  if (rsrp >= -90)  return '#2e7d32';
  if (rsrp >= -100) return '#f9a825';
  if (rsrp >= -110) return '#e65100';
  if (rsrp >= -120) return '#c62828';
  return '#880e4f';
}

function FitBounds({ clusters }) {
  const map = useMap();
  useEffect(() => {
    if (!clusters?.length) return;
    const lats = clusters.map((c) => c.lat);
    const lons = clusters.map((c) => c.lon);
    const bounds = [
      [Math.min(...lats) - 0.01, Math.min(...lons) - 0.01],
      [Math.max(...lats) + 0.01, Math.max(...lons) + 0.01],
    ];
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [clusters, map]);
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

export default function DriveTestBlackspots() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [threshold, setThreshold] = useState(-110);
  const [operatorFilter, setOp] = useState('');
  const [tableOpFilter, setTableOp] = useState('');
  const [operators, setOperators] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ threshold });
    if (operatorFilter) qs.set('operatorId', operatorFilter);
    get(`/drive-tests/blackspots?${qs}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [threshold, operatorFilter]);

  useEffect(() => {
    get('/drive-tests/corridor/tests').then((r) => {
      const ops = {};
      for (const t of r.data) ops[t.operator_name] = true;
      setOperators(Object.keys(ops));
    });
    load();
  }, []);  // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <LocationOffIcon color="error" />
        <Typography variant="h5" fontWeight={700}>Dead Zone &amp; Blackspot Mapping</Typography>
        {data && (
          <Chip label={`${data.blackspotCount} blackspot clusters`} color="error" size="small" />
        )}
      </Stack>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Operator</InputLabel>
                <Select label="Operator" value={operatorFilter}
                  onChange={(e) => setOp(e.target.value)}>
                  <MenuItem value="">All Operators</MenuItem>
                  {operators.map((op) => <MenuItem key={op} value={op}>{op}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                RSRP Threshold: <strong>{threshold} dBm</strong>
                &nbsp;(samples below this are flagged as dead zones)
              </Typography>
              <Slider
                value={threshold}
                min={-130} max={-90} step={5}
                marks={[-130,-120,-110,-100,-90].map((v) => ({ value: v, label: `${v}` }))}
                onChange={(_, v) => setThreshold(v)}
                onChangeCommitted={load}
                size="small"
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {data && (
        <>
          {/* Summary cards */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}>
              <KpiCard label="Blackspot Clusters" value={data.blackspotCount}
                color="#c62828" icon={<LocationOffIcon />} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard label="Poor Signal Samples" value={data.totalPoorSamples.toLocaleString()}
                sub={`${data.pctPoor}% of total route`} color="#e65100"
                icon={<SignalCellularOffIcon />} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard label="Worst RSRP" value={data.worstRsrp != null ? `${data.worstRsrp} dBm` : '—'}
                color="#880e4f" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard label="Total Samples" value={data.totalSamples.toLocaleString()}
                sub="completed drive tests" />
            </Grid>
          </Grid>

          {/* Map */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Box sx={{ height: 480 }}>
                <MapContainer center={SL_CENTER} zoom={9}
                  style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors' />
                  <FitBounds clusters={data.clusters} />
                  {data.clusters.map((c, i) => (
                    <CircleMarker key={i}
                      center={[c.lat, c.lon]}
                      radius={Math.max(5, Math.min(20, c.count * 0.8))}
                      pathOptions={{
                        color:       SEVERITY_COLOR[c.severity] || '#f57c00',
                        fillColor:   SEVERITY_COLOR[c.severity] || '#f57c00',
                        fillOpacity: 0.75,
                        weight:      1,
                      }}>
                      <Popup>
                        <strong>{c.severity.toUpperCase()} BLACKSPOT</strong><br />
                        Avg RSRP: {c.avgRsrp} dBm<br />
                        Min RSRP: {c.minRsrp} dBm<br />
                        Samples: {c.count}<br />
                        Operators: {c.operators.join(', ')}
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </Box>
              {/* Legend */}
              <Stack direction="row" spacing={2} px={2} py={1} alignItems="center" flexWrap="wrap">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Severity:</Typography>
                {Object.entries(SEVERITY_COLOR).map(([k, c]) => (
                  <Stack key={k} direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />
                    <Typography variant="caption" textTransform="capitalize">{k}</Typography>
                  </Stack>
                ))}
                <Typography variant="caption" color="text.secondary" ml={2}>
                  Circle size ∝ sample density
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          {/* Cluster table */}
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Blackspot Clusters (worst first)
                </Typography>
                <Chip
                  label="All Operators"
                  size="small"
                  onClick={() => setTableOp('')}
                  color={tableOpFilter === '' ? 'error' : 'default'}
                  variant={tableOpFilter === '' ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer' }}
                />
                {operators.map((op) => (
                  <Chip
                    key={op}
                    label={op}
                    size="small"
                    onClick={() => setTableOp(tableOpFilter === op ? '' : op)}
                    color={tableOpFilter === op ? 'error' : 'default'}
                    variant={tableOpFilter === op ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
                <Typography variant="caption" color="text.secondary" ml="auto">
                  {(tableOpFilter
                    ? data.clusters.filter((c) => c.operators.includes(tableOpFilter))
                    : data.clusters
                  ).length} clusters
                </Typography>
              </Stack>
              <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                      <TableCell>#</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell align="right">Avg RSRP (dBm)</TableCell>
                      <TableCell align="right">Min RSRP (dBm)</TableCell>
                      <TableCell align="right">Samples</TableCell>
                      <TableCell>Location (lat, lon)</TableCell>
                      <TableCell>Operator(s)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(tableOpFilter
                      ? data.clusters.filter((c) => c.operators.includes(tableOpFilter))
                      : data.clusters
                    ).slice(0, 100).map((c, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{i + 1}</TableCell>
                        <TableCell>
                          <Chip
                            label={c.severity}
                            size="small"
                            sx={{
                              bgcolor: `${SEVERITY_COLOR[c.severity]}22`,
                              color:   SEVERITY_COLOR[c.severity],
                              fontWeight: 700, fontSize: '0.7rem',
                              textTransform: 'capitalize',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right"
                          sx={{ fontWeight: 600, color: rsrpColor(c.avgRsrp) }}>
                          {c.avgRsrp}
                        </TableCell>
                        <TableCell align="right" sx={{ color: rsrpColor(c.minRsrp) }}>
                          {c.minRsrp}
                        </TableCell>
                        <TableCell align="right">{c.count}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {c.lat.toFixed(4)}, {c.lon.toFixed(4)}
                        </TableCell>
                        <TableCell>{c.operators.join(', ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {(tableOpFilter
                ? data.clusters.filter((c) => c.operators.includes(tableOpFilter))
                : data.clusters
              ).length > 100 && (
                <Typography variant="caption" color="text.secondary" mt={1} display="block">
                  Showing top 100 of {tableOpFilter
                    ? data.clusters.filter((c) => c.operators.includes(tableOpFilter)).length
                    : data.clusters.length
                  } clusters.
                </Typography>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
