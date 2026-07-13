import { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet.heat';
import {
  Box, Card, CardContent, Typography, ToggleButtonGroup, ToggleButton, Stack, Chip,
  FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment, Divider,
  Switch, FormControlLabel, IconButton, Tooltip, LinearProgress, Badge,
  Dialog, DialogTitle, DialogContent, Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import CellTowerIcon from '@mui/icons-material/CellTower';
import StreetviewIcon from '@mui/icons-material/Streetview';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { get } from '../api/client';
import { Loading, EmptyState } from '../components/ui';
import { colorFor, OPERATOR_COLORS } from '../theme';
import { useColorMode } from '../theme/ColorMode';

const SL_CENTER = [8.4, -11.8];
const TECH_COLORS = { '2G': '#8bc34a', '3G': '#ff9800', '4G': '#2196f3', '5G': '#9c27b0' };

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom || 12, { duration: 1 }); }, [center, zoom, map]);
  return null;
}

function HeatmapLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    const heat = window.L.heatLayer(
      points.map((p) => [p.lat, p.lng, p.intensity]),
      { radius: 25, blur: 15, maxZoom: 13, max: 1.0, gradient: { 0.2: '#2e9e5b', 0.5: '#e6a700', 0.8: '#ef6c00', 1.0: '#e0413b' } }
    ).addTo(map);
    return () => map.removeLayer(heat);
  }, [map, points]);
  return null;
}

// Captures map clicks when Street View pick-mode is active
function StreetViewClickHandler({ active, onPick }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const handler = (e) => onPick(e.latlng.lat, e.latlng.lng);
    map.on('click', handler);
    map.getContainer().style.cursor = 'crosshair';
    return () => {
      map.off('click', handler);
      map.getContainer().style.cursor = '';
    };
  }, [map, active, onPick]);
  return null;
}

