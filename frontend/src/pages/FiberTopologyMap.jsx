import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Tooltip as MapTooltip } from 'react-leaflet';
import {
  Box, Button, Card, CardContent, Chip, Divider, FormControl, InputLabel,
  LinearProgress, MenuItem, Select, Stack, ToggleButton, ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BarChartIcon from '@mui/icons-material/BarChart';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { get } from '../api/client';
import { Loading, EmptyState } from '../components/ui';
import { useColorMode } from '../theme/ColorMode';

const SL_CENTER = [8.4, -11.8];
const SL_ZOOM   = 7;

const OP_PALETTE = ['#f97316', '#4c8ef7', '#22c55e', '#a855f7'];
const STATUS_CHIP = { ACTIVE: 'success', DEGRADED: 'warning', DOWN: 'error' };
const NODE_RADIUS = { CORE: 10, HUB: 7, OLT: 5, AGGREGATION: 6, POP: 6 };
const LINK_WEIGHT = { BACKBONE: 3.5, METRO: 2.5, ACCESS: 1.5, CROSS_CONNECT: 2 };
const LINK_DASH   = { BACKBONE: null, METRO: null, ACCESS: null, CROSS_CONNECT: '8 4' };

function utilColor(pct) {
  const p = Number(pct ?? 0);
  if (p >= 80) return '#ef4444';
  if (p >= 60) return '#f97316';
  if (p >= 40) return '#eab308';
  return '#22c55e';
}

function timeAgo(dt) {
  const d = new Date(dt);
  const h = Math.round((Date.now() - d.getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function FiberTopologyMap() {
  const navigate = useNavigate();
  const { mode } = useColorMode();
  const [topology, setTopology] = useState(null);
  const [operators, setOperators] = useState([]);
  const [outages, setOutages] = useState([]);
  const [opFilter, setOpFilter]       = useState('');
  const [typeFilter, setTypeFilter]   = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [colorMode, setColorMode] = useState('operator');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/operators').then((r) => setOperators(r.data ?? [])).catch(() => {});
    get('/fiber/outages').then((r) => setOutages(r.data ?? [])).catch(() => {});
    get('/fiber/topology')
      .then((r) => setTopology(r.data))
      .catch(() => setTopology({ nodes: [], links: [] }))
      .finally(() => setLoading(false));
  }, []);

  const opColorMap = useMemo(() => {
    if (!topology) return {};
    const map = {};
    for (const n of topology.nodes) {
      if (!map[n.operator_id]) {
        map[n.operator_id] = { color: OP_PALETTE[Object.keys(map).length % OP_PALETTE.length], name: n.operator_name };
      }
    }
    return map;
  }, [topology]);

  const filteredNodes = useMemo(() => {
    if (!topology) return [];
    return topology.nodes.filter((n) =>
      (!opFilter || n.operator_id === Number(opFilter)) && n.lat != null
    );
  }, [topology, opFilter]);

  const filteredLinks = useMemo(() => {
    if (!topology) return [];
    return topology.links.filter((l) =>
      (!opFilter || l.operator_id === Number(opFilter)) &&
      (typeFilter === 'ALL' || l.link_type === typeFilter) &&
      (statusFilter === 'ALL' || l.status === statusFilter) &&
      l.lat_a != null && l.lat_b != null
    );
  }, [topology, opFilter, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    if (!topology) return {};
    const links = opFilter ? filteredLinks : topology.links;
    return {
      nodes: filteredNodes.length,
      links: filteredLinks.length,
      active:   links.filter((l) => l.status === 'ACTIVE').length,
      degraded: links.filter((l) => l.status === 'DEGRADED').length,
      down:     links.filter((l) => l.status === 'DOWN').length,
      km:       Math.round(links.reduce((s, l) => s + Number(l.distance_km || 0), 0)),
      avgUtil:  links.length ? (links.reduce((s, l) => s + Number(l.utilization_pct || 0), 0) / links.length).toFixed(1) : '0',
    };
  }, [topology, filteredNodes, filteredLinks, opFilter]);

  const activeOutages = outages.filter((o) => o.status !== 'RESOLVED');

  const tileUrl = mode === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  if (loading) return <Loading />;
  if (!topology?.nodes?.length) return <EmptyState message="No fiber topology data." />;

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <Box sx={{ width: 280, flexShrink: 0, overflowY: 'auto', p: 2, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
          <AccountTreeIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={600}>Fiber Backbone</Typography>
        </Stack>
        <Button size="small" startIcon={<BarChartIcon />} onClick={() => navigate('/fiber')}
          sx={{ mb: 1.5, textTransform: 'none', fontSize: 12, p: 0, minWidth: 0 }}>
          KPI Dashboard
        </Button>

        {/* Stats */}
        <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5, mb: 2 }}>
          {[
            { label: 'Nodes shown',    value: stats.nodes },
            { label: 'Links shown',    value: stats.links },
            { label: 'Active',         value: stats.active,   color: 'success.main' },
            { label: 'Degraded',       value: stats.degraded, color: 'warning.main' },
            { label: 'Down',           value: stats.down,     color: 'error.main' },
            { label: 'Total route',    value: `${stats.km.toLocaleString()} km` },
            { label: 'Avg utilization', value: `${stats.avgUtil}%` },
          ].map((s) => (
            <Stack key={s.label} direction="row" justifyContent="space-between" alignItems="center" py={0.4}>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              <Typography variant="caption" fontWeight={700} color={s.color ?? 'text.primary'}>{s.value}</Typography>
            </Stack>
          ))}
        </Box>

        {/* Active outages */}
        {activeOutages.length > 0 && (
          <>
            <Stack direction="row" alignItems="center" gap={0.5} mb={0.75}>
              <ReportProblemIcon sx={{ fontSize: 14, color: 'error.main' }} />
              <Typography variant="caption" fontWeight={700} color="error.main">
                {activeOutages.length} Active Incident{activeOutages.length > 1 ? 's' : ''}
              </Typography>
            </Stack>
            <Stack gap={0.75} mb={2}>
              {activeOutages.slice(0, 3).map((o) => (
                <Box key={o.outage_id} sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1, borderLeft: 3,
                  borderColor: o.severity === 'CRITICAL' ? 'error.main' : o.severity === 'MAJOR' ? 'warning.main' : 'info.main' }}>
                  <Typography variant="caption" fontWeight={600} display="block" lineHeight={1.3}>{o.title}</Typography>
                  <Typography variant="caption" color="text.disabled">
                    {o.operator_name} · {timeAgo(o.started_at)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </>
        )}

        {/* Filters */}
        <Typography variant="caption" color="text.disabled" fontWeight={700} display="block" mb={1} letterSpacing={0.5}>FILTERS</Typography>
        <Stack gap={1.5} mb={2}>
          <FormControl size="small" fullWidth>
            <InputLabel>Operator</InputLabel>
            <Select value={opFilter} label="Operator" onChange={(e) => setOpFilter(e.target.value)}>
              <MenuItem value="">All Operators</MenuItem>
              {operators.map((o) => (
                <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Link Type</InputLabel>
            <Select value={typeFilter} label="Link Type" onChange={(e) => setTypeFilter(e.target.value)}>
              {['ALL','BACKBONE','METRO','ACCESS','CROSS_CONNECT'].map((t) => (
                <MenuItem key={t} value={t}>{t === 'ALL' ? 'All Types' : t.replace('_', ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
              {['ALL','ACTIVE','DEGRADED','DOWN'].map((s) => (
                <MenuItem key={s} value={s}>{s === 'ALL' ? 'All Status' : s}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Color mode toggle */}
        <Typography variant="caption" color="text.disabled" fontWeight={700} display="block" mb={0.75} letterSpacing={0.5}>LINK COLORING</Typography>
        <ToggleButtonGroup value={colorMode} exclusive onChange={(_, v) => v && setColorMode(v)}
          size="small" sx={{ mb: 2 }} fullWidth>
          <ToggleButton value="operator" sx={{ fontSize: 11, textTransform: 'none' }}>By Operator</ToggleButton>
          <ToggleButton value="utilization" sx={{ fontSize: 11, textTransform: 'none' }}>By Utilization</ToggleButton>
        </ToggleButtonGroup>

        <Divider sx={{ mb: 1.5 }} />

        {/* Operator legend */}
        <Typography variant="caption" color="text.disabled" fontWeight={700} display="block" mb={1} letterSpacing={0.5}>OPERATORS</Typography>
        <Stack gap={0.75} mb={2}>
          {Object.entries(opColorMap).map(([opId, { color, name }]) => (
            <Stack key={opId} direction="row" alignItems="center" gap={1}>
              <Box sx={{ width: 22, height: 3, borderRadius: 1, bgcolor: color, flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary">{name}</Typography>
            </Stack>
          ))}
        </Stack>

        {colorMode === 'utilization' && (
          <>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="caption" color="text.disabled" fontWeight={700} display="block" mb={1} letterSpacing={0.5}>UTILIZATION SCALE</Typography>
            <Stack gap={0.5} mb={2}>
              {[
                { color: '#22c55e', label: '0–40% (Normal)' },
                { color: '#eab308', label: '40–60% (Moderate)' },
                { color: '#f97316', label: '60–80% (High)' },
                { color: '#ef4444', label: '80–100% (Critical)' },
              ].map(({ color, label }) => (
                <Stack key={label} direction="row" alignItems="center" gap={1}>
                  <Box sx={{ width: 22, height: 3, borderRadius: 1, bgcolor: color, flexShrink: 0 }} />
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                </Stack>
              ))}
            </Stack>
          </>
        )}

        <Divider sx={{ mb: 1.5 }} />

        {/* Node type legend */}
        <Typography variant="caption" color="text.disabled" fontWeight={700} display="block" mb={1} letterSpacing={0.5}>NODE TYPES</Typography>
        <Stack gap={0.75} mb={2}>
          {[['CORE', 10, 'Core Router (IXP)'], ['HUB', 7, 'Hub / PoP'], ['OLT', 5, 'OLT (Last Mile)']].map(([type, r, label]) => (
            <Stack key={type} direction="row" alignItems="center" gap={1}>
              <Box sx={{ width: r, height: r, borderRadius: '50%', bgcolor: '#64748b', border: '1.5px solid #94a3b8', flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ mb: 1.5 }} />

        {/* Link type legend */}
        <Typography variant="caption" color="text.disabled" fontWeight={700} display="block" mb={1} letterSpacing={0.5}>LINK TYPES</Typography>
        <Stack gap={0.75} mb={2}>
          {[
            { label: 'Backbone',      w: 3.5, dash: false },
            { label: 'Metro',         w: 2.5, dash: false },
            { label: 'Cross-Connect', w: 2,   dash: true  },
          ].map(({ label, w, dash }) => (
            <Stack key={label} direction="row" alignItems="center" gap={1}>
              <Box sx={{
                width: 24, height: w, borderRadius: 0.5, flexShrink: 0,
                ...(dash
                  ? { backgroundImage: 'repeating-linear-gradient(90deg,#64748b 0,#64748b 5px,transparent 5px,transparent 8px)', bgcolor: 'transparent' }
                  : { bgcolor: '#64748b' })
              }} />
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Stack>
          ))}
        </Stack>

        {/* Selected detail panel */}
        {selected && (
          <>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="caption" color="text.disabled" fontWeight={700} display="block" mb={1} letterSpacing={0.5}>
              {selected.type === 'node' ? 'NODE DETAIL' : 'LINK DETAIL'}
            </Typography>
            <Card variant="outlined">
              <CardContent sx={{ p: '12px !important' }}>
                {selected.type === 'node' ? (
                  <Stack gap={0.5}>
                    <Typography variant="body2" fontWeight={700}>{selected.data.node_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{selected.data.city} · {selected.data.location}</Typography>
                    <Stack direction="row" gap={0.5} flexWrap="wrap" mt={0.5}>
                      <Chip label={selected.data.node_type} size="small" sx={{ height: 18, fontSize: 10 }} />
                      <Chip label={selected.data.operator_name} size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />
                    </Stack>
                    <Typography variant="caption" color="text.disabled" mt={0.5}>Vendor: {selected.data.vendor || '—'}</Typography>
                    <Typography variant="caption" color="text.disabled">
                      Lat: {Number(selected.data.lat).toFixed(4)}, Lng: {Number(selected.data.lng).toFixed(4)}
                    </Typography>
                  </Stack>
                ) : (
                  <Stack gap={0.5}>
                    <Typography variant="body2" fontWeight={700} lineHeight={1.3}>
                      {selected.data.city_a} → {selected.data.city_b}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{selected.data.node_a_name} ↔ {selected.data.node_b_name}</Typography>
                    <Stack direction="row" gap={0.5} flexWrap="wrap" mt={0.5}>
                      <Chip label={selected.data.link_type.replace('_', ' ')} size="small" sx={{ height: 18, fontSize: 10 }} />
                      <Chip label={selected.data.status} size="small" color={STATUS_CHIP[selected.data.status] ?? 'default'} sx={{ height: 18, fontSize: 10 }} />
                    </Stack>
                    <Stack gap={0.25} mt={0.5}>
                      {[
                        ['Operator',     selected.data.operator_name],
                        ['Distance',     `${selected.data.distance_km} km`],
                        ['Capacity',     `${selected.data.capacity_gbps} Gbps`],
                        ['Utilization',  `${selected.data.utilization_pct}%`],
                      ].map(([k, v]) => (
                        <Stack key={k} direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.disabled">{k}</Typography>
                          <Typography variant="caption" fontWeight={600}>{v}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                    {/* Utilization bar */}
                    <Box sx={{ mt: 0.75 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(Number(selected.data.utilization_pct), 100)}
                        sx={{
                          height: 6, borderRadius: 1,
                          bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': { bgcolor: utilColor(selected.data.utilization_pct), borderRadius: 1 },
                        }}
                      />
                    </Box>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Box>

      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <MapContainer center={SL_CENTER} zoom={SL_ZOOM} style={{ width: '100%', height: '100%' }}>
          <TileLayer url={tileUrl} attribution="&copy; CartoDB" />

          {/* Links */}
          {filteredLinks.map((link) => {
            const opColor = opColorMap[link.operator_id]?.color ?? '#64748b';
            let lineColor;
            if (link.status === 'DOWN') lineColor = '#ef4444';
            else if (link.status === 'DEGRADED') lineColor = '#f97316';
            else lineColor = colorMode === 'utilization' ? utilColor(link.utilization_pct) : opColor;

            return (
              <Polyline
                key={link.link_id}
                positions={[[Number(link.lat_a), Number(link.lng_a)], [Number(link.lat_b), Number(link.lng_b)]]}
                pathOptions={{
                  color:     lineColor,
                  weight:    LINK_WEIGHT[link.link_type] ?? 2,
                  opacity:   link.status === 'DOWN' ? 0.4 : 0.8,
                  dashArray: link.status === 'DOWN' ? '6 6' : LINK_DASH[link.link_type],
                }}
                eventHandlers={{ click: () => setSelected({ type: 'link', data: link }) }}
              >
                <MapTooltip direction="center" opacity={0.9} className="fiber-link-tooltip">
                  <span style={{ fontSize: 11 }}>
                    {link.city_a}→{link.city_b} · {link.utilization_pct}% · {link.status}
                  </span>
                </MapTooltip>
              </Polyline>
            );
          })}

          {/* Nodes */}
          {filteredNodes.map((node) => {
            const opColor = opColorMap[node.operator_id]?.color ?? '#64748b';
            const radius  = NODE_RADIUS[node.node_type] ?? 5;
            return (
              <CircleMarker
                key={node.node_id}
                center={[Number(node.lat), Number(node.lng)]}
                radius={radius}
                pathOptions={{ color: '#fff', weight: 1.5, fillColor: opColor, fillOpacity: 0.92 }}
                eventHandlers={{ click: () => setSelected({ type: 'node', data: node }) }}
              >
                <MapTooltip direction="top" offset={[0, -radius]} opacity={0.95} permanent={node.node_type === 'CORE'}>
                  <span style={{ fontSize: 10, fontWeight: node.node_type === 'CORE' ? 700 : 500 }}>
                    {node.city}
                  </span>
                </MapTooltip>
                <Popup>
                  <strong>{node.node_name}</strong><br />
                  {node.city} · {node.node_type}<br />
                  {node.operator_name} · {node.vendor || '—'}
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Map title overlay */}
        <Box sx={{
          position: 'absolute', top: 12, right: 12, zIndex: 1000,
          bgcolor: 'background.paper', border: 1, borderColor: 'divider',
          borderRadius: 1, px: 1.5, py: 0.75, boxShadow: 2,
        }}>
          <Typography variant="caption" color="text.secondary">
            Sierra Leone · National Fiber Backbone
          </Typography>
        </Box>

        {/* Network health overlay */}
        <Box sx={{
          position: 'absolute', bottom: 24, left: 12, zIndex: 1000,
          bgcolor: 'background.paper', border: 1, borderColor: 'divider',
          borderRadius: 1, p: 1.5, boxShadow: 2, minWidth: 180,
        }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>
            Network Health
          </Typography>
          <Stack direction="row" gap={0.5} mb={0.5} sx={{ height: 6, borderRadius: 1, overflow: 'hidden' }}>
            {stats.active > 0 && <Box sx={{ flex: stats.active, bgcolor: 'success.main', borderRadius: 0.5 }} />}
            {stats.degraded > 0 && <Box sx={{ flex: stats.degraded, bgcolor: 'warning.main', borderRadius: 0.5 }} />}
            {stats.down > 0 && <Box sx={{ flex: stats.down, bgcolor: 'error.main', borderRadius: 0.5 }} />}
          </Stack>
          <Stack direction="row" gap={1.5}>
            <Typography variant="caption" color="success.main" fontWeight={600}>{stats.active} OK</Typography>
            {stats.degraded > 0 && <Typography variant="caption" color="warning.main" fontWeight={600}>{stats.degraded} WARN</Typography>}
            {stats.down > 0 && <Typography variant="caption" color="error.main" fontWeight={600}>{stats.down} DOWN</Typography>}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
