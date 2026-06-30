import { useEffect, useState } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Table, TableBody, TableCell, TableHead,
  TableRow, Chip, Stack, Alert, AlertTitle, LinearProgress,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import CellTowerIcon from '@mui/icons-material/CellTower';
import PodcastsIcon from '@mui/icons-material/Podcasts';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import UpdateIcon from '@mui/icons-material/Update';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import RouteIcon from '@mui/icons-material/Route';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { get } from '../api/client';
import { KpiCard, Loading, EmptyState, StatusChip, Trend, fmt, useChartTip } from '../components/ui';
import { colorFor } from '../theme';

const TECH_COLORS = { '2G': '#888', '3G': '#3da9fc', '4G': '#2e9e5b', '5G': '#ef6c00' };

const OP_COLORS = ['#3da9fc', '#ef6c00', '#2e9e5b', '#e0413b', '#8b5cf6', '#e6a700'];

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [dtSummary, setDtSummary] = useState(null);
  const [err, setErr] = useState(false);
  const tip = useChartTip();

  useEffect(() => {
    get('/dashboards/national').then((r) => setD(r.data)).catch(() => setErr(true));
    get('/drive-tests/summary').then((r) => setDtSummary(r.data)).catch(() => {});
  }, []);

  if (err) return <EmptyState message="Could not load dashboard." />;
  if (!d) return <Loading height={400} />;

  const compBars = aggregateCompliance(d.complianceByOperator);
  const techData = (d.techDistribution || []).map((t) => ({ name: t.tech_key, value: t.cells }));

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Licensed Operators" value={d.counts?.operators} icon={<BusinessIcon color="primary" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Total Sites" value={d.counts?.sites?.toLocaleString()} icon={<CellTowerIcon color="primary" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Total Cells" value={d.counts?.cells?.toLocaleString()} icon={<PodcastsIcon color="primary" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="National Availability" value={fmt(d.nationalAvailability)} unit="%"
            color="success.main" icon={<SignalCellularAltIcon color="success" />} />
        </Grid>

        {/* Ranking */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Operator Ranking</Typography>
              {!d.ranking?.length ? <EmptyState message="No rankings yet." hint="Run POST /rankings/compute after ingesting data." /> : (
                <Table size="small">
                  <TableHead>
                    <TableRow><TableCell>#</TableCell><TableCell>Operator</TableCell><TableCell align="right">QoS</TableCell><TableCell align="center">Trend</TableCell></TableRow>
                  </TableHead>
                  <TableBody>
                    {d.ranking.map((r) => (
                      <TableRow key={r.operator_name}>
                        <TableCell>{r.rank_position}</TableCell>
                        <TableCell><Chip size="small" label={r.operator_name} sx={{ bgcolor: colorFor(r.operator_name) + '33' }} /></TableCell>
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

        {/* Compliance summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Compliance by Operator</Typography>
              {!compBars.length ? <EmptyState message="No compliance results yet." /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={compBars}>
                    <XAxis dataKey="operator" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tip} />
                    <Legend />
                    <Bar dataKey="PASS" stackId="a" fill="#2e9e5b" />
                    <Bar dataKey="WARNING" stackId="a" fill="#e6a700" />
                    <Bar dataKey="FAIL" stackId="a" fill="#e0413b" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Tech distribution */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Cells by Technology</Typography>
              {!techData.length ? <EmptyState message="No inventory yet." /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={techData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} label>
                      {techData.map((t) => <Cell key={t.name} fill={TECH_COLORS[t.name] || '#888'} />)}
                    </Pie>
                    <Tooltip contentStyle={tip} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent uploads */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent PM Uploads</Typography>
              {!d.recentUploads?.length ? <EmptyState message="No uploads yet." hint="Go to Data Ingestion to upload a PM file." /> : (
                <Table size="small">
                  <TableHead><TableRow><TableCell>Operator</TableCell><TableCell>File</TableCell><TableCell>Status</TableCell><TableCell>When</TableCell></TableRow></TableHead>
                  <TableBody>
                    {d.recentUploads.map((u) => (
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

        {/* AI recommendations */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                <TipsAndUpdatesIcon color="warning" sx={{ fontSize: 20 }} />
                <Typography variant="h6">AI Recommendations</Typography>
              </Stack>
              {(() => {
                const tips = d.recommendations?.length ? d.recommendations : generateInsights(d);
                return tips.length ? (
                  <Stack spacing={1}>
                    {tips.map((r, i) => (
                      <Alert key={i} severity={r.severity || 'info'} variant="outlined"
                        sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                        <AlertTitle sx={{ fontSize: 13, mb: 0.25 }}>{r.title}</AlertTitle>
                        <Typography variant="caption">{r.body}</Typography>
                      </Alert>
                    ))}
                  </Stack>
                ) : <EmptyState message="No recommendations yet." />;
              })()}
            </CardContent>
          </Card>
        </Grid>

        {/* Drive Test Summary */}
        {dtSummary && dtSummary.perOperator?.length > 0 && (
          <>
            <Grid item xs={12}>
              <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                <RouteIcon color="primary" />
                <Typography variant="h6">Drive Test Summary</Typography>
                <Chip size="small" label={`${dtSummary.overall?.total_tests} tests · ${dtSummary.overall?.total_distance_km} km`}
                  variant="outlined" sx={{ ml: 1 }} />
              </Stack>
            </Grid>

            {/* Operator RSRP comparison bar chart */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>Avg RSRP by Operator</Typography>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dtSummary.perOperator} layout="vertical">
                      <XAxis type="number" domain={[-120, -60]} tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${v}`} />
                      <YAxis type="category" dataKey="operator_name" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip contentStyle={tip}
                        formatter={(v) => [`${v} dBm`, 'Avg RSRP']} />
                      <Bar dataKey="avg_rsrp" radius={[0, 4, 4, 0]}>
                        {dtSummary.perOperator.map((_, i) => (
                          <Cell key={i} fill={OP_COLORS[i % OP_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Radar chart — operator comparison */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>Operator QoS Radar</Typography>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={(() => {
                      const ops = dtSummary.perOperator;
                      const maxDl = Math.max(...ops.map(o => Number(o.avg_dl) || 1));
                      return [
                        { metric: 'RSRP', ...Object.fromEntries(ops.map(o => [o.operator_name, Math.max(0, 120 + Number(o.avg_rsrp))])) },
                        { metric: 'Compliance', ...Object.fromEntries(ops.map(o => [o.operator_name, Number(o.rsrp_compliance) || 0])) },
                        { metric: 'SINR', ...Object.fromEntries(ops.map(o => [o.operator_name, Math.max(0, (Number(o.avg_sinr) + 5) * 4)])) },
                        { metric: 'Throughput', ...Object.fromEntries(ops.map(o => [o.operator_name, Math.round((Number(o.avg_dl) || 0) / maxDl * 100)])) },
                        { metric: 'Coverage', ...Object.fromEntries(ops.map(o => [o.operator_name, Number(o.rsrp_compliance) || 0])) },
                      ];
                    })()}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis tick={false} domain={[0, 100]} />
                      {dtSummary.perOperator.map((o, i) => (
                        <Radar key={o.operator_name} name={o.operator_name} dataKey={o.operator_name}
                          stroke={OP_COLORS[i % OP_COLORS.length]}
                          fill={OP_COLORS[i % OP_COLORS.length]} fillOpacity={0.15} />
                      ))}
                      <Tooltip contentStyle={tip} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Drive test stats table */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>Drive Test Operator Summary</Typography>
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
                          <TableCell><Chip size="small" label={o.operator_name}
                            sx={{ bgcolor: OP_COLORS[i % OP_COLORS.length] + '33', height: 22, fontSize: 11 }} /></TableCell>
                          <TableCell align="right">{o.test_count}</TableCell>
                          <TableCell align="right">{Number(o.total_samples).toLocaleString()}</TableCell>
                          <TableCell align="right">{o.total_distance_km} km</TableCell>
                          <TableCell align="right" sx={{ color: Number(o.avg_rsrp) >= -90 ? '#2e9e5b' : Number(o.avg_rsrp) >= -100 ? '#e6a700' : '#e0413b', fontWeight: 700 }}>
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

        {/* Data freshness */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <UpdateIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Last data update: {d.recentUploads?.[0]
                    ? new Date(d.recentUploads[0].upload_date).toLocaleString()
                    : 'No uploads yet'}
                  {d.recentUploads?.[0] && (() => {
                    const hours = Math.round((Date.now() - new Date(d.recentUploads[0].upload_date).getTime()) / 3600000);
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

function generateInsights(d) {
  const tips = [];
  const comp = aggregateCompliance(d.complianceByOperator);
  for (const op of comp) {
    if (op.FAIL > 0) tips.push({ severity: 'error', title: `${op.operator} has ${op.FAIL} KPI failure(s)`, body: `${op.FAIL} out of ${op.PASS + op.WARNING + op.FAIL} KPIs failed compliance thresholds. Investigate and take corrective action.` });
    else if (op.WARNING > 0) tips.push({ severity: 'warning', title: `${op.operator} has ${op.WARNING} KPI warning(s)`, body: `${op.WARNING} KPIs are approaching threshold limits. Monitor closely to prevent failures.` });
  }
  if (d.ranking?.length > 1) {
    const best = d.ranking[0];
    tips.push({ severity: 'success', title: `${best.operator_name} leads QoS ranking`, body: `Score: ${fmt(best.qos_score, 1)} — highest among ${d.ranking.length} operators.` });
  }
  if (d.recentUploads?.length) {
    const hours = Math.round((Date.now() - new Date(d.recentUploads[0].upload_date).getTime()) / 3600000);
    if (hours > 48) tips.push({ severity: 'warning', title: 'Data may be stale', body: `Last PM upload was ${Math.floor(hours / 24)} days ago. Ensure operators are submitting data on schedule.` });
  }
  return tips;
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