export default function CoverageMap() {
  const [sites, setSites] = useState(null);
  const [cells, setCells] = useState(null);
  const [regions, setRegions] = useState([]);
  const [operators, setOperators] = useState([]);

  const [tech, setTech] = useState('ALL');
  const [selectedOp, setSelectedOp] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showCells, setShowCells] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatData, setHeatData] = useState(null);
  const [colorBy, setColorBy] = useState('operator');
  const [flyTarget, setFlyTarget] = useState(null);
  const [streetViewMode, setStreetViewMode] = useState(false);
  const [streetViewPos, setStreetViewPos] = useState(null);
  const [streetViewOpen, setStreetViewOpen] = useState(false);

  const { mode } = useColorMode();
  const tileVariant = mode === 'dark' ? 'dark_all' : 'light_all';

  useEffect(() => {
    get('/inventory/map').then((r) => setSites(r.data)).catch(() => setSites([]));
    get('/inventory/map/regions').then((r) => setRegions(r.data)).catch(() => setRegions([]));
    get('/operators').then((r) => setOperators(r.data?.rows || r.data || [])).catch(() => setOperators([]));
  }, []);

  const loadCells = useCallback(() => {
    if (cells !== null) return;
    setCells('loading');
    const params = selectedOp !== 'ALL' ? `?operatorId=${selectedOp}` : '';
    get(`/inventory/map/cells${params}`).then((r) => setCells(r.data)).catch(() => setCells([]));
  }, [cells, selectedOp]);

  useEffect(() => {
    if (showCells && cells === null) loadCells();
  }, [showCells, cells, loadCells]);

  useEffect(() => {
    if (!showHeatmap || heatData) return;
    const params = selectedOp !== 'ALL' ? `?operatorId=${selectedOp}` : '';
    get(`/inventory/map/heat${params}`).then((r) => setHeatData(r.data || [])).catch(() => setHeatData([]));
  }, [showHeatmap, heatData, selectedOp]);

  const heatPoints = useMemo(() => {
    if (!showHeatmap || !Array.isArray(heatData)) return [];
    return heatData
      .filter((d) => d.latitude && d.longitude)
      .map((d) => {
        const threshold = d.threshold ? Number(d.threshold) : 95;
        const val = Number(d.avg_value);
        const intensity = val < threshold * 0.9 ? 1.0 : val < threshold ? 0.6 : val < threshold * 1.05 ? 0.3 : 0.1;
        return { lat: Number(d.latitude), lng: Number(d.longitude), intensity };
      });
  }, [showHeatmap, heatData]);

  const filtered = useMemo(() => {
    if (!sites?.length) return [];
    let rows = sites.filter((s) => s.latitude && s.longitude);
    if (tech !== 'ALL') rows = rows.filter((s) => (s.technologies || '').includes(tech));
    if (selectedOp !== 'ALL') rows = rows.filter((s) => s.operator_id === Number(selectedOp));
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((s) =>
        (s.site_code || '').toLowerCase().includes(q) ||
        (s.site_name || '').toLowerCase().includes(q) ||
        (s.region || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [sites, tech, selectedOp, search]);

  const filteredCells = useMemo(() => {
    if (!showCells || !Array.isArray(cells)) return [];
    let rows = cells.filter((c) => c.latitude && c.longitude);
    if (tech !== 'ALL') rows = rows.filter((c) => c.tech_key === tech);
    if (selectedOp !== 'ALL') rows = rows.filter((c) => c.operator_id === Number(selectedOp));
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((c) =>
        (c.cell_code || '').toLowerCase().includes(q) ||
        (c.cell_name || '').toLowerCase().includes(q) ||
        (c.site_code || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [cells, showCells, tech, selectedOp, search]);

  const techCounts = useMemo(() => {
    if (!sites?.length) return {};
    const counts = {};
    for (const s of filtered) {
      for (const t of (s.technologies || '').split(',')) {
        const tk = t.trim();
        if (tk) counts[tk] = (counts[tk] || 0) + 1;
      }
    }
    return counts;
  }, [sites, filtered]);

  const markerColor = useCallback((item) => {
    if (colorBy === 'tech') {
      const tk = item.tech_key || (item.technologies || '').split(',')[0]?.trim();
      return TECH_COLORS[tk] || '#888';
    }
    const opName = operators.find((o) => o.operator_id === item.operator_id)?.operator_name;
    return colorFor(opName || '', item.operator_id - 1);
  }, [colorBy, operators]);

  const handleStreetView = useCallback((lat, lng) => {
    setStreetViewPos({ lat, lng });
    setStreetViewOpen(true);
    setStreetViewMode(false);
  }, []);

  if (!sites) return <Loading height="calc(100vh - 130px)" />;

  const mapKey = `${tileVariant}-${colorBy}`;

  return (
    <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 130px)' }}>
      {/* Sidebar */}
      <Card sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Coverage Map</Typography>

          {/* Search */}
          <TextField fullWidth size="small" placeholder="Search sites..." value={search}
            onChange={(e) => setSearch(e.target.value)} sx={{ mb: 1.5 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />

          {/* Operator filter */}
          <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
            <InputLabel>Operator</InputLabel>
            <Select label="Operator" value={selectedOp} onChange={(e) => { setSelectedOp(e.target.value); setCells(null); }}>
              <MenuItem value="ALL">All Operators</MenuItem>
              {operators.map((op) => (
                <MenuItem key={op.operator_id} value={String(op.operator_id)}>{op.operator_name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Tech filter */}
          <ToggleButtonGroup size="small" exclusive fullWidth value={tech} onChange={(_, v) => v && setTech(v)} sx={{ mb: 1.5 }}>
            {['ALL', '2G', '3G', '4G', '5G'].map((t) => (
              <ToggleButton key={t} value={t} sx={{ flex: 1, fontSize: 11, py: 0.5 }}>
                <Badge badgeContent={t === 'ALL' ? filtered.length : techCounts[t] || 0}
                  color="primary" max={9999}
                  sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16, top: -4, right: -8 } }}>
                  {t}
                </Badge>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {/* Color by */}
          <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
            <InputLabel>Color by</InputLabel>
            <Select label="Color by" value={colorBy} onChange={(e) => setColorBy(e.target.value)}>
              <MenuItem value="operator">Operator</MenuItem>
              <MenuItem value="tech">Technology</MenuItem>
            </Select>
          </FormControl>

          {/* Cell layer toggle */}
          <FormControlLabel
            control={<Switch size="small" checked={showCells} onChange={(e) => setShowCells(e.target.checked)} />}
            label={<Typography variant="body2">Show Cells</Typography>}
            sx={{ mb: 0.5 }}
          />
          {showCells && cells === 'loading' && <LinearProgress sx={{ mb: 0.5 }} />}

          {/* Heatmap toggle */}
          <FormControlLabel
            control={<Switch size="small" checked={showHeatmap} onChange={(e) => { setShowHeatmap(e.target.checked); if (!e.target.checked) setHeatData(null); }} />}
            label={<Stack direction="row" spacing={0.5} alignItems="center">
              <WhatshotIcon sx={{ fontSize: 16, color: showHeatmap ? 'error.main' : 'text.secondary' }} />
              <Typography variant="body2">KPI Heatmap</Typography>
            </Stack>}
            sx={{ mb: 1 }}
          />
          {showHeatmap && !heatData && <LinearProgress color="error" sx={{ mb: 1 }} />}

          {/* Street View mode toggle */}
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={streetViewMode}
                onChange={(e) => setStreetViewMode(e.target.checked)}
                color="info"
              />
            }
            label={
              <Stack direction="row" spacing={0.5} alignItems="center">
                <StreetviewIcon sx={{ fontSize: 16, color: streetViewMode ? 'info.main' : 'text.secondary' }} />
                <Typography variant="body2">Street View</Typography>
              </Stack>
            }
            sx={{ mb: 0.5 }}
          />
          {streetViewMode && (
            <Alert severity="info" sx={{ fontSize: 11, py: 0.5, mb: 1 }}>
              Click any point on the map to open Street View.
            </Alert>
          )}
        </CardContent>

        <Divider />

        {/* Legend */}
        <CardContent sx={{ py: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>Legend</Typography>
          <Stack spacing={0.5} mt={0.5}>
            {colorBy === 'operator' ? (
              Object.entries(OPERATOR_COLORS).map(([name, c]) => (
                <Stack key={name} direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: c, flexShrink: 0 }} />
                  <Typography variant="caption">{name}</Typography>
                </Stack>
              ))
            ) : (
              Object.entries(TECH_COLORS).map(([t, c]) => (
                <Stack key={t} direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: c, flexShrink: 0 }} />
                  <Typography variant="caption">{t}</Typography>
                </Stack>
              ))
            )}
            {showCells && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', border: '2px dashed', borderColor: 'text.secondary', flexShrink: 0 }} />
                <Typography variant="caption">Cell (smaller)</Typography>
              </Stack>
            )}
            {showHeatmap && (
              <>
                <Typography variant="caption" color="text.secondary" fontWeight={600} mt={1}>Heatmap</Typography>
                <Box sx={{ display: 'flex', height: 8, borderRadius: 1, overflow: 'hidden' }}>
                  <Box sx={{ flex: 1, bgcolor: '#2e9e5b' }} />
                  <Box sx={{ flex: 1, bgcolor: '#e6a700' }} />
                  <Box sx={{ flex: 1, bgcolor: '#ef6c00' }} />
                  <Box sx={{ flex: 1, bgcolor: '#e0413b' }} />
                </Box>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" sx={{ fontSize: 9 }}>Good</Typography>
                  <Typography variant="caption" sx={{ fontSize: 9 }}>Congested</Typography>
                </Stack>
              </>
            )}
          </Stack>
        </CardContent>

        <Divider />

        {/* Region stats */}
        <CardContent sx={{ py: 1, flex: 1, overflow: 'auto' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>Regions</Typography>
          {regions.length ? (
            <Stack spacing={0.5} mt={0.5}>
              {regions.map((r) => (
                <Box key={r.region || 'Unknown'} sx={{
                  p: 0.75, borderRadius: 1, cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }} onClick={() => {
                  const site = filtered.find((s) => s.region === r.region);
                  if (site) setFlyTarget({ center: [Number(site.latitude), Number(site.longitude)], zoom: 10 });
                }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 140 }}>
                      {r.region || 'Unknown'}
                    </Typography>
                    <Stack direction="row" spacing={0.5}>
                      <Chip size="small" label={`${r.sites} sites`} sx={{ height: 18, fontSize: 10 }} />
                    </Stack>
                  </Stack>
                  <Stack direction="row" spacing={0.5} mt={0.25}>
                    {(r.technologies || '').split(',').filter(Boolean).map((t) => (
                      <Chip key={t} size="small" label={t}
                        sx={{ height: 16, fontSize: 9, bgcolor: (TECH_COLORS[t] || '#888') + '33', color: TECH_COLORS[t] || '#888' }} />
                    ))}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto !important' }}>
                      {r.cells} cells
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">No region data yet.</Typography>
          )}
        </CardContent>

        {/* Totals */}
        <Divider />
        <CardContent sx={{ py: 1 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Sites shown</Typography>
            <Typography variant="caption" fontWeight={700}>{filtered.length.toLocaleString()}</Typography>
          </Stack>
          {showCells && Array.isArray(cells) && (
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">Cells shown</Typography>
              <Typography variant="caption" fontWeight={700}>{filteredCells.length.toLocaleString()}</Typography>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1, p: '0 !important', position: 'relative' }}>
          {!filtered.length && !filteredCells.length ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <EmptyState
                icon={<CellTowerIcon sx={{ fontSize: 48 }} />}
                message="No geolocated sites."
                hint="Import the Geo-Dimension workbook under Network Inventory to populate the map."
              />
            </Box>
          ) : (
            <MapContainer key={mapKey} center={SL_CENTER} zoom={8} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap, &copy; CARTO'
                url={`https://{s}.basemaps.cartocdn.com/${tileVariant}/{z}/{x}/{y}{r}.png`}
              />
              {flyTarget && <FlyTo center={flyTarget.center} zoom={flyTarget.zoom} />}

              {/* Site markers with clustering */}
              <MarkerClusterGroup chunkedLoading maxClusterRadius={40}
                iconCreateFunction={(cluster) => {
                  const count = cluster.getChildCount();
                  const size = count > 100 ? 40 : count > 20 ? 32 : 26;
                  return window.L.divIcon({
                    html: `<div style="
                      background: rgba(61,169,252,0.85);
                      color: #fff; font-size: 11px; font-weight: 700;
                      width: ${size}px; height: ${size}px; border-radius: 50%;
                      display: flex; align-items: center; justify-content: center;
                      border: 2px solid rgba(255,255,255,0.6);
                      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    ">${count}</div>`,
                    className: '',
                    iconSize: [size, size],
                  });
                }}
              >
                {filtered.map((s) => {
                  const c = markerColor(s);
                  return (
                    <CircleMarker key={`s-${s.site_id}`}
                      center={[Number(s.latitude), Number(s.longitude)]}
                      radius={6}
                      pathOptions={{ color: c, fillColor: c, fillOpacity: 0.85, weight: 1.5 }}
                    >
                      <Popup>
                        <div style={{ minWidth: 190 }}>
                          <strong>{s.site_code}</strong><br />
                          <span style={{ fontSize: 12 }}>{s.site_name}</span><br />
                          <span style={{ fontSize: 11, color: '#888' }}>
                            {operators.find(o => o.operator_id === s.operator_id)?.operator_name || 'Unknown Operator'} &middot; {s.region || 'Unknown Region'} &middot; {s.technologies}
                          </span><br />
                          <span style={{ fontSize: 11 }}>Status: <b>{s.status || 'ACTIVE'}</b></span><br />
                          <span style={{ fontSize: 11, color: '#666' }}>
                            {Number(s.latitude).toFixed(5)}, {Number(s.longitude).toFixed(5)}
                          </span>
                          <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleStreetView(Number(s.latitude), Number(s.longitude))}
                              style={{
                                fontSize: 11, cursor: 'pointer', border: '1px solid #3da9fc',
                                background: 'transparent', color: '#3da9fc', borderRadius: 4,
                                padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4,
                              }}>
                              📍 Street View
                            </button>
                            <a
                              href={`https://www.google.com/maps?q=&layer=c&cbll=${Number(s.latitude)},${Number(s.longitude)}`}
                              target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 11, color: '#888', textDecoration: 'none', alignSelf: 'center' }}>
                              ↗ Google Maps
                            </a>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MarkerClusterGroup>

              {/* Street View click handler */}
              <StreetViewClickHandler active={streetViewMode} onPick={handleStreetView} />

              {/* Heatmap layer */}
              {showHeatmap && heatPoints.length > 0 && <HeatmapLayer points={heatPoints} />}

              {/* Cell markers (smaller, shown when toggled) */}
              {showCells && Array.isArray(filteredCells) && filteredCells.map((c) => {
                const col = markerColor(c);
                return (
                  <CircleMarker key={`c-${c.cell_id}`}
                    center={[Number(c.latitude), Number(c.longitude)]}
                    radius={3}
                    pathOptions={{ color: col, fillColor: col, fillOpacity: 0.6, weight: 1, dashArray: '2 2' }}
                  >
                    <Popup>
                      <div style={{ minWidth: 160 }}>
                        <strong>{c.cell_code}</strong><br />
                        <span style={{ fontSize: 12 }}>{c.cell_name}</span><br />
                        <span style={{ fontSize: 11, color: '#888' }}>
                          {operators.find(o => o.operator_id === c.operator_id)?.operator_name || 'Unknown Operator'} &middot; Site: {c.site_code} &middot; {c.tech_key}
                        </span><br />
                        <span style={{ fontSize: 11, color: '#666' }}>
                          {Number(c.latitude).toFixed(5)}, {Number(c.longitude).toFixed(5)}
                        </span>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          )}

          {/* Floating reset button */}
          {filtered.length > 0 && (
            <Tooltip title="Reset view">
              <IconButton size="small" onClick={() => setFlyTarget({ center: SL_CENTER, zoom: 8 })}
                sx={{
                  position: 'absolute', top: 80, right: 12, zIndex: 1000,
                  bgcolor: 'background.paper', boxShadow: 2,
                  '&:hover': { bgcolor: 'action.hover' },
                }}>
                <MyLocationIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Street View toggle button */}
          <Tooltip title={streetViewMode ? 'Click map to open Street View — click to cancel' : 'Street View: click a point on the map'}>
            <IconButton
              size="small"
              onClick={() => setStreetViewMode((m) => !m)}
              sx={{
                position: 'absolute', top: 120, right: 12, zIndex: 1000,
                bgcolor: streetViewMode ? 'info.main' : 'background.paper',
                color: streetViewMode ? '#fff' : 'text.primary',
                boxShadow: 2,
                '&:hover': { bgcolor: streetViewMode ? 'info.dark' : 'action.hover' },
              }}>
              <StreetviewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </CardContent>
      </Card>
      {/* Street View Dialog */}
      <Dialog
        open={streetViewOpen}
        onClose={() => setStreetViewOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { height: 560 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
          <StreetviewIcon color="info" />
          Street View
          {streetViewPos && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {streetViewPos.lat.toFixed(5)}, {streetViewPos.lng.toFixed(5)}
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
            {streetViewPos && (
              <Tooltip title="Open in Google Maps">
                <IconButton
                  size="small"
                  component="a"
                  href={`https://www.google.com/maps?q=&layer=c&cbll=${streetViewPos.lat},${streetViewPos.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton size="small" onClick={() => setStreetViewOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          {streetViewPos && (
            <iframe
              key={`${streetViewPos.lat}-${streetViewPos.lng}`}
              src={`https://maps.google.com/maps?q=&layer=c&cbll=${streetViewPos.lat},${streetViewPos.lng}&cbp=12,0,0,0,0&z=17&output=embed`}
              width="100%"
              height="100%"
              style={{ border: 0, display: 'block' }}
              allowFullScreen
              title="Google Street View"
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
