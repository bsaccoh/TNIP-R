import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import {
  Box, Typography, Paper, Stack, CircularProgress, IconButton, Chip,
  FormControl, InputLabel, Select, MenuItem, Divider, Avatar, alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import CellTowerIcon from '@mui/icons-material/CellTower';
import PublicIcon from '@mui/icons-material/Public';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { get } from '../api/client';
import { opColor } from '../theme';
import { useColorMode } from '../theme/ColorMode';

const SL_CENTER = [8.46, -11.78];

const DISTRICT_CENTERS = {
  'Western Area Urban': [8.48, -13.23], 'Western Area Rural': [8.38, -13.15],
  'Bo': [7.96, -11.74], 'Bombali': [9.07, -12.05], 'Bonthe': [7.53, -12.50],
  'Kailahun': [8.28, -10.57], 'Kambia': [9.12, -12.92], 'Kenema': [7.88, -11.19],
  'Koinadugu': [9.58, -11.55], 'Kono': [8.64, -10.98], 'Moyamba': [8.16, -12.43],
  'Port Loko': [8.77, -12.79], 'Pujehun': [7.35, -11.72], 'Tonkolili': [8.75, -12.05],
  'Falaba': [9.85, -11.32], 'Karene': [9.18, -12.28],
};

const DISTRICT_GEO = {
  'Western Area Urban': [[8.50,-13.28],[8.51,-13.24],[8.50,-13.19],[8.47,-13.17],[8.44,-13.19],[8.43,-13.24],[8.44,-13.28],[8.47,-13.29],[8.50,-13.28]],
  'Western Area Rural': [[8.52,-13.18],[8.53,-13.12],[8.51,-13.06],[8.46,-13.02],[8.38,-13.03],[8.32,-13.08],[8.30,-13.14],[8.32,-13.19],[8.38,-13.22],[8.44,-13.22],[8.47,-13.19],[8.52,-13.18]],
  'Bo': [[8.18,-12.08],[8.20,-11.88],[8.16,-11.65],[8.08,-11.48],[7.95,-11.40],[7.78,-11.42],[7.68,-11.56],[7.65,-11.78],[7.70,-11.98],[7.82,-12.08],[7.98,-12.12],[8.10,-12.10],[8.18,-12.08]],
  'Bombali': [[9.48,-12.48],[9.50,-12.25],[9.46,-12.02],[9.35,-11.80],[9.18,-11.65],[9.00,-11.62],[8.82,-11.72],[8.74,-11.92],[8.72,-12.15],[8.78,-12.35],[8.92,-12.48],[9.12,-12.52],[9.32,-12.50],[9.48,-12.48]],
  'Bonthe': [[7.82,-12.78],[7.85,-12.55],[7.78,-12.32],[7.65,-12.18],[7.48,-12.15],[7.32,-12.22],[7.22,-12.40],[7.20,-12.60],[7.28,-12.75],[7.42,-12.82],[7.62,-12.82],[7.82,-12.78]],
  'Kailahun': [[8.52,-10.88],[8.55,-10.68],[8.50,-10.48],[8.38,-10.32],[8.20,-10.25],[8.02,-10.30],[7.92,-10.48],[7.90,-10.68],[7.98,-10.85],[8.12,-10.92],[8.30,-10.92],[8.52,-10.88]],
  'Kambia': [[9.42,-13.28],[9.45,-13.08],[9.40,-12.88],[9.28,-12.68],[9.10,-12.60],[8.92,-12.65],[8.85,-12.82],[8.88,-13.02],[8.98,-13.20],[9.12,-13.30],[9.28,-13.32],[9.42,-13.28]],
  'Kenema': [[8.18,-11.38],[8.20,-11.22],[8.15,-11.05],[8.05,-10.92],[7.88,-10.88],[7.72,-10.95],[7.60,-11.10],[7.58,-11.28],[7.65,-11.42],[7.80,-11.48],[7.98,-11.45],[8.18,-11.38]],
  'Koinadugu': [[10.02,-11.58],[10.05,-11.35],[10.00,-11.12],[9.88,-10.95],[9.68,-10.88],[9.45,-10.92],[9.25,-11.05],[9.15,-11.25],[9.18,-11.45],[9.32,-11.58],[9.52,-11.62],[9.75,-11.62],[10.02,-11.58]],
  'Kono': [[8.92,-10.88],[8.95,-10.70],[8.88,-10.52],[8.72,-10.38],[8.52,-10.35],[8.35,-10.42],[8.24,-10.58],[8.22,-10.78],[8.30,-10.92],[8.48,-10.98],[8.68,-10.95],[8.92,-10.88]],
  'Moyamba': [[8.48,-12.78],[8.50,-12.55],[8.45,-12.32],[8.32,-12.15],[8.15,-12.10],[7.98,-12.18],[7.88,-12.38],[7.85,-12.58],[7.92,-12.75],[8.08,-12.82],[8.28,-12.82],[8.48,-12.78]],
  'Port Loko': [[8.82,-13.28],[8.85,-13.08],[8.82,-12.85],[8.72,-12.62],[8.58,-12.52],[8.52,-12.68],[8.50,-12.90],[8.52,-13.08],[8.55,-13.25],[8.62,-13.32],[8.72,-13.32],[8.82,-13.28]],
  'Pujehun': [[7.62,-12.12],[7.65,-11.90],[7.58,-11.65],[7.45,-11.48],[7.28,-11.42],[7.12,-11.50],[7.08,-11.72],[7.12,-11.95],[7.22,-12.10],[7.38,-12.18],[7.55,-12.15],[7.62,-12.12]],
  'Tonkolili': [[8.92,-12.48],[8.95,-12.25],[8.90,-12.02],[8.78,-11.82],[8.60,-11.68],[8.48,-11.72],[8.42,-11.90],[8.42,-12.12],[8.48,-12.32],[8.58,-12.48],[8.72,-12.52],[8.92,-12.48]],
  'Falaba': [[10.18,-11.58],[10.20,-11.35],[10.15,-11.12],[10.02,-10.95],[9.82,-10.88],[9.62,-10.95],[9.52,-11.15],[9.55,-11.38],[9.65,-11.55],[9.82,-11.62],[10.00,-11.62],[10.18,-11.58]],
  'Karene': [[9.48,-12.58],[9.50,-12.38],[9.45,-12.18],[9.32,-12.02],[9.15,-11.98],[9.02,-12.08],[8.98,-12.28],[9.02,-12.48],[9.15,-12.60],[9.32,-12.62],[9.48,-12.58]],
};

function buildGeoJSON(districts, coverageData, selectedOp) {
  const features = districts.map((d) => {
    const coords = DISTRICT_GEO[d.district];
    if (!coords) return null;
    const opData = coverageData.filter((c) => c.district === d.district);
    let coverage;
    if (selectedOp === 'ALL') {
      coverage = opData.reduce((s, c) => s + Number(c.coverage_pct), 0) / (opData.length || 1);
    } else {
      const opMatch = opData.find((c) => c.operator_name === selectedOp);
      coverage = Number(opMatch?.coverage_pct) || 0;
    }
    return {
      type: 'Feature',
      properties: { district: d.district, province: d.province, coverage, operators: opData },
      geometry: { type: 'Polygon', coordinates: [coords.map(([lat, lng]) => [lng, lat])] },
    };
  }).filter(Boolean);
  return { type: 'FeatureCollection', features };
}

function coverageColor(pct) {
  if (pct >= 85) return '#22c55e';
  if (pct >= 70) return '#84cc16';
  if (pct >= 55) return '#f59e0b';
  if (pct >= 40) return '#f97316';
  return '#ef4444';
}

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom || 9, { duration: 1 }); }, [center, zoom, map]);
  return null;
}

