import { useEffect, useState, useMemo } from 'react';
import {
  Card, CardContent, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  Box, Grid, Chip, Stack, Button, LinearProgress, Divider, Avatar, alpha, TablePagination,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Cell,
} from 'recharts';
import { get, post } from '../api/client';
import { Loading, EmptyState, StatusChip, fmt, useChartTip } from '../components/ui';
import { colorFor } from '../theme';
import { exportCsv } from '../utils/csv';

const STATUS_BG = {
  PASS: (t) => alpha(t.palette.success.main, 0.08),
  WARNING: (t) => alpha(t.palette.warning.main, 0.08),
  FAIL: (t) => alpha(t.palette.error.main, 0.08),
};

const STATUS_BORDER = {
  PASS: (t) => t.palette.success.main,
  WARNING: (t) => t.palette.warning.main,
  FAIL: (t) => t.palette.error.main,
};

function ComplianceGauge({ value, color, label }) {
  const clamp = Math.min(100, Math.max(0, Number(value) || 0));
  const gaugeColor = clamp >= 90 ? '#2e9e5b' : clamp >= 70 ? '#e6a700' : '#e0413b';
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', width: 72, height: 72 }}>
        <svg viewBox="0 0 72 72" style={{ width: 72, height: 72, transform: 'rotate(-90deg)' }}>
          <circle cx="36" cy="36" r="30" fill="none" stroke="currentColor" strokeWidth="6"
            style={{ color: 'rgba(128,128,128,0.15)' }} />
          <circle cx="36" cy="36" r="30" fill="none" stroke={gaugeColor} strokeWidth="6"
            strokeDasharray={`${clamp * 1.885} 188.5`} strokeLinecap="round" />
        </svg>
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" fontWeight={700} fontSize={15}>{Math.round(clamp)}%</Typography>
        </Box>
      </Box>
      <Chip label={label} size="small" sx={{ mt: 0.5, bgcolor: color + '33', fontSize: 11, height: 22 }} />
    </Box>
  );
}

