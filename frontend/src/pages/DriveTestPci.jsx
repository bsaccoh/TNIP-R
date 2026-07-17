import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box, Card, CardContent, Typography, Stack, Grid, Chip, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, LinearProgress, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { get } from '../api/client';
import { Loading } from '../components/ui';
import { opColor } from '../theme';

const RISK_COLOR  = { high: '#c62828', medium: '#f57c00', low: '#2e7d32' };
const MAP_PALETTE = [
  '#e53935','#8e24aa','#1e88e5','#00897b','#f4511e','#3949ab',
  '#039be5','#43a047','#fb8c00','#6d4c41','#e91e63','#00acc1',
  '#7cb342','#fdd835','#546e7a','#d81b60','#5e35b1','#00b0ff',
  '#00c853','#ff6d00',
];

function pciColor(pci, pciList) {
  const idx = pciList.indexOf(pci);
  return MAP_PALETTE[idx % MAP_PALETTE.length];
}

function FitPoints({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    const lats = points.map((p) => p.lat);
    const lons = points.map((p) => p.lon);
    map.fitBounds([
      [Math.min(...lats) - 0.01, Math.min(...lons) - 0.01],
      [Math.max(...lats) + 0.01, Math.max(...lons) + 0.01],
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

export default function DriveTestPci() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [operatorFilter, setOp]   = useState('');
  const [mapFilter, setMapFilter] = useState('all'); // 'all' | 'high' | 'medium'
  const [operators, setOperators] = useState([]);

  useEffect(() => {
    get('/drive-tests/corridor/tests').then((r) => {
      const ops = {};
      for (const t of r.data) ops[t.operator_name] = t.operator_name;
      setOperators(Object.keys(ops));
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = operatorFilter ? `?operatorId=${operatorFilter}` : '';
    get(`/drive-tests/pci-analysis${qs}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [operatorFilter]);

  const sortedPcis = useMemo(
    () => data?.pcis.slice().sort((a, b) => b.sampleCount - a.sampleCount) ?? [],
    [data],
  );

  const pciIndexList = useMemo(() => sortedPcis.map((p) => p.pci), [sortedPcis]);

  const visiblePoints = useMemo(() => {
    if (!data) return [];
    if (mapFilter === 'all') return data.samplePoints;
    const riskPcis = new Set(
      data.pcis.filter((p) => p.interferenceRisk === mapFilter).map((p) => p.pci),
    );
    return data.samplePoints.filter((p) => riskPcis.has(p.pci));
  }, [data, mapFilter]);

  const top20 = sortedPcis.slice(0, 20);

  const EARFCN_COLORS = ['#1e88e5','#e53935','#43a047','#f4511e','#8e24aa'];

  if (loading) return <Loading />;
  if (!data)   return <Alert severity="error">Failed to load PCI data.</Alert>;

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <WifiTetheringIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>PCI &amp; Interference Analysis</Typography>
        <Chip label={`${data.summary.totalPcis} unique PCIs`} size="small" color="primary" variant="outlined" />
      </Stack>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Operator</InputLabel>
              <Select label="Operator" value={operatorFilter}
                onChange={(e) => setOp(e.target.value)}>
                <MenuItem value="">All Operators</MenuItem>
                {operators.map((op) => <MenuItem key={op} value={op}>{op}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Map Filter</InputLabel>
              <Select label="Map Filter" value={mapFilter}
                onChange={(e) => setMapFilter(e.target.value)}>
                <MenuItem value="all">All PCI Samples</MenuItem>
                <MenuItem value="high">High Risk Only</MenuItem>
                <MenuItem value="medium">Medium Risk Only</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Unique PCIs" value={data.summary.totalPcis}
            icon={<WifiTetheringIcon />} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="High Interference Risk" value={data.summary.highRiskCount}
            sub="PCI spread > 5 km" color="#c62828" icon={<WarningAmberIcon />} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Medium Risk" value={data.summary.medRiskCount}
            sub="PCI spread 2–5 km" color="#f57c00" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="PCI Samples" value={data.summary.totalSamples.toLocaleString()}
            sub={`of ${data.samplePoints.length <= 2000 ? data.samplePoints.length : '2000+'} shown on map`} />
        </Grid>
      </Grid>

      {data.summary.totalPcis === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No PCI data found in the drive test samples. PCI is recorded by some devices only.
        </Alert>
      )}

      {data.summary.totalPcis > 0 && (
        <>
          {/* Map + EARFCN chart side by side */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={8}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 0, height: 400, '&:last-child': { pb: 0 } }}>
                  <MapContainer center={[8.46, -11.78]} zoom={9}
                    style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors' />
                    <FitPoints points={visiblePoints} />
                    {visiblePoints.map((pt, i) => (
                      <CircleMarker key={i} center={[pt.lat, pt.lon]} radius={4}
                        pathOptions={{
                          color:       pciColor(pt.pci, pciIndexList),
                          fillColor:   pciColor(pt.pci, pciIndexList),
                          fillOpacity: 0.8,
                          weight:      0,
                        }}>
                        <Popup>
                          <strong>PCI {pt.pci}</strong><br />
                          RSRP: {pt.rsrp} dBm<br />
                          EARFCN: {pt.earfcn ?? '—'}
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} mb={1}>
                    EARFCN / Band Distribution
                  </Typography>
                  {data.earfcnBreakdown.length ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={data.earfcnBreakdown}
                          dataKey="sampleCount"
                          cx="50%" cy="50%"
                          innerRadius={40}
                          outerRadius={68}
                          paddingAngle={2}
                        >
                          {data.earfcnBreakdown.map((_, i) => (
                            <Cell key={i} fill={EARFCN_COLORS[i % EARFCN_COLORS.length]} />
                          ))}
                        </Pie>
                        <RTooltip
                          formatter={(v, _name, props) => [
                            `${v} samples · ${props.payload.pciCount} PCIs`,
                            `EARFCN ${props.payload.earfcn ?? 'Unknown'}${props.payload.band ? ` (${props.payload.band})` : ''}`,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No EARFCN data</Typography>
                  )}
                  <Box mt={1.5}>
                    {data.earfcnBreakdown.map((e, i) => (
                      <Stack key={i} direction="row" justifyContent="space-between"
                        alignItems="center" py={0.4}
                        sx={{ borderBottom: '1px solid', borderColor: 'divider',
                              '&:last-child': { borderBottom: 'none' } }}>
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <Box sx={{
                            width: 10, height: 10, borderRadius: '50%',
                            bgcolor: EARFCN_COLORS[i % EARFCN_COLORS.length],
                            flexShrink: 0,
                          }} />
                          <Typography variant="caption" fontWeight={500}>
                            EARFCN {e.earfcn ?? 'Unknown'}{e.band ? ` (${e.band})` : ''}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <Typography variant="caption" color="text.secondary">
                            {e.pciCount} PCIs
                          </Typography>
                          <Typography variant="caption" color="text.secondary">·</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {e.sampleCount} samples
                          </Typography>
                        </Stack>
                      </Stack>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Top PCIs bar chart */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Top 20 PCIs by Sample Count
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={top20} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="pci" tick={{ fontSize: 10 }}
                    label={{ value: 'PCI', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RTooltip formatter={(v, n, p) => [
                    `${v} samples`,
                    `PCI ${p.payload.pci} (${p.payload.interferenceRisk} risk)`,
                  ]} />
                  <Bar dataKey="sampleCount" maxBarSize={28}>
                    {top20.map((p, i) => (
                      <Cell key={i} fill={RISK_COLOR[p.interferenceRisk]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <Stack direction="row" spacing={2} mt={1}>
                {Object.entries(RISK_COLOR).map(([k, c]) => (
                  <Stack key={k} direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 10, height: 10, bgcolor: c, borderRadius: 0.5 }} />
                    <Typography variant="caption" textTransform="capitalize">{k} risk</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {/* PCI table */}
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                <Typography variant="subtitle1" fontWeight={600}>
                  PCI Details &amp; Interference Risk
                </Typography>
                <Chip
                  label="All Operators"
                  size="small"
                  onClick={() => setOp('')}
                  color={operatorFilter === '' ? 'primary' : 'default'}
                  variant={operatorFilter === '' ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer' }}
                />
                {operators.map((op) => (
                  <Chip
                    key={op}
                    label={op}
                    size="small"
                    onClick={() => setOp(operatorFilter === op ? '' : op)}
                    color={operatorFilter === op ? 'primary' : 'default'}
                    variant={operatorFilter === op ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
                <Typography variant="caption" color="text.secondary" ml="auto">
                  {sortedPcis.length} PCIs
                </Typography>
              </Stack>
              <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                      <TableCell>PCI</TableCell>
                      <TableCell>EARFCN</TableCell>
                      <TableCell>Band</TableCell>
                      <TableCell align="right">Samples</TableCell>
                      <TableCell align="right">Avg RSRP</TableCell>
                      <TableCell align="right">Avg SINR</TableCell>
                      <TableCell align="right">Spread (km)</TableCell>
                      <TableCell>Interference Risk</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedPcis.map((p) => (
                      <TableRow key={p.pci} hover>
                        <TableCell>
                          <Stack direction="row" spacing={0.6} alignItems="center">
                            <Box sx={{
                              width: 8, height: 8, borderRadius: '50%',
                              bgcolor: pciColor(p.pci, pciIndexList),
                            }} />
                            <Typography variant="body2" fontWeight={600}>{p.pci}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{p.earfcn ?? '—'}</TableCell>
                        <TableCell>{p.band ?? '—'}</TableCell>
                        <TableCell align="right">{p.sampleCount}</TableCell>
                        <TableCell align="right"
                          sx={{ color: p.avgRsrp >= -100 ? '#2e7d32' : '#c62828' }}>
                          {p.avgRsrp} dBm
                        </TableCell>
                        <TableCell align="right">{p.avgSinr ?? '—'}</TableCell>
                        <TableCell align="right">{p.spreadKm}</TableCell>
                        <TableCell>
                          <Chip label={p.interferenceRisk} size="small" sx={{
                            bgcolor: `${RISK_COLOR[p.interferenceRisk]}22`,
                            color:   RISK_COLOR[p.interferenceRisk],
                            fontWeight: 700, fontSize: '0.7rem',
                            textTransform: 'capitalize',
                          }} />
                        </TableCell>
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