function MiniGauge({ value, label, unit = '%', size = 48 }) {
  const pct = unit === 'Kbps' ? Math.min((value / 5000) * 100, 100) : Math.min(value, 100);
  const color = pct >= 90 ? '#22c55e' : pct >= 75 ? '#f59e0b' : '#ef4444';
  return (
    <Box sx={{ textAlign: 'center', flex: 1 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress variant="determinate" value={pct} size={size}
          thickness={3.5} sx={{ color, '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }} />
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.1 }}>
            {unit === 'Kbps' ? (value / 1000).toFixed(1) : Number(value).toFixed(1)}
          </Typography>
          <Typography sx={{ fontSize: 7, color: 'text.secondary', lineHeight: 1 }}>
            {unit === 'Kbps' ? 'Mbps' : unit}
          </Typography>
        </Box>
      </Box>
      <Typography sx={{ fontSize: 8, color: 'text.secondary', mt: 0.3, textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {label}
      </Typography>
    </Box>
  );
}

function OperatorDetailCard({ data, borderColor }) {
  const signalData = [
    { label: 'Excellent', pct: data.signal_excellent_pct, color: '#22c55e' },
    { label: 'Good', pct: data.signal_good_pct, color: '#84cc16' },
    { label: 'Fair', pct: data.signal_fair_pct, color: '#f59e0b' },
    { label: 'Poor', pct: data.signal_poor_pct, color: '#ef4444' },
  ];
  const totalBar = signalData.reduce((s, d) => s + Number(d.pct), 0) || 1;

  return (
    <Paper sx={{
      p: 0, overflow: 'hidden', borderRadius: 2,
      border: '1px solid', borderColor: 'divider',
    }}>
      <Box sx={{
        px: 2, py: 1.2,
        background: `linear-gradient(135deg, ${alpha(borderColor, 0.15)}, ${alpha(borderColor, 0.05)})`,
        borderBottom: '1px solid', borderColor: 'divider',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 28, height: 28, bgcolor: borderColor, fontSize: 12 }}>
            <CellTowerIcon sx={{ fontSize: 16 }} />
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{data.operator_name}</Typography>
            <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
              {data.sites_count} sites &middot; {Number(data.pop_coverage_pct).toFixed(0)}% pop.
            </Typography>
          </Box>
        </Stack>
        <Box sx={{
          px: 1.2, py: 0.3, borderRadius: 1.5,
          bgcolor: coverageColor(data.coverage_pct), color: '#fff',
          fontWeight: 700, fontSize: 13, lineHeight: 1.4,
        }}>
          {Number(data.coverage_pct).toFixed(1)}%
        </Box>
      </Box>

      <Box sx={{ px: 2, py: 1.5 }}>
        <Stack direction="row" spacing={0.5} justifyContent="space-around" mb={1.5}>
          <MiniGauge value={Number(data.availability_pct)} label="Availability" />
          <MiniGauge value={Number(data.accessibility_pct)} label="Accessibility" />
          <MiniGauge value={Number(data.avg_download_kbps)} label="Speed" unit="Kbps" />
        </Stack>

        <Typography sx={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, mb: 0.5 }}>
          Signal Quality
        </Typography>
        <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', mb: 0.5 }}>
          {signalData.map((s) => (
            <Box key={s.label} sx={{ width: `${(Number(s.pct) / totalBar) * 100}%`, bgcolor: s.color, transition: 'width 0.5s' }} />
          ))}
        </Box>
        <Stack direction="row" justifyContent="space-between">
          {signalData.map((s) => (
            <Stack key={s.label} direction="row" spacing={0.3} alignItems="center">
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: s.color }} />
              <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>{s.label} {Number(s.pct).toFixed(0)}%</Typography>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 1 }} />
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {[
            { t: '2G', v: data.cells_2g, c: '#78909c' },
            { t: '3G', v: data.cells_3g, c: '#42a5f5' },
            { t: '4G', v: data.cells_4g, c: '#66bb6a' },
            { t: '5G', v: data.cells_5g, c: '#ab47bc' },
          ].filter((x) => Number(x.v) > 0).map((x) => (
            <Chip key={x.t} label={`${x.t}: ${x.v}`} size="small"
              sx={{ fontSize: 9, height: 18, bgcolor: alpha(x.c, 0.15), color: x.c, fontWeight: 600, '& .MuiChip-label': { px: 0.8 } }} />
          ))}
        </Stack>
      </Box>
    </Paper>
  );
}

const glassPanel = (mode) => ({
  bgcolor: mode === 'dark' ? 'rgba(17,24,39,0.88)' : 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(12px)',
  borderRadius: 3,
  border: '1px solid',
  borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  boxShadow: mode === 'dark'
    ? '0 8px 32px rgba(0,0,0,0.4)'
    : '0 8px 32px rgba(0,0,0,0.12)',
});

export default function RegionalCoverage() {
  const { mode } = useColorMode();
  const [allData, setAllData] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [national, setNational] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedOp, setSelectedOp] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [flyTarget, setFlyTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [d, a, n] = await Promise.all([
        get('/regional-coverage/districts'),
        get('/regional-coverage/all'),
        get('/regional-coverage/national'),
      ]);
      setDistricts(d.data);
      setAllData(a.data);
      setNational(n.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const operators = useMemo(() =>
    [...new Set(allData.map((d) => d.operator_name))].sort()
  , [allData]);

  const geoData = useMemo(() =>
    buildGeoJSON(districts, allData, selectedOp)
  , [districts, allData, selectedOp]);

  const districtData = useMemo(() =>
    selected ? allData.filter((d) => d.district === selected) : []
  , [allData, selected]);

  const tileUrl = mode === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  if (loading && !allData.length) {
    return <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}><CircularProgress /></Box>;
  }

  const handleDistrictClick = (district) => {
    setSelected(district);
    const center = DISTRICT_CENTERS[district];
    if (center) setFlyTarget({ center, zoom: 10 });
  };

  const handleBack = () => {
    setSelected(null);
    setFlyTarget({ center: SL_CENTER, zoom: 7.5 });
  };

  const onEachFeature = (feature, layer) => {
    const p = feature.properties;
    layer.on({
      click: () => handleDistrictClick(p.district),
      mouseover: (e) => {
        e.target.setStyle({ weight: 2.5, fillOpacity: 0.75 });
        e.target.bringToFront();
      },
      mouseout: (e) => {
        e.target.setStyle({ weight: 1.5, fillOpacity: 0.55 });
      },
    });
    layer.bindTooltip(
      `<div style="text-align:center"><strong>${p.district}</strong><br/><span style="font-size:14px;font-weight:700;color:${coverageColor(p.coverage)}">${p.coverage.toFixed(1)}%</span></div>`,
      { sticky: true, className: 'coverage-tooltip' }
    );
  };

  const geoStyle = (feature) => ({
    fillColor: coverageColor(feature.properties.coverage),
    weight: 1.5,
    opacity: 1,
    color: mode === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
    fillOpacity: 0.55,
  });

  const filteredNational = selectedOp === 'ALL' ? national : national.filter((n) => n.operator_name === selectedOp);

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
      
      {/* Fixed Left Panel */}
      <Box sx={{
        width: { xs: 320, md: 360 },
        display: 'flex', flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: '1px solid', borderColor: 'divider',
        overflow: 'hidden',
        zIndex: 2,
      }}>
        {/* Panel header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {selected && (
              <IconButton size="small" onClick={handleBack} sx={{ mr: -0.5 }}>
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            )}
            <PublicIcon color="primary" sx={{ fontSize: 20 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selected || 'Regional Coverage'}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                {selected ? districts.find((d) => d.district === selected)?.province : `${districts.length} districts`}
              </Typography>
            </Box>
            <IconButton size="small" onClick={load}><RefreshIcon sx={{ fontSize: 18 }} /></IconButton>
          </Stack>
        </Box>

        {/* Panel body */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 } }}>
          {!selected ? (
            <>
              {/* Operator filter */}
              <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
                <InputLabel>Operator</InputLabel>
                <Select value={selectedOp} label="Operator" onChange={(e) => setSelectedOp(e.target.value)}>
                  <MenuItem value="ALL">All Operators</MenuItem>
                  {operators.map((op) => <MenuItem key={op} value={op}>{op}</MenuItem>)}
                </Select>
              </FormControl>

              {/* National operator summaries */}
              <Stack spacing={1} mb={2}>
                {filteredNational.map((op) => {
                  const oc = opColor(op.operator_name);
                  return (
                    <Paper key={op.operator_name} sx={{
                      p: 0, overflow: 'hidden', borderRadius: 2,
                      border: '1px solid', borderColor: 'divider',
                      cursor: 'pointer', transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 4px 12px ${alpha(oc, 0.25)}` },
                    }}
                    onClick={() => setSelectedOp(op.operator_name === selectedOp ? 'ALL' : op.operator_name)}>
                      <Box sx={{
                        px: 1.5, py: 1,
                        background: `linear-gradient(135deg, ${alpha(oc, 0.12)}, transparent)`,
                        display: 'flex', alignItems: 'center', gap: 1,
                      }}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: oc, fontSize: 11, fontWeight: 700 }}>
                          {op.operator_name.charAt(0)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 12.5 }}>{op.operator_name}</Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Stack direction="row" spacing={0.3} alignItems="center">
                              <PeopleIcon sx={{ fontSize: 10, color: 'text.secondary' }} />
                              <Typography sx={{ fontSize: 9.5, color: 'text.secondary' }}>{op.districts_covered} districts</Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.3} alignItems="center">
                              <CellTowerIcon sx={{ fontSize: 10, color: 'text.secondary' }} />
                              <Typography sx={{ fontSize: 9.5, color: 'text.secondary' }}>{op.total_sites} sites</Typography>
                            </Stack>
                          </Stack>
                        </Box>
                        <Box sx={{
                          px: 1, py: 0.3, borderRadius: 1.5,
                          bgcolor: coverageColor(op.avg_coverage), color: '#fff',
                          fontWeight: 700, fontSize: 12, minWidth: 48, textAlign: 'center',
                        }}>
                          {op.avg_coverage}%
                        </Box>
                      </Box>
                      <Box sx={{ px: 1.5, py: 1 }}>
                        <Stack direction="row" spacing={0.5} justifyContent="space-around">
                          <MiniGauge value={Number(op.avg_availability)} label="Avail." size={40} />
                          <MiniGauge value={Number(op.avg_accessibility)} label="Access." size={40} />
                          <MiniGauge value={Number(op.avg_download)} label="Speed" unit="Kbps" size={40} />
                        </Stack>
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>

              {/* District list */}
              <Typography sx={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.secondary', mb: 0.8 }}>
                Districts
              </Typography>
              <Stack spacing={0.5}>
                {districts.map((d) => {
                  const districtOps = allData.filter((a) => a.district === d.district);
                  const avgCov = districtOps.reduce((s, a, _, arr) => s + Number(a.coverage_pct) / arr.length, 0);
                  return (
                    <Paper key={d.district} sx={{
                      px: 1.5, py: 0.8, borderRadius: 1.5,
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      border: '1px solid', borderColor: 'divider',
                      transition: 'all 0.15s',
                      '&:hover': { bgcolor: 'action.hover', borderColor: coverageColor(avgCov) },
                    }}
                    onClick={() => handleDistrictClick(d.district)}>
                      <Box sx={{
                        width: 6, height: 24, borderRadius: 3, mr: 1.2, flexShrink: 0,
                        bgcolor: coverageColor(avgCov),
                      }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{d.district}</Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{d.province}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: coverageColor(avgCov), mr: 0.5 }}>
                        {avgCov.toFixed(1)}%
                      </Typography>
                      <KeyboardArrowRightIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </Paper>
                  );
                })}
              </Stack>
            </>
          ) : (
            <Stack spacing={1.2}>
              {districtData
                .sort((a, b) => b.coverage_pct - a.coverage_pct)
                .map((op) => (
                  <OperatorDetailCard key={op.operator_name} data={op} borderColor={opColor(op.operator_name)} />
                ))}
            </Stack>
          )}
        </Box>
      </Box>

      {/* Map Area */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <MapContainer center={SL_CENTER} zoom={7.5} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url={tileUrl} attribution='&copy; OpenStreetMap, CARTO' />
          <GeoJSON key={`${selectedOp}-${mode}`} data={geoData}
            style={geoStyle} onEachFeature={onEachFeature} />
          {flyTarget && <FlyTo center={flyTarget.center} zoom={flyTarget.zoom} />}
        </MapContainer>

        {/* Coverage legend */}
        <Paper sx={{
          position: 'absolute', bottom: 20, right: 16, zIndex: 1000,
          px: 1.5, py: 1, minWidth: 130,
          ...glassPanel(mode),
        }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Coverage
          </Typography>
          {[
            { label: 'Excellent (85%+)', color: '#22c55e' },
            { label: 'Good (70-85%)', color: '#84cc16' },
            { label: 'Moderate (55-70%)', color: '#f59e0b' },
            { label: 'Low (40-55%)', color: '#f97316' },
            { label: 'Critical (<40%)', color: '#ef4444' },
          ].map((l) => (
            <Stack key={l.label} direction="row" spacing={0.8} alignItems="center" sx={{ py: 0.15 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: l.color, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 10 }}>{l.label}</Typography>
            </Stack>
          ))}
        </Paper>

        {/* Stats bar */}
        <Box sx={{
          position: 'absolute', top: 16, right: 16, zIndex: 1000,
          display: 'flex', gap: 1,
        }}>
          {filteredNational.slice(0, 4).map((op) => (
            <Box key={op.operator_name} sx={{
              px: 1.2, py: 0.6, display: 'flex', alignItems: 'center', gap: 0.8,
              ...glassPanel(mode),
            }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: opColor(op.operator_name) }} />
              <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{op.operator_name}</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: coverageColor(op.avg_coverage) }}>
                {op.avg_coverage}%
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
