import { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet';
import {
  Box, Card, CardContent, Typography, Button, Stack, Grid, Chip, Alert,
  FormControl, InputLabel, Select, MenuItem, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Tooltip, LinearProgress, Divider, TablePagination,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MapIcon from '@mui/icons-material/Map';
import DeleteIcon from '@mui/icons-material/Delete';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import RouteIcon from '@mui/icons-material/Route';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import CellTowerIcon from '@mui/icons-material/CellTower';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import DownloadIcon from '@mui/icons-material/Download';
import { get, post } from '../api/client';
import { Loading, EmptyState } from '../components/ui';
import { colorFor } from '../theme';
import { useColorMode } from '../theme/ColorMode';
import { exportCsv } from '../utils/csv';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const RSRP_COLORS = [
  { min: -80, color: '#2e9e5b', label: 'Excellent (≥ -80)' },
  { min: -90, color: '#8bc34a', label: 'Good (-90 to -80)' },
  { min: -100, color: '#e6a700', label: 'Fair (-100 to -90)' },
  { min: -110, color: '#ef6c00', label: 'Poor (-110 to -100)' },
  { min: -Infinity, color: '#e0413b', label: 'No Signal (< -110)' },
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

function UploadDialog({ open, onClose, operators, onUploaded }) {
  const [opId, setOpId] = useState('');
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [routeType, setRouteType] = useState('urban');
  const [technology, setTechnology] = useState('4G');
  const [deviceModel, setDeviceModel] = useState('');
  const [testerName, setTesterName] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (!opId || !file) { setError('Select operator and file'); return; }
    setUploading(true); setError(''); setResult(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('operator_id', opId);
    fd.append('test_name', testName || file.name);
    fd.append('test_date', testDate);
    fd.append('route_type', routeType);
    fd.append('technology', technology);
    fd.append('device_model', deviceModel);
    fd.append('tester_name', testerName);

    try {
      const token = localStorage.getItem('tnipr_access');
      const res = await fetch(`${BASE}/drive-tests/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Upload failed');
      setResult(json.data);
      onUploaded();
    } catch (err) { setError(err.message); }
    finally { setUploading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Drive Test Data</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <FormControl fullWidth size="small" required>
            <InputLabel>Operator</InputLabel>
            <Select label="Operator" value={opId} onChange={(e) => setOpId(e.target.value)}>
              {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Test Name" value={testName} onChange={(e) => setTestName(e.target.value)}
            placeholder="e.g. Western Area LTE Coverage" fullWidth />
          <Stack direction="row" spacing={2}>
            <TextField size="small" label="Test Date" type="date" InputLabelProps={{ shrink: true }}
              value={testDate} onChange={(e) => setTestDate(e.target.value)} fullWidth />
            <FormControl size="small" fullWidth>
              <InputLabel>Route Type</InputLabel>
              <Select label="Route Type" value={routeType} onChange={(e) => setRouteType(e.target.value)}>
                {['urban', 'suburban', 'rural', 'highway', 'indoor'].map((r) => (
                  <MenuItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <Stack direction="row" spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Technology</InputLabel>
              <Select label="Technology" value={technology} onChange={(e) => setTechnology(e.target.value)}>
                {['2G', '3G', '4G', '5G'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Device Model" value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)} fullWidth placeholder="e.g. Samsung S24" />
          </Stack>
          <TextField size="small" label="Tester Name" value={testerName}
            onChange={(e) => setTesterName(e.target.value)} fullWidth />
          <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} fullWidth>
            {file ? file.name : 'Select CSV / Excel File'}
            <input type="file" hidden accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files[0])} />
          </Button>
          {uploading && <LinearProgress />}
          {error && <Alert severity="error">{error}</Alert>}
          {result && (
            <Alert severity="success">
              Imported {result.samplesImported} samples ({result.distanceKm} km route).
              {result.samplesSkipped > 0 && ` ${result.samplesSkipped} rows skipped (no GPS).`}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={handleUpload} disabled={uploading || !opId || !file}>
          {uploading ? 'Uploading...' : 'Upload & Process'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AnalysisPanel({ analysis, onClose }) {
  if (!analysis) return null;
  const { meta, stats } = analysis;
  const total = stats.total_samples || 1;
  const coverage = [
    { label: 'Excellent', count: stats.rsrp_excellent, color: RSRP_COLORS[0].color },
    { label: 'Good', count: stats.rsrp_good, color: RSRP_COLORS[1].color },
    { label: 'Fair', count: stats.rsrp_fair, color: RSRP_COLORS[2].color },
    { label: 'Poor', count: stats.rsrp_poor, color: RSRP_COLORS[3].color },
    { label: 'No Signal', count: stats.rsrp_no_signal, color: RSRP_COLORS[4].color },
  ];

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">{meta.test_name}</Typography>
          <Chip label={meta.operator_name} size="small" />
        </Stack>

        <Grid container spacing={2} mb={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Samples</Typography>
            <Typography variant="h6">{stats.total_samples?.toLocaleString()}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Distance</Typography>
            <Typography variant="h6">{meta.distance_km} km</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Avg RSRP</Typography>
            <Typography variant="h6" sx={{ color: rsrpColor(stats.avg_rsrp) }}>{stats.avg_rsrp} dBm</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Avg SINR</Typography>
            <Typography variant="h6">{stats.avg_sinr} dB</Typography>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" mb={1}>RSRP Coverage Distribution</Typography>
        <Box sx={{ display: 'flex', height: 24, borderRadius: 1, overflow: 'hidden', mb: 1 }}>
          {coverage.map((c) => (
            <Tooltip key={c.label} title={`${c.label}: ${c.count} (${((c.count / total) * 100).toFixed(1)}%)`}>
              <Box sx={{ width: `${(c.count / total) * 100}%`, bgcolor: c.color, transition: 'width 0.3s' }} />
            </Tooltip>
          ))}
        </Box>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {coverage.map((c) => (
            <Stack key={c.label} direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c.color }} />
              <Typography variant="caption">{c.label}: {((c.count / total) * 100).toFixed(1)}%</Typography>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={1}>
          {[
            { label: 'RSRP Range', val: `${stats.min_rsrp} to ${stats.max_rsrp} dBm` },
            { label: 'RSRQ Range', val: `${stats.min_rsrq} to ${stats.max_rsrq} dB` },
            { label: 'SINR Range', val: `${stats.min_sinr} to ${stats.max_sinr} dB` },
            { label: 'Avg DL', val: stats.avg_dl ? `${stats.avg_dl} kbps` : 'N/A' },
            { label: 'Max DL', val: stats.max_dl ? `${stats.max_dl} kbps` : 'N/A' },
            { label: 'Avg UL', val: stats.avg_ul ? `${stats.avg_ul} kbps` : 'N/A' },
          ].map((s) => (
            <Grid item xs={6} sm={4} key={s.label}>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              <Typography variant="body2" fontWeight={600}>{s.val}</Typography>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}

export default function DriveTest() {
  const [tests, setTests] = useState(null);
  const [operators, setOperators] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [samples, setSamples] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [nearbySites, setNearbySites] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [filterOp, setFilterOp] = useState('all');
  const [filterTech, setFilterTech] = useState('all');
  const [page, setPage] = useState(0);

  const { mode } = useColorMode();
  const tileVariant = mode === 'dark' ? 'dark_all' : 'light_all';

  const loadTests = useCallback(() => {
    get('/drive-tests').then((r) => setTests(r.data)).catch(() => setTests([]));
  }, []);

  useEffect(() => {
    loadTests();
    get('/operators').then((r) => setOperators(r.data?.rows || r.data || [])).catch(() => setOperators([]));
  }, [loadTests]);

  const filteredTests = useMemo(() => {
    if (!tests) return [];
    return tests.filter((t) => {
      if (filterOp !== 'all' && t.operator_id !== Number(filterOp)) return false;
      if (filterTech !== 'all' && t.technology !== filterTech) return false;
      return true;
    });
  }, [tests, filterOp, filterTech]);

  const viewTest = async (test) => {
    setSelectedTest(test);
    setLoading(true);
    setSamples(null); setAnalysis(null); setNearbySites([]);
    try {
      const [samplesRes, analysisRes, sitesRes] = await Promise.all([
        get(`/drive-tests/${test.drive_test_id}/samples`),
        get(`/drive-tests/${test.drive_test_id}/analysis`),
        get(`/drive-tests/${test.drive_test_id}/nearby-sites`),
      ]);
      setSamples(samplesRes.data);
      setAnalysis(analysisRes.data);
      setNearbySites(sitesRes.data || []);
      if (samplesRes.data?.length) {
        const mid = samplesRes.data[Math.floor(samplesRes.data.length / 2)];
        setFlyTarget({ center: [Number(mid.latitude), Number(mid.longitude)], zoom: 13 });
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem('tnipr_access');
    await fetch(`${BASE}/drive-tests/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadTests();
    if (selectedTest?.drive_test_id === id) {
      setSelectedTest(null); setSamples(null); setAnalysis(null);
    }
  };

  const routePath = useMemo(() => {
    if (!samples?.length) return [];
    return samples.map((s) => [Number(s.latitude), Number(s.longitude)]);
  }, [samples]);

  if (!tests) return <Loading height={400} />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1} alignItems="center">
          <RouteIcon color="primary" />
          <Typography variant="h5">Drive Testing</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<DownloadIcon />} disabled={!filteredTests?.length}
            onClick={() => exportCsv('drive_tests.csv', [
              { key: 'test_name', label: 'Test Name' }, { key: 'operator_name', label: 'Operator' },
              { key: 'test_date', label: 'Date' }, { key: 'route_type', label: 'Route Type' },
              { key: 'technology', label: 'Technology' }, { key: 'sample_count', label: 'Samples' },
            ], filteredTests)}>Export</Button>
          <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => setUploadOpen(true)}>
            Upload Drive Test
          </Button>
        </Stack>
      </Stack>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)}
        operators={operators} onUploaded={loadTests} />

      {/* Filters */}
      <Stack direction="row" spacing={2}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Operator</InputLabel>
          <Select label="Operator" value={filterOp} onChange={(e) => setFilterOp(e.target.value)}>
            <MenuItem value="all">All Operators</MenuItem>
            {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Technology</InputLabel>
          <Select label="Technology" value={filterTech} onChange={(e) => setFilterTech(e.target.value)}>
            <MenuItem value="all">All</MenuItem>
            {['2G', '3G', '4G', '5G'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <Chip label={`${filteredTests.length} of ${tests.length} tests`} variant="outlined" sx={{ alignSelf: 'center' }} />
      </Stack>

      {/* Test list */}
      {!filteredTests.length ? (
        <EmptyState icon={<RouteIcon sx={{ fontSize: 48 }} />}
          message="No drive tests uploaded yet."
          hint="Upload a CSV or Excel file with GPS coordinates and signal measurements." />
      ) : (
        <Card>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Test Name</TableCell>
                  <TableCell>Operator</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Tech</TableCell>
                  <TableCell align="right">Samples</TableCell>
                  <TableCell align="right">Distance</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTests.slice(page * 10, page * 10 + 10).map((t) => (
                  <TableRow key={t.drive_test_id}
                    selected={selectedTest?.drive_test_id === t.drive_test_id}
                    hover sx={{ cursor: 'pointer' }}
                    onClick={() => viewTest(t)}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 200 }}>
                        {t.test_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={t.operator_name}
                        sx={{ bgcolor: colorFor(t.operator_name) + '33', height: 22, fontSize: 11 }} />
                    </TableCell>
                    <TableCell>{t.test_date}</TableCell>
                    <TableCell><Chip size="small" label={t.route_type} variant="outlined" sx={{ height: 20, fontSize: 10 }} /></TableCell>
                    <TableCell>{t.technology || '—'}</TableCell>
                    <TableCell align="right">{t.total_samples?.toLocaleString()}</TableCell>
                    <TableCell align="right">{t.distance_km ? `${t.distance_km} km` : '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={t.status}
                        color={t.status === 'COMPLETED' ? 'success' : t.status === 'FAILED' ? 'error' : 'default'}
                        sx={{ height: 20, fontSize: 10 }} />
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="View on map"><IconButton size="small" onClick={() => viewTest(t)}><MapIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(t.drive_test_id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination component="div" count={filteredTests.length} page={page} rowsPerPage={10}
              rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />
          </CardContent>
        </Card>
      )}

      {loading && <LinearProgress />}

      {/* Analysis panel */}
      {analysis && <AnalysisPanel analysis={analysis} />}

      {/* Map */}
      {selectedTest && samples && (
        <Card sx={{ height: 500 }}>
          <CardContent sx={{ height: '100%', p: '0 !important', position: 'relative' }}>
            <MapContainer center={[8.4, -11.8]} zoom={8} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap, &copy; CARTO'
                url={`https://{s}.basemaps.cartocdn.com/${tileVariant}/{z}/{x}/{y}{r}.png`}
              />
              {flyTarget && <FlyTo center={flyTarget.center} zoom={flyTarget.zoom} />}

              {/* Route polyline */}
              {routePath.length > 1 && (
                <Polyline positions={routePath} pathOptions={{ color: '#3da9fc', weight: 3, opacity: 0.4 }} />
              )}

              {/* Sample points colored by RSRP */}
              {samples.map((s) => (
                <CircleMarker key={s.sample_id}
                  center={[Number(s.latitude), Number(s.longitude)]}
                  radius={4}
                  pathOptions={{ color: rsrpColor(s.rsrp), fillColor: rsrpColor(s.rsrp), fillOpacity: 0.85, weight: 0.5 }}>
                  <Popup>
                    <div style={{ minWidth: 160, fontSize: 12 }}>
                      <strong>RSRP:</strong> {s.rsrp ?? 'N/A'} dBm<br />
                      <strong>RSRQ:</strong> {s.rsrq ?? 'N/A'} dB<br />
                      <strong>SINR:</strong> {s.sinr ?? 'N/A'} dB<br />
                      {s.dl_throughput && <><strong>DL:</strong> {s.dl_throughput} kbps<br /></>}
                      {s.ul_throughput && <><strong>UL:</strong> {s.ul_throughput} kbps<br /></>}
                      <span style={{ color: '#888' }}>
                        {Number(s.latitude).toFixed(5)}, {Number(s.longitude).toFixed(5)}
                      </span>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

              {/* Nearby sites */}
              {nearbySites.map((site) => (
                <CircleMarker key={`site-${site.site_id}`}
                  center={[Number(site.latitude), Number(site.longitude)]}
                  radius={8}
                  pathOptions={{ color: '#fff', fillColor: '#3da9fc', fillOpacity: 0.9, weight: 2 }}>
                  <Popup>
                    <div style={{ minWidth: 160, fontSize: 12 }}>
                      <strong>{site.site_code}</strong><br />
                      {site.site_name}<br />
                      <span style={{ color: '#888' }}>{site.operator_name} · {site.technologies}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>

            {/* Map legend */}
            <Box sx={{
              position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
              bgcolor: 'background.paper', borderRadius: 2, p: 1.5, boxShadow: 2,
              opacity: 0.92,
            }}>
              <Typography variant="caption" fontWeight={700} mb={0.5} display="block">RSRP Signal Quality</Typography>
              {RSRP_COLORS.map((r) => (
                <Stack key={r.label} direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: r.color }} />
                  <Typography variant="caption" sx={{ fontSize: 10 }}>{r.label}</Typography>
                </Stack>
              ))}
              {nearbySites.length > 0 && (
                <Stack direction="row" spacing={0.5} alignItems="center" mt={0.5}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#3da9fc', border: '1.5px solid #fff' }} />
                  <Typography variant="caption" sx={{ fontSize: 10 }}>Cell Tower</Typography>
                </Stack>
              )}
            </Box>

            {/* Reset button */}
            <Tooltip title="Reset view">
              <IconButton size="small"
                onClick={() => {
                  if (samples?.length) {
                    const mid = samples[Math.floor(samples.length / 2)];
                    setFlyTarget({ center: [Number(mid.latitude), Number(mid.longitude)], zoom: 13 });
                  }
                }}
                sx={{
                  position: 'absolute', top: 80, right: 12, zIndex: 1000,
                  bgcolor: 'background.paper', boxShadow: 2,
                  '&:hover': { bgcolor: 'action.hover' },
                }}>
                <MyLocationIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
