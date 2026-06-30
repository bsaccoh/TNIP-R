import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, Alert, LinearProgress, Grid,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VerifiedIcon from '@mui/icons-material/Verified';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { get } from '../api/client';
import { Loading } from '../components/ui';

function StatCard({ label, value, icon, color }) {
  return (
    <Card>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h4" fontWeight={700} color={`${color}.main`}>{value}</Typography>
          </Box>
          <Box sx={{ color: `${color}.main`, opacity: 0.7 }}>{icon}</Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function QualityBar({ value }) {
  const color = value >= 95 ? 'success' : value >= 80 ? 'warning' : 'error';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1 }}>
        <LinearProgress variant="determinate" value={Math.min(value || 0, 100)}
          color={color} sx={{ height: 8, borderRadius: 4 }} />
      </Box>
      <Typography variant="caption" fontWeight={600} color={`${color}.main`} sx={{ minWidth: 42 }}>
        {value != null ? `${value}%` : '—'}
      </Typography>
    </Box>
  );
}

export default function DataQuality() {
  const [data, setData] = useState(null);

  useEffect(() => {
    get('/dashboards/data-quality').then((r) => setData(r.data)).catch(() => setData({ byOperator: [], recent: [], gaps: [] }));
  }, []);

  if (!data) return <Loading />;

  const { byOperator = [], recent = [], gaps = [] } = data;

  const totalJobs = byOperator.reduce((s, o) => s + (Number(o.total_jobs) || 0), 0);
  const totalDone = byOperator.reduce((s, o) => s + (Number(o.done) || 0), 0);
  const totalFailed = byOperator.reduce((s, o) => s + (Number(o.failed) || 0), 0);
  const overallRate = totalJobs ? Math.round((totalDone / totalJobs) * 100 * 10) / 10 : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <VerifiedIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>Data Quality</Typography>
      </Stack>

      {gaps.length > 0 && (
        <Alert severity="warning" icon={<WarningAmberIcon />}>
          <strong>{gaps.length} operator{gaps.length > 1 ? 's' : ''} with no ingestion in 7+ days:</strong>{' '}
          {gaps.map((g) => `${g.operator_name} (${g.days_silent ?? '∞'}d silent)`).join(' · ')}
        </Alert>
      )}

      {/* Summary cards */}
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <StatCard label="Overall Success Rate" value={`${overallRate}%`} icon={<CheckCircleIcon sx={{ fontSize: 40 }} />} color="success" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Total Jobs" value={totalJobs.toLocaleString()} icon={<VerifiedIcon sx={{ fontSize: 40 }} />} color="primary" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Succeeded" value={totalDone.toLocaleString()} icon={<CheckCircleIcon sx={{ fontSize: 40 }} />} color="success" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Failed" value={totalFailed.toLocaleString()} icon={<ErrorIcon sx={{ fontSize: 40 }} />} color="error" />
        </Grid>
      </Grid>

      {/* 30-day trend */}
      {recent.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Ingestion Trend — Last 30 Days</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={recent.map((r) => ({
                day: r.day?.slice(5), done: Number(r.done), failed: Number(r.failed),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="done" stackId="1" stroke="#4caf50" fill="#4caf50" fillOpacity={0.4} name="Done" />
                <Area type="monotone" dataKey="failed" stackId="1" stroke="#f44336" fill="#f44336" fillOpacity={0.4} name="Failed" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per-operator breakdown */}
      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>Per-Operator Ingestion Quality</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Operator</TableCell>
                <TableCell>Total Jobs</TableCell>
                <TableCell>Done</TableCell>
                <TableCell>Failed</TableCell>
                <TableCell>Duplicate</TableCell>
                <TableCell>Success Rate</TableCell>
                <TableCell>Last Ingestion</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {byOperator.map((o) => (
                <TableRow key={o.operator_id} hover>
                  <TableCell><Typography variant="body2" fontWeight={600}>{o.operator_name}</Typography></TableCell>
                  <TableCell>{Number(o.total_jobs).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip size="small" label={Number(o.done).toLocaleString()} color="success" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {Number(o.failed) > 0
                      ? <Chip size="small" label={Number(o.failed).toLocaleString()} color="error" variant="outlined" />
                      : <Typography variant="caption" color="text.secondary">0</Typography>}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{Number(o.duplicate).toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 160 }}>
                    <QualityBar value={o.total_jobs > 0 ? parseFloat(o.success_rate) : null} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {o.last_ingestion ? new Date(o.last_ingestion).toLocaleString() : <span style={{ color: 'red' }}>Never</span>}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
