import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Stack, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert,
  LinearProgress, Drawer, IconButton, Divider, Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import MapIcon from '@mui/icons-material/Map';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Tooltip as MapTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { get, put } from '../api/client';
import { useColorMode } from '../theme/ColorMode';
import { useAuth } from '../auth/AuthContext';

const CATEGORIES = {
  CALL_DROP: 'Call Drop', NO_COVERAGE: 'No Coverage', SLOW_DATA: 'Slow Data',
  BILLING: 'Billing', SERVICE_OUTAGE: 'Service Outage', POOR_VOICE: 'Poor Voice',
  SMS_FAILURE: 'SMS Failure', OTHER: 'Other',
};
const SEVERITIES = { LOW: 'default', MEDIUM: 'info', HIGH: 'warning', CRITICAL: 'error' };
const STATUSES = {
  OPEN: 'warning', INVESTIGATING: 'info', ESCALATED: 'error',
  RESOLVED: 'success', CLOSED: 'default',
};
const CAT_COLORS = ['#f97316', '#4c8ef7', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#06b6d4', '#78716c'];

function timeSince(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function StatCard({ label, value, color, sub }) {
  return (
    <Paper sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {sub && <Typography variant="caption" color="text.disabled">{sub}</Typography>}
    </Paper>
  );
}

export default function ComplaintPortal() {
  const { mode } = useColorMode();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [operators, setOperators] = useState([]);
  const [filterOperator, setFilterOperator] = useState('');
  const [selected, setSelected] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.all([
        get('/complaints/summary', {
          ...(filterOperator && { operatorId: filterOperator }),
        }),
        get('/complaints', {
          ...(filterStatus && { status: filterStatus }),
          ...(filterCategory && { category: filterCategory }),
          ...(filterSeverity && { severity: filterSeverity }),
          ...(filterOperator && { operatorId: filterOperator }),
        }),
      ]);
      setSummary(sumRes.data);
      setComplaints(listRes.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    get('/operators').then((r) => setOperators(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [filterStatus, filterCategory, filterSeverity, filterOperator]);

  const statusCounts = {};
  summary?.byStatus?.forEach((r) => { statusCounts[r.status] = r.cnt; });
  const openCount = (statusCounts.OPEN || 0) + (statusCounts.INVESTIGATING || 0) + (statusCounts.ESCALATED || 0);
  const resolvedCount = (statusCounts.RESOLVED || 0) + (statusCounts.CLOSED || 0);
  const escalatedCount = statusCounts.ESCALATED || 0;
  const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const critSev = summary?.bySeverity?.find((s) => s.severity === 'CRITICAL')?.cnt || 0;

  const categoryData = summary?.byCategory?.map((r, i) => ({
    name: CATEGORIES[r.category] || r.category, value: r.cnt, fill: CAT_COLORS[i % CAT_COLORS.length],
  })) || [];

  const opData = {};
  summary?.byOperator?.forEach((r) => {
    if (!opData[r.operator_name]) opData[r.operator_name] = { name: r.operator_name };
    opData[r.operator_name][r.status] = r.cnt;
  });
  const barData = Object.values(opData);

  const geoComplaints = complaints.filter((c) => c.lat && c.lng);

  const tileUrl = mode === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const sevColor = (sev) => {
    if (sev === 'CRITICAL') return '#ef4444';
    if (sev === 'HIGH') return '#f97316';
    if (sev === 'MEDIUM') return '#3b82f6';
    return '#6b7280';
  };

  if (loading && !summary) {
    return <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Complaint Management Portal</Typography>
          <Typography variant="body2" color="text.secondary">
            Consumer Experience Intelligence — Track and resolve subscriber complaints
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant={showMap ? 'contained' : 'outlined'} size="small" startIcon={<MapIcon />}
            onClick={() => setShowMap(!showMap)}>
            {showMap ? 'Hide Map' : 'Complaint Map'}
          </Button>
          <IconButton onClick={load}><RefreshIcon /></IconButton>
        </Stack>
      </Stack>

      {/* KPI cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <StatCard label="Total Complaints" value={totalCount} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Open / Active" value={openCount} color="warning.main" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Escalated" value={escalatedCount} color="error.main" sub={`${critSev} critical`} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Resolved" value={resolvedCount} color="success.main"
            sub={totalCount ? `${Math.round(resolvedCount / totalCount * 100)}% resolution` : ''} />
        </Grid>
      </Grid>

      {/* Map */}
      {showMap && geoComplaints.length > 0 && (
        <Paper sx={{ mb: 3, overflow: 'hidden', borderRadius: 2 }}>
          <MapContainer center={[8.4, -12.0]} zoom={7} style={{ height: 400 }}>
            <TileLayer url={tileUrl} />
            {geoComplaints.map((c) => (
              <CircleMarker key={c.complaint_id} center={[c.lat, c.lng]}
                radius={c.severity === 'CRITICAL' ? 10 : c.severity === 'HIGH' ? 8 : 6}
                pathOptions={{ color: sevColor(c.severity), fillColor: sevColor(c.severity), fillOpacity: 0.7 }}
                eventHandlers={{ click: () => setSelected(c) }}>
                <MapTooltip>
                  <strong>{c.reference_no}</strong><br />
                  {CATEGORIES[c.category] || c.category} — {c.severity}<br />
                  {c.city}, {c.district}<br />
                  {c.operator_name}
                </MapTooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </Paper>
      )}

      {/* Charts row */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="subtitle2" gutterBottom>Open Complaints by Category</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={90} innerRadius={45} paddingAngle={2} label={({ name, value }) => `${name} (${value})`}>
                  {categoryData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="subtitle2" gutterBottom>Complaints by Operator & Status</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <RTooltip />
                <Legend />
                <Bar dataKey="OPEN" stackId="a" fill="#f59e0b" name="Open" />
                <Bar dataKey="INVESTIGATING" stackId="a" fill="#3b82f6" name="Investigating" />
                <Bar dataKey="ESCALATED" stackId="a" fill="#ef4444" name="Escalated" />
                <Bar dataKey="RESOLVED" stackId="a" fill="#22c55e" name="Resolved" />
                <Bar dataKey="CLOSED" stackId="a" fill="#6b7280" name="Closed" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {user?.role !== 'OPERATOR_USER' && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Operator</InputLabel>
              <Select value={filterOperator} label="Operator" onChange={(e) => setFilterOperator(e.target.value)}>
                <MenuItem value="">All Operators</MenuItem>
                {operators.map((o) => (
                  <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {Object.keys(STATUSES).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Category</InputLabel>
            <Select value={filterCategory} label="Category" onChange={(e) => setFilterCategory(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {Object.entries(CATEGORIES).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Severity</InputLabel>
            <Select value={filterSeverity} label="Severity" onChange={(e) => setFilterSeverity(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {Object.keys(SEVERITIES).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
            {complaints.length} complaint{complaints.length !== 1 ? 's' : ''}
          </Typography>
        </Stack>
      </Paper>

      {/* Complaints table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ref #</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Operator</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Reported</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {complaints.map((c) => (
              <TableRow key={c.complaint_id} hover sx={{ cursor: 'pointer' }}
                onClick={() => setSelected(c)}>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                    {c.reference_no}
                  </Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 260 }}>
                  <Typography variant="body2" noWrap>{c.subject}</Typography>
                </TableCell>
                <TableCell>{c.operator_name}</TableCell>
                <TableCell>
                  <Chip size="small" label={CATEGORIES[c.category] || c.category} variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={c.severity} color={SEVERITIES[c.severity] || 'default'} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={c.status} color={STATUSES[c.status] || 'default'} variant="filled" />
                </TableCell>
                <TableCell>{c.city || '—'}</TableCell>
                <TableCell>
                  <Tooltip title={new Date(c.reported_at).toLocaleString()}>
                    <Typography variant="body2">{timeSince(c.reported_at)}</Typography>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {complaints.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center">No complaints found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Detail drawer */}
      <Drawer anchor="right" open={!!selected} onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, p: 3 } }}>
        {selected && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontFamily="monospace">{selected.reference_no}</Typography>
              <IconButton onClick={() => setSelected(null)}><CloseIcon /></IconButton>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>{selected.subject}</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>{selected.description || 'No description'}</Typography>
            <Grid container spacing={1} mb={2}>
              <Grid item xs={6}><Typography variant="caption" color="text.disabled">Operator</Typography>
                <Typography variant="body2">{selected.operator_name}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.disabled">Category</Typography>
                <Typography variant="body2">{CATEGORIES[selected.category]}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.disabled">Severity</Typography>
                <Chip size="small" label={selected.severity} color={SEVERITIES[selected.severity]} /></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.disabled">Status</Typography>
                <Chip size="small" label={selected.status} color={STATUSES[selected.status]} /></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.disabled">District</Typography>
                <Typography variant="body2">{selected.district || '—'}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.disabled">City</Typography>
                <Typography variant="body2">{selected.city || '—'}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.disabled">Technology</Typography>
                <Typography variant="body2">{selected.technology || '—'}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.disabled">MSISDN</Typography>
                <Typography variant="body2" fontFamily="monospace">{selected.subscriber_msisdn || '—'}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.disabled">Reported</Typography>
                <Typography variant="body2">{new Date(selected.reported_at).toLocaleString()}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.disabled">Resolved</Typography>
                <Typography variant="body2">{selected.resolved_at ? new Date(selected.resolved_at).toLocaleString() : '—'}</Typography></Grid>
            </Grid>
            {selected.resolution && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2"><strong>Resolution:</strong> {selected.resolution}</Typography>
              </Alert>
            )}
            {selected.lat && selected.lng && (
              <Typography variant="caption" color="text.disabled">
                Location: {selected.lat}, {selected.lng}
              </Typography>
            )}
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