export default function Compliance() {
  const [rows, setRows] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [ops, setOps] = useState([]);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const tip = useChartTip();

  const load = () => {
    get('/compliance/matrix').then((r) => setRows(r.data)).catch(() => setRows([]));
    get('/compliance/alerts').then((r) => setAlerts(r.data)).catch(() => {});
  };
  useEffect(() => { load(); get('/operators').then((r) => setOps(r.data)).catch(() => {}); }, []);

  const evaluateAll = async () => {
    setBusy(true);
    try {
      for (const o of ops) await post('/compliance/evaluate', { operator_id: o.operator_id });
      load();
    } finally { setBusy(false); }
  };

  const operators = useMemo(() => rows ? [...new Set(rows.map((r) => r.operator_name))] : [], [rows]);
  const kpis = useMemo(() => rows ? [...new Set(rows.map((r) => r.kpi_key))] : [], [rows]);
  const cell = (op, kpi) => rows?.find((r) => r.operator_name === op && r.kpi_key === kpi);

  const operatorScores = useMemo(() => {
    if (!rows?.length) return [];
    return operators.map((op) => {
      const opRows = rows.filter((r) => r.operator_name === op);
      const pass = opRows.filter((r) => r.status === 'PASS').length;
      const warn = opRows.filter((r) => r.status === 'WARNING').length;
      const fail = opRows.filter((r) => r.status === 'FAIL').length;
      const total = opRows.length || 1;
      return { operator: op, pass, warn, fail, total, rate: (pass / total) * 100 };
    });
  }, [rows, operators]);

  const chartData = useMemo(() =>
    operatorScores.map((o) => ({
      name: o.operator, Pass: o.pass, Warning: o.warn, Fail: o.fail,
    })), [operatorScores]);

  const violations = useMemo(() => alerts.filter((a) => a.severity === 'VIOLATION'), [alerts]);
  const warnings = useMemo(() => alerts.filter((a) => a.severity !== 'VIOLATION'), [alerts]);

  const totalViolations = violations.length;
  const totalWarnings = warnings.length;

  const handleExport = () => {
    if (!rows?.length) return;
    const csvRows = [];
    for (const k of kpis) {
      for (const op of operators) {
        const c = cell(op, k);
        if (c) csvRows.push({ kpi_key: k, kpi_name: c.kpi_name || k, operator: op, value: c.value, required: c.required_value, status: c.status });
      }
    }
    exportCsv('compliance_matrix.csv', [
      { key: 'kpi_key', label: 'KPI Key' },
      { key: 'kpi_name', label: 'KPI Name' },
      { key: 'operator', label: 'Operator' },
      { key: 'value', label: 'Value' },
      { key: 'required', label: 'Required' },
      { key: 'status', label: 'Status' },
    ], csvRows);
  };

  if (!rows) return <Loading />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <VerifiedIcon color="primary" sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Compliance Matrix</Typography>
            <Typography variant="body2" color="text.secondary">Operators × KPI Regulatory Thresholds</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          {rows.length > 0 && (
            <>
              <Chip size="small" label={`${kpis.length} KPIs`} variant="outlined" />
              <Chip size="small" label={`${operators.length} Operators`} variant="outlined" />
              {totalViolations > 0 && <Chip size="small" color="error" label={`${totalViolations} Violations`} />}
              {totalWarnings > 0 && <Chip size="small" color="warning" label={`${totalWarnings} Warnings`} />}
            </>
          )}
          <Button size="small" startIcon={<DownloadIcon />} onClick={handleExport} disabled={!rows.length}>
            Export
          </Button>
          <Button startIcon={<RefreshIcon />} variant="contained" onClick={evaluateAll} disabled={busy || !ops.length}>
            {busy ? 'Evaluating…' : 'Re-evaluate'}
          </Button>
        </Stack>
      </Stack>

      {!rows.length ? (
        <EmptyState message="No compliance results yet." hint="Upload a PM file, then click Re-evaluate compliance." />
      ) : (
        <>
          {/* Operator Scorecards */}
          <Grid container spacing={2}>
            {operatorScores.map((o) => (
              <Grid item xs={6} sm={3} key={o.operator}>
                <Card sx={{ textAlign: 'center', py: 1 }}>
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1.5 } }}>
                    <ComplianceGauge value={o.rate} color={colorFor(o.operator)} label={o.operator} />
                    <Stack direction="row" justifyContent="center" spacing={1.5} mt={1}>
                      <Typography variant="caption" color="success.main" fontWeight={600}>{o.pass}P</Typography>
                      <Typography variant="caption" color="warning.main" fontWeight={600}>{o.warn}W</Typography>
                      <Typography variant="caption" color="error.main" fontWeight={600}>{o.fail}F</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2}>
            {/* Compliance Matrix Table */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent sx={{ overflowX: 'auto' }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={1.5}>Detailed Compliance Matrix</Typography>
                  <Table size="small" sx={{ '& .MuiTableCell-head': { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1, minWidth: 180 }}>KPI</TableCell>
                        {operators.map((op) => (
                          <TableCell key={op} align="center" sx={{ minWidth: 120 }}>
                            <Chip size="small" label={op}
                              sx={{ bgcolor: colorFor(op) + '33', fontWeight: 600, fontSize: 11 }} />
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {kpis.slice(page * 10, page * 10 + 10).map((k, idx) => (
                        <TableRow key={k} sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover' }}>
                          <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1, fontWeight: 500 }}>
                            {rows.find((r) => r.kpi_key === k)?.kpi_name || k}
                          </TableCell>
                          {operators.map((op) => {
                            const c = cell(op, k);
                            if (!c) return <TableCell key={op} align="center"><Typography variant="caption" color="text.disabled">—</Typography></TableCell>;
                            const pct = c.required_value ? Math.min(100, (Number(c.value) / Number(c.required_value)) * 100) : 0;
                            return (
                              <TableCell key={op} align="center" sx={(t) => ({
                                bgcolor: STATUS_BG[c.status]?.(t) || 'transparent',
                                borderLeft: `3px solid`,
                                borderLeftColor: STATUS_BORDER[c.status]?.(t) || 'transparent',
                              })}>
                                <Typography variant="body2" fontWeight={600} fontSize={13}>
                                  {fmt(c.value)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block" fontSize={10}>
                                  / {fmt(c.required_value)}
                                </Typography>
                                <LinearProgress variant="determinate" value={pct}
                                  color={c.status === 'PASS' ? 'success' : c.status === 'WARNING' ? 'warning' : 'error'}
                                  sx={{ height: 3, borderRadius: 2, mt: 0.3 }} />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination component="div" count={kpis.length} page={page} rowsPerPage={10}
                    rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />
                </CardContent>
              </Card>
            </Grid>

            {/* Right Panel: Chart + Alerts */}
            <Grid item xs={12} lg={4}>
              <Stack spacing={2}>
                {/* Stacked bar chart */}
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} mb={1}>Compliance by Operator</Typography>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={tip} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Pass" stackId="a" fill="#2e9e5b" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Warning" stackId="a" fill="#e6a700" />
                        <Bar dataKey="Fail" stackId="a" fill="#e0413b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Alerts */}
                <Card>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle1" fontWeight={600}>Alerts</Typography>
                      <Chip size="small" label={alerts.length} variant="outlined" />
                    </Stack>

                    {!alerts.length ? <EmptyState message="No alerts." /> : (
                      <Stack spacing={1} sx={{ maxHeight: 360, overflowY: 'auto' }}>
                        {violations.length > 0 && (
                          <>
                            <Typography variant="caption" fontWeight={600} color="error.main" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Violations ({violations.length})
                            </Typography>
                            {violations.map((a) => (
                              <Box key={a.alert_id} sx={(t) => ({
                                p: 1.5, borderRadius: 1.5, bgcolor: alpha(t.palette.error.main, 0.06),
                                borderLeft: `3px solid ${t.palette.error.main}`,
                              })}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Stack direction="row" spacing={0.5} alignItems="center">
                                    <ErrorOutlineIcon color="error" sx={{ fontSize: 16 }} />
                                    <Typography variant="subtitle2">{a.operator_name}</Typography>
                                  </Stack>
                                  <StatusChip status="FAIL" />
                                </Stack>
                                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>{a.message}</Typography>
                              </Box>
                            ))}
                          </>
                        )}

                        {warnings.length > 0 && (
                          <>
                            <Typography variant="caption" fontWeight={600} color="warning.main" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', mt: violations.length ? 1 : 0 }}>
                              Warnings ({warnings.length})
                            </Typography>
                            {warnings.map((a) => (
                              <Box key={a.alert_id} sx={(t) => ({
                                p: 1.5, borderRadius: 1.5, bgcolor: alpha(t.palette.warning.main, 0.06),
                                borderLeft: `3px solid ${t.palette.warning.main}`,
                              })}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Stack direction="row" spacing={0.5} alignItems="center">
                                    <WarningAmberIcon color="warning" sx={{ fontSize: 16 }} />
                                    <Typography variant="subtitle2">{a.operator_name}</Typography>
                                  </Stack>
                                  <StatusChip status="WARNING" />
                                </Stack>
                                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>{a.message}</Typography>
                              </Box>
                            ))}
                          </>
                        )}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
