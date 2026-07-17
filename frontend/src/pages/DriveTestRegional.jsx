import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Table, TableBody, TableCell, TableHead, TableRow,
  Alert, Stack, LinearProgress, Chip, Tabs, Tab, Select, MenuItem, FormControl, InputLabel,
  Button, ButtonGroup, Paper, Tooltip, IconButton, Collapse, TableContainer,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import MapIcon from '@mui/icons-material/Map';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { get, api } from '../api/client';

const COLORS = { Excellent: '#2e9e5b', Good: '#66bb6a', Fair: '#e6a700', Poor: '#ef6c00', 'No Signal': '#e0413b' };
const OP_COLORS = ['#1976d2', '#e53935', '#43a047', '#ff9800', '#8e24aa', '#00897b'];
const STATUS_COLOR = s => s === 'Pass' ? '#2e9e5b' : s === 'Warning' ? '#e6a700' : '#e0413b';

// Sierra Leone operator brand colors (matched loosely on name)
const OPERATOR_BRAND = [
  { match: 'orange', color: '#ff7900' },
  { match: 'africell', color: '#e4002b' },
  { match: 'qcell', color: '#00a651' },
  { match: 'q-cell', color: '#00a651' },
  { match: 'sierratel', color: '#005daa' },
  { match: 'smart', color: '#6a1b9a' },
];
function operatorColor(name, index = 0) {
  const key = String(name || '').toLowerCase();
  const brand = OPERATOR_BRAND.find(b => key.includes(b.match));
  return brand ? brand.color : OP_COLORS[index % OP_COLORS.length];
}

function SectionTitle({ children }) {
  return <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: 'primary.main' }}>{children}</Typography>;
}

function MapBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points?.length) {
      const lats = points.map(p => p.lat);
      const lons = points.map(p => p.lon);
      map.fitBounds([[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]], { padding: [30, 30] });
    }
  }, [points, map]);
  return null;
}

