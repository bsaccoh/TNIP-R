import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Table, TableBody, TableCell, TableHead,
  TableRow, Chip, Stack, Alert, AlertTitle, LinearProgress,
  Popover, TextField, Button, IconButton, Tooltip, Divider, alpha,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import CellTowerIcon from '@mui/icons-material/CellTower';
import PodcastsIcon from '@mui/icons-material/Podcasts';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import UpdateIcon from '@mui/icons-material/Update';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import RouteIcon from '@mui/icons-material/Route';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ClearIcon from '@mui/icons-material/Clear';
import CheckIcon from '@mui/icons-material/Check';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, CartesianGrid, LabelList,
} from 'recharts';
import { get } from '../api/client';
import { KpiCard, Loading, EmptyState, StatusChip, Trend, fmt, useChartTip } from '../components/ui';
import { colorFor } from '../theme';

const TECH_COLORS = { '2G': '#888', '3G': '#3da9fc', '4G': '#2e9e5b', '5G': '#ef6c00' };
const TECH_ORDER  = ['2G', '3G', '4G', '5G'];

const opColor = colorFor;

const PRESETS = [
  { label: 'All',    days: null },
  { label: '7D',     days: 7    },
  { label: '30D',    days: 30   },
  { label: '90D',    days: 90   },
  { label: 'Custom', days: -1   },
];

function isoDate(d) { return d.toISOString().slice(0, 10); }

function presetDates(days) {
  if (!days || days < 0) return { from: '', to: '' };
  const to   = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: isoDate(from), to: isoDate(to) };
}

/* ── Per-card date filter ────────────────────────────────────────────────── */
function useDateFilter() {
  const [from,   setFrom]   = useState('');
  const [to,     setTo]     = useState('');
  const [preset, setPreset] = useState('All');

  const applyPreset = useCallback((p) => {
    setPreset(p.label);
    if (p.days !== -1) {
      const r = presetDates(p.days);
      setFrom(r.from);
      setTo(r.to);
    }
  }, []);

  const clear = useCallback(() => {
    setFrom(''); setTo(''); setPreset('All');
  }, []);

  const active = !!(from && to);
  const qs = active ? `?from=${from}&to=${to}` : '';

  return { from, to, setFrom, setTo, preset, applyPreset, clear, active, qs };
}