function SignalMap({ mapData }) {
  if (!mapData?.length) return <Alert severity="info">No map data available</Alert>;
  const rsrpColor = v => v >= -80 ? '#2e9e5b' : v >= -90 ? '#66bb6a' : v >= -100 ? '#e6a700' : v >= -110 ? '#ef6c00' : '#e0413b';
  return (
    <Box sx={{ height: 450, borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
      <MapContainer center={[8.5, -12.0]} zoom={8} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
        <MapBounds points={mapData} />
        {mapData.map((p, i) => (
          <CircleMarker key={i} center={[p.lat, p.lon]} radius={4} pathOptions={{ color: rsrpColor(p.rsrp), fillColor: rsrpColor(p.rsrp), fillOpacity: 0.8, weight: 1 }}>
            <Popup>
              <strong>{p.operatorName}</strong><br />
              RSRP: {p.rsrp} dBm<br />
              SINR: {p.sinr} dB<br />
              DL: {p.dl ? (p.dl / 1000).toFixed(1) + ' Mbps' : 'N/A'}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </Box>
  );
}

function RegionOverviewTab({ overview, onSelectRegion }) {
  if (!overview) return null;
  const { regions, summary } = overview;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={3}>
        <Card sx={{ bgcolor: 'primary.main', color: '#fff' }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Total Regions</Typography>
            <Typography variant="h4" fontWeight={800}>{summary.totalRegions}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={3}>
        <Card sx={{ bgcolor: 'primary.main', color: '#fff' }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Total Tests</Typography>
            <Typography variant="h4" fontWeight={800}>{summary.totalTests}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={3}>
        <Card sx={{ bgcolor: 'primary.main', color: '#fff' }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Total Samples</Typography>
            <Typography variant="h4" fontWeight={800}>{summary.totalSamples?.toLocaleString()}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={3}>
        <Card sx={{ bgcolor: 'primary.main', color: '#fff' }}>
          <CardContent>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Avg Score</Typography>
            <Typography variant="h4" fontWeight={800}>{summary.overallAvgScore}/100</Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <SectionTitle>Regional Performance Summary</SectionTitle>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(25,118,210,0.08)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Region</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Tests</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Samples</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Distance (km)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Avg RSRP</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Avg SINR</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Avg DL</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Coverage %</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Score</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {regions.map(r => (
                  <TableRow key={r.regionId} hover sx={{ cursor: 'pointer' }} onClick={() => onSelectRegion(r.regionId)}>
                    <TableCell sx={{ fontWeight: 600 }}>{r.regionName}</TableCell>
                    <TableCell align="right">{r.totalTests}</TableCell>
                    <TableCell align="right">{r.totalSamples?.toLocaleString()}</TableCell>
                    <TableCell align="right">{r.totalDistance}</TableCell>
                    <TableCell align="right">{r.avgRsrp} dBm</TableCell>
                    <TableCell align="right">{r.avgSinr} dB</TableCell>
                    <TableCell align="right">{r.avgDl} Mbps</TableCell>
                    <TableCell align="right">{r.coveragePct}%</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{r.avgScore}</TableCell>
                    <TableCell>
                      <Chip label={r.status} size="small" sx={{ bgcolor: `${STATUS_COLOR(r.status)}22`, color: STATUS_COLOR(r.status), fontWeight: 'bold', height: 22 }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <SectionTitle>Regional Score Comparison</SectionTitle>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={regions.map(r => ({ name: r.regionName, score: r.avgScore }))}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <RTooltip />
                <Bar dataKey="score" name="Avg Score">
                  {regions.map((r, i) => (
                    <Cell key={i} fill={r.avgScore >= 75 ? '#2e9e5b' : r.avgScore >= 60 ? '#e6a700' : '#e0413b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <SectionTitle>Coverage by Region</SectionTitle>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={regions.map(r => ({ name: r.regionName, coverage: r.coveragePct }))}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} unit="%" />
                <RTooltip />
                <Bar dataKey="coverage" name="Coverage %">
                  {regions.map((r, i) => (
                    <Cell key={i} fill={r.coveragePct >= 95 ? '#2e9e5b' : r.coveragePct >= 80 ? '#66bb6a' : r.coveragePct >= 60 ? '#e6a700' : '#e0413b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <SectionTitle>Operators per Region</SectionTitle>
            {regions.map(r => (
              <Box key={r.regionId} mb={2}>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>{r.regionName}</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {r.operators?.map((op, i) => (
                    <Chip key={op.operatorId} label={`${op.operatorName}: ${op.avgScore}/100 (${op.tests} tests)`}
                      sx={{ bgcolor: `${operatorColor(op.operatorName, i)}22`, color: operatorColor(op.operatorName, i), fontWeight: 600 }} />
                  ))}
                  {(!r.operators || r.operators.length === 0) && <Typography variant="body2" color="text.secondary">No operator data</Typography>}
                </Stack>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

function RegionDetailTab({ detail }) {
  if (!detail) return <Alert severity="info">Select a region to view details</Alert>;
  const { region, overview, operators, comparisonChart, coverageDistribution, problemAreas, mapData, aiSummary } = detail;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h5" fontWeight={800} mb={1}>{region.regionName} - Regional Analysis</Typography>
        <Stack direction="row" spacing={2} mb={2}>
          <Chip label={`${overview.totalTests} Tests`} color="primary" />
          <Chip label={`${overview.totalSamples?.toLocaleString()} Samples`} color="primary" variant="outlined" />
          <Chip label={`${overview.totalDistance} km`} color="primary" variant="outlined" />
          <Chip label={`Score: ${overview.avgScore}/100 (${overview.rating})`}
            sx={{ bgcolor: `${overview.avgScore >= 75 ? '#2e9e5b' : overview.avgScore >= 60 ? '#e6a700' : '#e0413b'}22`,
                  color: overview.avgScore >= 75 ? '#2e9e5b' : overview.avgScore >= 60 ? '#e6a700' : '#e0413b', fontWeight: 'bold' }} />
        </Stack>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <SectionTitle>Operator KPI Comparison</SectionTitle>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(25,118,210,0.08)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Operator</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Tests</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Samples</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Avg RSRP</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Avg SINR</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Avg DL</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Coverage %</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">RSRP Pass</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">SINR Pass</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">DL Pass</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Score</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Rating</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {operators.map((op, i) => (
                  <TableRow key={op.operatorId}>
                    <TableCell sx={{ fontWeight: 600, color: operatorColor(op.operatorName, i) }}>{op.operatorName}</TableCell>
                    <TableCell align="right">{op.tests}</TableCell>
                    <TableCell align="right">{op.samples?.toLocaleString()}</TableCell>
                    <TableCell align="right">{op.kpi?.avgRsrp} dBm</TableCell>
                    <TableCell align="right">{op.kpi?.avgSinr} dB</TableCell>
                    <TableCell align="right">{op.kpi?.avgDl} Mbps</TableCell>
                    <TableCell align="right">{op.coverage?.coveragePct}%</TableCell>
                    <TableCell align="right">{op.compliance?.rsrpPass}%</TableCell>
                    <TableCell align="right">{op.compliance?.sinrPass}%</TableCell>
                    <TableCell align="right">{op.compliance?.dlPass}%</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{op.avgScore}</TableCell>
                    <TableCell>
                      <Chip label={op.rating} size="small"
                        sx={{ bgcolor: `${op.avgScore >= 75 ? '#2e9e5b' : op.avgScore >= 60 ? '#e6a700' : '#e0413b'}22`,
                              color: op.avgScore >= 75 ? '#2e9e5b' : op.avgScore >= 60 ? '#e6a700' : '#e0413b', fontWeight: 'bold', height: 22 }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      {comparisonChart && operators.length > 1 && (
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <SectionTitle>KPI Comparison</SectionTitle>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonChart.labels?.map((name, i) => ({
                  name,
                  RSRP: Math.abs(comparisonChart.datasets?.rsrp?.[i] || 0),
                  SINR: comparisonChart.datasets?.sinr?.[i] || 0,
                  'DL (Mbps)': comparisonChart.datasets?.dl?.[i] || 0,
                }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <RTooltip />
                  <Legend />
                  <Bar dataKey="RSRP" fill="#1976d2" />
                  <Bar dataKey="SINR" fill="#43a047" />
                  <Bar dataKey="DL (Mbps)" fill="#ff9800" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      )}

      {coverageDistribution?.length > 0 && (
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <SectionTitle>Coverage Distribution by Operator</SectionTitle>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={coverageDistribution}>
                  <XAxis dataKey="class" tick={{ fontSize: 11 }} />
                  <YAxis unit="%" />
                  <RTooltip />
                  <Legend />
                  {operators.map((op, i) => (
                    <Bar key={op.operatorId} dataKey={op.operatorName} fill={operatorColor(op.operatorName, i)} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      )}

      {problemAreas?.length > 0 && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <SectionTitle>Problem Areas</SectionTitle>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(25,118,210,0.08)' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Location Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Coordinates</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Operator</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Avg RSRP</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {problemAreas.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {p.locationName}
                        {p.siteDistanceKm != null && (
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            (~{p.siteDistanceKm} km)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{p.lat}, {p.lon}</TableCell>
                      <TableCell>{p.operatorName}</TableCell>
                      <TableCell align="right">{p.avgRsrp} dBm</TableCell>
                      <TableCell>
                        <Chip label={p.severity} size="small"
                          sx={{ bgcolor: p.severity === 'High' ? '#e0413b22' : '#e6a70022',
                                color: p.severity === 'High' ? '#e0413b' : '#e6a700', fontWeight: 'bold', height: 22 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      )}

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <SectionTitle>Drive Test Coverage Map</SectionTitle>
            <SignalMap mapData={mapData} />
            <Stack direction="row" spacing={2} mt={2} justifyContent="center">
              {Object.entries(COLORS).map(([label, color]) => (
                <Stack key={label} direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color }} />
                  <Typography variant="caption">{label}</Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {aiSummary && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <SectionTitle>AI Summary Analysis</SectionTitle>
              <Chip label="Generated" size="small" sx={{ mb: 2, bgcolor: 'primary.main', color: '#fff' }} />
              {aiSummary.split('\n\n').map((para, i) => (
                <Typography key={i} variant="body1" paragraph sx={{ lineHeight: 1.8 }}>{para}</Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
}

const REGION_ORDER = ['Western Area', 'Northern', 'Southern', 'Eastern'];
const SCORE_COLOR = s => s >= 75 ? '#2e9e5b' : s >= 60 ? '#e6a700' : '#e0413b';

function DistrictRow({ district }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' } }} onClick={() => setOpen(o => !o)}>
        <TableCell sx={{ width: 32 }}>
          {open ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
        </TableCell>
        <TableCell sx={{ fontWeight: 700 }}>{district.districtName}</TableCell>
        <TableCell>
          <Chip label={district.region} size="small" variant="outlined"
            sx={{ fontSize: 11, height: 20, color: 'text.secondary' }} />
        </TableCell>
        <TableCell align="right">{district.totalTests}</TableCell>
        <TableCell align="right">{district.totalSamples?.toLocaleString()}</TableCell>
        <TableCell align="right">{district.coveragePct}%</TableCell>
        <TableCell align="right" sx={{ fontWeight: 700, color: SCORE_COLOR(district.avgScore) }}>
          {district.avgScore}
        </TableCell>
        <TableCell>
          <Chip label={district.rating} size="small"
            sx={{ bgcolor: `${SCORE_COLOR(district.avgScore)}22`, color: SCORE_COLOR(district.avgScore), fontWeight: 'bold', height: 22 }} />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ p: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ m: 1, ml: 6, mb: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1, display: 'block' }}>
                Operator Breakdown — {district.districtName}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(25,118,210,0.06)' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Operator</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Tests</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Samples</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Avg RSRP (dBm)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Avg SINR (dB)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Avg DL (Mbps)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Coverage %</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Score</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Rating</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {district.operators.map((op, i) => (
                    <TableRow key={op.operatorId}>
                      <TableCell sx={{ fontWeight: 600, color: operatorColor(op.operatorName, i) }}>
                        {op.operatorName}
                      </TableCell>
                      <TableCell align="right">{op.tests}</TableCell>
                      <TableCell align="right">{op.samples?.toLocaleString()}</TableCell>
                      <TableCell align="right">{op.avgRsrp ?? 'N/A'}</TableCell>
                      <TableCell align="right">{op.avgSinr ?? 'N/A'}</TableCell>
                      <TableCell align="right">{op.avgDl ?? 'N/A'}</TableCell>
                      <TableCell align="right">{op.coveragePct}%</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: SCORE_COLOR(op.avgScore) }}>
                        {op.avgScore}
                      </TableCell>
                      <TableCell>
                        <Chip label={op.rating} size="small"
                          sx={{ bgcolor: `${SCORE_COLOR(op.avgScore)}22`, color: SCORE_COLOR(op.avgScore), fontWeight: 'bold', height: 20 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function DistrictDetailTab({ districtData }) {
  const [regionFilter, setRegionFilter] = useState('All');
  const [operatorFilter, setOperatorFilter] = useState('All');

  if (!districtData) return <LinearProgress />;
  const { districts, operators } = districtData;

  const filtered = districts.filter(d =>
    (regionFilter === 'All' || d.region === regionFilter) &&
    (operatorFilter === 'All' || d.operators.some(o => o.operatorName === operatorFilter))
  );

  // Bar chart: top districts by avg score
  const chartData = filtered.slice(0, 15).map(d => ({ name: d.districtName, score: d.avgScore, coverage: d.coveragePct }));

  return (
    <Grid container spacing={3}>
      {/* Filters */}
      <Grid item xs={12}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle2" fontWeight={700}>Filter:</Typography>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Region</InputLabel>
            <Select value={regionFilter} label="Region" onChange={e => setRegionFilter(e.target.value)}>
              <MenuItem value="All">All Regions</MenuItem>
              {REGION_ORDER.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Operator</InputLabel>
            <Select value={operatorFilter} label="Operator" onChange={e => setOperatorFilter(e.target.value)}>
              <MenuItem value="All">All Operators</MenuItem>
              {operators.map(o => <MenuItem key={o.operatorId} value={o.operatorName}>{o.operatorName}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            {filtered.length} district{filtered.length !== 1 ? 's' : ''} shown
          </Typography>
        </Stack>
      </Grid>

      {/* Score chart */}
      {chartData.length > 0 && (
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <SectionTitle>District Score Overview</SectionTitle>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ bottom: 40 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis domain={[0, 100]} />
                  <RTooltip />
                  <Bar dataKey="score" name="Avg Score">
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={SCORE_COLOR(d.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Coverage chart */}
      {chartData.length > 0 && (
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <SectionTitle>Coverage % by District</SectionTitle>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ bottom: 40 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis domain={[0, 100]} unit="%" />
                  <RTooltip />
                  <Bar dataKey="coverage" name="Coverage %">
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.coverage >= 95 ? '#2e9e5b' : d.coverage >= 80 ? '#66bb6a' : d.coverage >= 60 ? '#e6a700' : '#e0413b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* District table with expandable operator rows */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <SectionTitle>District Details by Operator</SectionTitle>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Click a row to expand operator-level KPIs for that district.
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(25,118,210,0.08)' }}>
                    <TableCell sx={{ width: 32 }} />
                    <TableCell sx={{ fontWeight: 700 }}>District</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Region</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Tests</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Samples</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Coverage %</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Avg Score</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary" py={3}>
                          No district data matches the selected filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(d => <DistrictRow key={d.districtId} district={d} />)
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default function DriveTestRegional() {
  const [overview, setOverview] = useState(null);
  const [detail, setDetail] = useState(null);
  const [districtData, setDistrictData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    get('/drive-tests/regional/overview')
      .then(res => setOverview(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadRegionDetail = async (regionId) => {
    setSelectedRegion(regionId);
    setActiveTab(1);
    setDetailLoading(true);
    try {
      const res = await get(`/drive-tests/regional/${regionId}`);
      setDetail(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  // Default region when the Region Detail tab is opened directly:
  // prefer the first region that actually has tests, else the first region.
  const defaultRegionId = useMemo(() => {
    if (!overview?.regions?.length) return null;
    const withData = overview.regions.find(r => r.totalTests > 0);
    return (withData || overview.regions[0]).regionId;
  }, [overview]);

  const loadDistrictData = async () => {
    if (districtData) return;
    setDistrictLoading(true);
    try {
      const res = await get('/drive-tests/regional/districts');
      setDistrictData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setDistrictLoading(false);
    }
  };

  const handleTabChange = (e, v) => {
    if (v === 1 && !selectedRegion && defaultRegionId != null) {
      loadRegionDetail(defaultRegionId);
    } else if (v === 2) {
      setActiveTab(2);
      loadDistrictData();
    } else {
      setActiveTab(v);
    }
  };

  const handleExport = async (format, regionId = null) => {
    setExporting(format);
    try {
      const url = `/drive-tests/report/${format}${regionId ? `?regionId=${regionId}` : ''}`;
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], {
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `DT_Report_${regionId || 'National'}_${new Date().toISOString().slice(0, 10)}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(null);
    }
  };

  if (loading) return <LinearProgress />;
  if (!overview) return <Alert severity="error">Failed to load regional data. Upload drive test data first.</Alert>;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h4" fontWeight={900}>Regional Drive Test Analysis</Typography>
        <Stack direction="row" spacing={1}>
          <ButtonGroup variant="outlined" size="small">
            <Button startIcon={<PictureAsPdfIcon />} onClick={() => handleExport('pdf', selectedRegion || null)}
              disabled={!!exporting}>
              {exporting === 'pdf' ? 'Generating...' : 'PDF Report'}
            </Button>
            <Button startIcon={<TableChartIcon />} onClick={() => handleExport('excel', selectedRegion || null)}
              disabled={!!exporting}>
              {exporting === 'excel' ? 'Generating...' : 'Excel Report'}
            </Button>
          </ButtonGroup>
        </Stack>
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="National Overview" />
          <Tab label="Region Detail" />
          <Tab label="District Details" />
        </Tabs>
      </Box>

      {activeTab === 1 && selectedRegion && (
        <Stack direction="row" spacing={2} mb={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Select Region</InputLabel>
            <Select value={selectedRegion} label="Select Region" onChange={e => loadRegionDetail(e.target.value)}>
              {overview.regions.map(r => (
                <MenuItem key={r.regionId} value={r.regionId}>{r.regionName}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <ButtonGroup variant="outlined" size="small">
            <Button startIcon={<PictureAsPdfIcon />} onClick={() => handleExport('pdf', selectedRegion)}
              disabled={!!exporting}>{exporting === 'pdf' ? '...' : 'Region PDF'}</Button>
            <Button startIcon={<TableChartIcon />} onClick={() => handleExport('excel', selectedRegion)}
              disabled={!!exporting}>{exporting === 'excel' ? '...' : 'Region Excel'}</Button>
          </ButtonGroup>
        </Stack>
      )}

      {activeTab === 0 && <RegionOverviewTab overview={overview} onSelectRegion={loadRegionDetail} />}
      {activeTab === 1 && (detailLoading ? <LinearProgress /> : <RegionDetailTab detail={detail} />)}
      {activeTab === 2 && (districtLoading ? <LinearProgress /> : <DistrictDetailTab districtData={districtData} />)}
    </Box>
  );
}