function DateFilterBtn({ filter, accentColor = '#3da9fc' }) {
  const [anchor, setAnchor] = useState(null);
  const [localFrom, setLocalFrom] = useState(filter.from);
  const [localTo,   setLocalTo]   = useState(filter.to);
  const [localPreset, setLocalPreset] = useState(filter.preset);

  // sync local when popover opens
  const open = (e) => {
    setLocalFrom(filter.from);
    setLocalTo(filter.to);
    setLocalPreset(filter.preset);
    setAnchor(e.currentTarget);
  };
  const close = () => setAnchor(null);

  const applyLocal = (p) => {
    setLocalPreset(p.label);
    if (p.days !== -1) {
      const r = presetDates(p.days);
      setLocalFrom(r.from);
      setLocalTo(r.to);
    }
  };

  const apply = () => {
    filter.setFrom(localFrom);
    filter.setTo(localTo);
    filter.applyPreset({ label: localPreset, days: -1 }); // just set preset label
    if (localPreset !== 'Custom') {
      // already synced via presetDates above
    }
    // Override from/to directly
    filter.setFrom(localFrom);
    filter.setTo(localTo);
    close();
  };

  const clearAll = () => {
    setLocalFrom(''); setLocalTo(''); setLocalPreset('All');
    filter.clear();
    close();
  };

  const isOpen = Boolean(anchor);
  const label = filter.active
    ? `${filter.from} → ${filter.to}`
    : 'All dates';

  return (
    <>
      <Tooltip title={`Date filter: ${label}`}>
        <IconButton size="small" onClick={open} sx={{
          color: filter.active ? accentColor : 'text.disabled',
          bgcolor: filter.active ? alpha(accentColor, 0.12) : 'transparent',
          border: `1px solid ${filter.active ? alpha(accentColor, 0.35) : 'transparent'}`,
          borderRadius: 1.5, p: '3px',
          '&:hover': { bgcolor: alpha(accentColor, 0.12) },
        }}>
          <CalendarMonthIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      <Popover open={isOpen} anchorEl={anchor} onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { p: 2, width: 280, borderRadius: 2 } }}>

        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Date Range</Typography>

        {/* Preset pills */}
        <Stack direction="row" spacing={0.75} mb={2} flexWrap="wrap">
          {PRESETS.map((p) => (
            <Chip key={p.label} label={p.label} size="small" clickable
              onClick={() => applyLocal(p)}
              sx={{
                fontWeight: 600, fontSize: 11,
                bgcolor: localPreset === p.label ? alpha(accentColor, 0.15) : 'action.hover',
                color: localPreset === p.label ? accentColor : 'text.secondary',
                border: `1px solid ${localPreset === p.label ? alpha(accentColor, 0.4) : 'transparent'}`,
              }} />
          ))}
        </Stack>

        {/* Date inputs — always visible */}
        <Stack spacing={1.5} mb={2}>
          <TextField size="small" type="date" label="From"
            InputLabelProps={{ shrink: true }}
            value={localFrom}
            onChange={(e) => { setLocalFrom(e.target.value); setLocalPreset('Custom'); }} />
          <TextField size="small" type="date" label="To"
            InputLabelProps={{ shrink: true }}
            value={localTo}
            onChange={(e) => { setLocalTo(e.target.value); setLocalPreset('Custom'); }} />
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button size="small" variant="contained" startIcon={<CheckIcon />}
            disabled={localPreset !== 'All' && (!localFrom || !localTo)}
            onClick={apply}
            sx={{ flex: 1, bgcolor: accentColor, '&:hover': { bgcolor: accentColor, filter: 'brightness(1.1)' } }}>
            Apply
          </Button>
          <Button size="small" variant="outlined" startIcon={<ClearIcon />}
            onClick={clearAll} sx={{ color: 'text.secondary', borderColor: 'divider' }}>
            Clear
          </Button>
        </Stack>
      </Popover>
    </>
  );
}

/* ── Card header with optional date filter ──────────────────────────────── */
function CardHeader({ title, filter, accentColor, children }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
      <Typography variant="h6" fontWeight={700}>{title}</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        {children}
        {filter && <DateFilterBtn filter={filter} accentColor={accentColor} />}
      </Stack>
    </Stack>
  );
}

/* ── Data fetching hook with date support ───────────────────────────────── */
function useDashboard(qs) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const prevQs = useRef(null);

  useEffect(() => {
    if (prevQs.current === qs && data) return; // no-op if qs unchanged
    prevQs.current = qs;
    setLoading(true);
    get(`/dashboards/national${qs}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [qs]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading };
}

function useDtSummary(qs) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    get(`/drive-tests/summary${qs}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [qs]);

  return { data, loading };
}

/* ── Pivot helpers ─────────────────────────────────────────────────────── */
function pivotBreakdown(breakdown) {
  const { sites = [], cells = [] } = breakdown || {};
  const present = new Set(cells.map((c) => c.tech_key).filter(Boolean));
  const techs = TECH_ORDER.filter((t) => present.has(t));

  const byOp = {};
  for (const c of cells) {
    if (!c.tech_key) continue;
    byOp[c.operator_name] ??= { operator: c.operator_name };
    byOp[c.operator_name][c.tech_key] = Number(c.cells) || 0;
  }
  const cellRows = Object.values(byOp).map((row) => ({
    ...row,
    total: techs.reduce((sum, t) => sum + (row[t] || 0), 0),
  }));
  const siteRows = sites.map((s) => ({ operator: s.operator_name, sites: Number(s.sites) || 0 }));
  return { cellRows, siteRows, techs };
}

function aggregateCompliance(rows = []) {
  const map = {};
  for (const r of rows) {
    if (!r.status) continue;
    map[r.operator_name] = map[r.operator_name] || { operator: r.operator_name, PASS: 0, WARNING: 0, FAIL: 0 };
    map[r.operator_name][r.status] = r.count;
  }
  return Object.values(map);
}

function generateInsights(d) {
  const tips = [];
  const comp = aggregateCompliance(d.complianceByOperator);
  for (const op of comp) {
    if (op.FAIL > 0)
      tips.push({ severity: 'error', title: `${op.operator} has ${op.FAIL} KPI failure(s)`, body: `${op.FAIL} out of ${op.PASS + op.WARNING + op.FAIL} KPIs failed compliance thresholds.` });
    else if (op.WARNING > 0)
      tips.push({ severity: 'warning', title: `${op.operator} has ${op.WARNING} KPI warning(s)`, body: `${op.WARNING} KPIs are approaching threshold limits.` });
  }
  if (d.ranking?.length > 1) {
    const best = d.ranking[0];
    tips.push({ severity: 'success', title: `${best.operator_name} leads QoS ranking`, body: `Score: ${fmt(best.qos_score, 1)} — highest among ${d.ranking.length} operators.` });
  }
  if (d.recentUploads?.length) {
    const hours = Math.round((Date.now() - new Date(d.recentUploads[0].upload_date).getTime()) / 3600000);
    if (hours > 48)
      tips.push({ severity: 'warning', title: 'Data may be stale', body: `Last PM upload was ${Math.floor(hours / 24)} days ago.` });
  }
  return tips;
}

/* ── Active date label for chip ─────────────────────────────────────────── */
function ActiveDateChip({ filter, color }) {
  if (!filter.active) return null;
  return (
    <Chip size="small" label={`${filter.from} → ${filter.to}`}
      onDelete={filter.clear}
      sx={{ height: 20, fontSize: 10, fontWeight: 600,
        bgcolor: alpha(color, 0.12), color,
        '& .MuiChip-deleteIcon': { fontSize: 14, color: alpha(color, 0.6) } }} />
  );
}

/* ── Loading overlay for a card section ─────────────────────────────────── */
function CardLoading() {
  return <LinearProgress sx={{ borderRadius: 1, mt: 0.5, mb: 1 }} />;
}

/* ── Main Dashboard ─────────────────────────────────────────────────────── */
export default function Dashboard() {
  const tip = useChartTip();

  // Static data (no date filter — inventory counts, tech dist, footprint)
  const [staticD,   setStaticD]   = useState(null);
  const [footprint, setFootprint] = useState(null);
  const [staticErr, setStaticErr] = useState(false);

  useEffect(() => {
    get('/dashboards/national').then((r) => setStaticD(r.data)).catch(() => setStaticErr(true));
    get('/inventory/breakdown').then((r) => setFootprint(r.data)).catch(() => {});
  }, []);

  // Per-widget date filters
  const availFilter      = useDateFilter();
  const complianceFilter = useDateFilter();
  const rankingFilter    = useDateFilter();
  const uploadsFilter    = useDateFilter();
  const recsFilter       = useDateFilter();
  const dtFilter         = useDateFilter();

  // Independent fetches per widget
  const availData    = useDashboard(availFilter.qs);
  const compData     = useDashboard(complianceFilter.qs);
  const rankData     = useDashboard(rankingFilter.qs);
  const uploadsData  = useDashboard(uploadsFilter.qs);
  const recsData     = useDashboard(recsFilter.qs);
  const dtData       = useDtSummary(dtFilter.qs);

  if (staticErr) return <EmptyState message="Could not load dashboard." />;
  if (!staticD)  return <Loading height={400} />;

  const compBars   = aggregateCompliance(compData.data?.complianceByOperator ?? staticD.complianceByOperator);
  const techData   = (staticD.techDistribution || []).map((t) => ({ name: t.tech_key, value: t.cells }));
  const { cellRows, siteRows, techs } = pivotBreakdown(footprint);
  const hasFootprint = cellRows.some((r) => r.total > 0) || siteRows.some((r) => r.sites > 0);

  const ranking      = rankData.data?.ranking      ?? staticD.ranking;
  const uploads      = uploadsData.data?.recentUploads ?? staticD.recentUploads;
  const recs         = recsData.data?.recommendations ?? staticD.recommendations;
  const availability = availData.data?.nationalAvailability ?? staticD.nationalAvailability;
  const dtSummary    = dtData.data ?? null;
  const initialDt    = staticD; // for initial dt load without date filter we use staticD's drive test data separately

  return (
    <Box>
      <Grid container spacing={2}>

        {/* ── KPI cards ── */}
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Licensed Operators" value={staticD.counts?.operators} icon={<BusinessIcon color="primary" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Total Sites" value={staticD.counts?.sites?.toLocaleString()} icon={<CellTowerIcon color="primary" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Total Cells" value={staticD.counts?.cells?.toLocaleString()} icon={<PodcastsIcon color="primary" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {/* National Availability — date-filterable */}
          <Card sx={{ border: availFilter.active ? `1px solid ${alpha('#2e9e5b', 0.4)}` : '1px solid transparent', transition: 'border 0.2s' }}>
            <CardContent sx={{ position: 'relative' }}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">National Availability</Typography>
                  {availData.loading && availFilter.active
                    ? <CardLoading />
                    : <Typography variant="h4" fontWeight={800} color="success.main">{fmt(availability)}%</Typography>
                  }
                  <ActiveDateChip filter={availFilter} color="#2e9e5b" />
                </Box>
                <Stack alignItems="center" spacing={0.5}>
                  <SignalCellularAltIcon color="success" />
                  <DateFilterBtn filter={availFilter} accentColor="#2e9e5b" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Operator Ranking ── */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <CardHeader title="Operator Ranking" filter={rankingFilter} accentColor="#3da9fc">
                <ActiveDateChip filter={rankingFilter} color="#3da9fc" />
              </CardHeader>
              {rankData.loading && rankingFilter.active && <CardLoading />}
              {!ranking?.length
                ? <EmptyState message="No rankings yet." hint="Run POST /rankings/compute after ingesting data." />
                : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Operator</TableCell>
                        <TableCell align="right">QoS</TableCell>
                        <TableCell align="center">Trend</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ranking.map((r) => (
                        <TableRow key={r.operator_name}>
                          <TableCell>{r.rank_position}</TableCell>
                          <TableCell>
                            <Chip size="small" label={r.operator_name} sx={{ bgcolor: colorFor(r.operator_name) + '33' }} />
                          </TableCell>
                          <TableCell align="right">{fmt(r.qos_score, 1)}</TableCell>
                          <TableCell align="center"><Trend trend={r.trend} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Compliance by Operator ── */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <CardHeader title="Compliance by Operator" filter={complianceFilter} accentColor="#e6a700">
                <ActiveDateChip filter={complianceFilter} color="#e6a700" />
              </CardHeader>
              {compData.loading && complianceFilter.active && <CardLoading />}
              {!compBars.length
                ? <EmptyState message="No compliance results yet." />
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={compBars}>
                      <XAxis dataKey="operator" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <RTooltip contentStyle={tip} />
                      <Legend />
                      <Bar dataKey="PASS"    stackId="a" fill="#2e9e5b" />
                      <Bar dataKey="WARNING" stackId="a" fill="#e6a700" />
                      <Bar dataKey="FAIL"    stackId="a" fill="#e0413b" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Cells by Technology ── */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <CardHeader title="Cells by Technology" />
              {!techData.length
                ? <EmptyState message="No inventory yet." />
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={techData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} label>
                        {techData.map((t) => <Cell key={t.name} fill={TECH_COLORS[t.name] || '#888'} />)}
                      </Pie>
                      <RTooltip contentStyle={tip} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Network Footprint ── */}
        {hasFootprint && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <CardHeader title="Network Footprint by Operator" />
                <Grid container spacing={3}>
                  <Grid item xs={12} md={7}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Cells by Operator &amp; Technology</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={cellRows} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis dataKey="operator" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <RTooltip contentStyle={tip} />
                        <Legend />
                        {techs.map((t, i) => (
                          <Bar key={t} dataKey={t} stackId="cells" fill={TECH_COLORS[t] || '#888'}
                            name={t} radius={i === techs.length - 1 ? [4, 4, 0, 0] : 0} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Total Sites by Operator</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={siteRows} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis dataKey="operator" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <RTooltip contentStyle={tip} />
                        <Bar dataKey="sites" name="Sites" radius={[4, 4, 0, 0]}>
                          {siteRows.map((r) => <Cell key={r.operator} fill={colorFor(r.operator)} />)}
                          <LabelList dataKey="sites" position="top" style={{ fontSize: 11 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* ── Recent PM Uploads ── */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <CardHeader title="Recent PM Uploads" filter={uploadsFilter} accentColor="#3da9fc">
                <ActiveDateChip filter={uploadsFilter} color="#3da9fc" />
              </CardHeader>
              {uploadsData.loading && uploadsFilter.active && <CardLoading />}
              {!uploads?.length
                ? <EmptyState message="No uploads yet." hint="Go to Data Ingestion to upload a PM file." />
                : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Operator</TableCell>
                        <TableCell>File</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>When</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {uploads.map((u) => (
                        <TableRow key={u.pm_file_id}>
                          <TableCell>{u.operator_name}</TableCell>
                          <TableCell sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.file_name}</TableCell>
                          <TableCell><Chip size="small" label={u.status} /></TableCell>
                          <TableCell>{new Date(u.upload_date).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── AI Recommendations ── */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <CardHeader title="AI Recommendations" filter={recsFilter} accentColor="#e6a700">
                <TipsAndUpdatesIcon color="warning" sx={{ fontSize: 20 }} />
                <ActiveDateChip filter={recsFilter} color="#e6a700" />
              </CardHeader>
              {recsData.loading && recsFilter.active && <CardLoading />}
              {(() => {
                const base = recsData.data ?? staticD;
                const tips = base.recommendations?.length ? base.recommendations : generateInsights(base);
                return tips.length
                  ? (
                    <Stack spacing={1}>
                      {tips.map((r, i) => (
                        <Alert key={i} severity={r.severity || 'info'} variant="outlined"
                          sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                          <AlertTitle sx={{ fontSize: 13, mb: 0.25 }}>{r.title}</AlertTitle>
                          <Typography variant="caption">{r.body}</Typography>
                        </Alert>
                      ))}
                    </Stack>
                  )
                  : <EmptyState message="No recommendations yet." />;
              })()}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Drive Test Summary ── */}
        {(() => {
          const dt = dtSummary ?? (staticD._dtSummary ?? null);
          // The main /national endpoint doesn't include drive test data; we load it separately
          return null;
        })()}

        <DriveTestSection filter={dtFilter} tip={tip} opColor={opColor} />

        {/* ── Data freshness ── */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <UpdateIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Last data update: {staticD.recentUploads?.[0]
                    ? new Date(staticD.recentUploads[0].upload_date).toLocaleString()
                    : 'No uploads yet'}
                  {staticD.recentUploads?.[0] && (() => {
                    const hours = Math.round((Date.now() - new Date(staticD.recentUploads[0].upload_date).getTime()) / 3600000);
                    return hours > 24
                      ? ` (${Math.floor(hours / 24)}d ${hours % 24}h ago — data may be stale)`
                      : ` (${hours}h ago)`;
                  })()}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
}

/* ── Drive Test section (own date state) ─────────────────────────────────── */
function DriveTestSection({ filter, tip, opColor }) {
  const { data: dtSummary, loading } = useDtSummary(filter.qs);

  if (!dtSummary?.perOperator?.length && !loading) return null;

  return (
    <>
      <Grid item xs={12}>
        <Stack direction="row" spacing={1.5} alignItems="center" mt={1}>
          <RouteIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>Drive Test Summary</Typography>
          {dtSummary?.overall && (
            <Chip size="small"
              label={`${dtSummary.overall.total_tests} tests · ${dtSummary.overall.total_distance_km} km`}
              variant="outlined" />
          )}
          <Box sx={{ ml: 'auto' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ActiveDateChip filter={filter} color="#9c27b0" />
              <DateFilterBtn filter={filter} accentColor="#9c27b0" />
            </Stack>
          </Box>
        </Stack>
        {loading && filter.active && <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />}
      </Grid>

      {dtSummary?.perOperator?.length > 0 && (
        <>
          {/* RSRP bar chart */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom fontWeight={700}>Avg RSRP by Operator</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dtSummary.perOperator} layout="vertical">
                    <XAxis type="number" domain={[-120, -60]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="operator_name" tick={{ fontSize: 11 }} width={80} />
                    <RTooltip contentStyle={tip} formatter={(v) => [`${v} dBm`, 'Avg RSRP']} />
                    <Bar dataKey="avg_rsrp" radius={[0, 4, 4, 0]}>
                      {dtSummary.perOperator.map((o, i) => (
                        <Cell key={i} fill={opColor(o.operator_name, i)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* QoS Radar */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom fontWeight={700}>Operator QoS Radar</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={(() => {
                    const ops = dtSummary.perOperator;
                    const maxDl = Math.max(...ops.map(o => Number(o.avg_dl) || 1));
                    return [
                      { metric: 'RSRP',       ...Object.fromEntries(ops.map(o => [o.operator_name, Math.max(0, 120 + Number(o.avg_rsrp))])) },
                      { metric: 'Compliance',  ...Object.fromEntries(ops.map(o => [o.operator_name, Number(o.rsrp_compliance) || 0])) },
                      { metric: 'SINR',        ...Object.fromEntries(ops.map(o => [o.operator_name, Math.max(0, (Number(o.avg_sinr) + 5) * 4)])) },
                      { metric: 'Throughput',  ...Object.fromEntries(ops.map(o => [o.operator_name, Math.round((Number(o.avg_dl) || 0) / maxDl * 100)])) },
                      { metric: 'Coverage',    ...Object.fromEntries(ops.map(o => [o.operator_name, Number(o.rsrp_compliance) || 0])) },
                    ];
                  })()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis tick={false} domain={[0, 100]} />
                    {dtSummary.perOperator.map((o, i) => (
                      <Radar key={o.operator_name} name={o.operator_name} dataKey={o.operator_name}
                        stroke={opColor(o.operator_name, i)} fill={opColor(o.operator_name, i)} fillOpacity={0.15} />
                    ))}
                    <RTooltip contentStyle={tip} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Stats table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom fontWeight={700}>Drive Test Operator Summary</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Operator</TableCell>
                      <TableCell align="right">Tests</TableCell>
                      <TableCell align="right">Samples</TableCell>
                      <TableCell align="right">Distance</TableCell>
                      <TableCell align="right">Avg RSRP</TableCell>
                      <TableCell align="right">Avg SINR</TableCell>
                      <TableCell align="right">Avg DL</TableCell>
                      <TableCell align="right">RSRP Compliance</TableCell>
                      <TableCell align="right">Call Drops</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dtSummary.perOperator.map((o, i) => (
                      <TableRow key={o.operator_name}>
                        <TableCell>
                          <Chip size="small" label={o.operator_name}
                            sx={{ bgcolor: opColor(o.operator_name, i) + '33', height: 22, fontSize: 11 }} />
                        </TableCell>
                        <TableCell align="right">{o.test_count}</TableCell>
                        <TableCell align="right">{Number(o.total_samples).toLocaleString()}</TableCell>
                        <TableCell align="right">{o.total_distance_km} km</TableCell>
                        <TableCell align="right"
                          sx={{ color: Number(o.avg_rsrp) >= -90 ? '#2e9e5b' : Number(o.avg_rsrp) >= -100 ? '#e6a700' : '#e0413b', fontWeight: 700 }}>
                          {o.avg_rsrp} dBm
                        </TableCell>
                        <TableCell align="right">{o.avg_sinr} dB</TableCell>
                        <TableCell align="right">{o.avg_dl ? `${Math.round(o.avg_dl)} kbps` : '—'}</TableCell>
                        <TableCell align="right">
                          <Chip size="small" sx={{ height: 20, fontSize: 10 }}
                            color={Number(o.rsrp_compliance) >= 95 ? 'success' : Number(o.rsrp_compliance) >= 80 ? 'warning' : 'error'}
                            label={`${o.rsrp_compliance}%`} />
                        </TableCell>
                        <TableCell align="right">{o.call_drops || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}
    </>
  );
}
