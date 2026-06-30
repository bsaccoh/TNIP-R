import { useEffect, useState } from 'react';
import {
  Card, CardContent, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  Box, Grid, Chip, Stack, Button, TablePagination,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import { get } from '../api/client';
import { Loading, EmptyState, fmt, useChartTip } from '../components/ui';
import { colorFor } from '../theme';
import { exportCsv } from '../utils/csv';

export default function KpiComparison() {
  const [rows, setRows] = useState(null);
  const [page, setPage] = useState(0);
  const tip = useChartTip();

  useEffect(() => { get('/kpis/comparison').then((r) => setRows(r.data)).catch(() => setRows([])); }, []);
  if (!rows) return <Loading />;
  if (!rows.length) return <EmptyState message="No calculated KPIs yet." hint="Upload a PM file under Data Ingestion first." />;

  // Pivot: kpis as rows, operators as columns.
  const operators = [...new Set(rows.map((r) => r.operator_name))];
  const kpis = [...new Set(rows.map((r) => r.kpi_key))];
  const cell = (op, kpi) => rows.find((r) => r.operator_name === op && r.kpi_key === kpi)?.value;
  const kpiName = (k) => rows.find((r) => r.kpi_key === k)?.kpi_name || k;

  // Radar data (percentage KPIs only for comparability).
  const radarData = kpis
    .filter((k) => (rows.find((r) => r.kpi_key === k)?.unit || '') === '%')
    .map((k) => {
      const row = { kpi: kpiName(k).replace(/\(DEMO\)/, '').trim() };
      operators.forEach((op) => { row[op] = Number(fmt(cell(op, k))); });
      return row;
    });

  const handleExport = () => {
    const csvRows = kpis.flatMap((k) =>
      operators.map((op) => ({ kpi: kpiName(k), operator: op, value: fmt(cell(op, k)) }))
    );
    exportCsv('kpi_comparison.csv', [
      { key: 'kpi', label: 'KPI' }, { key: 'operator', label: 'Operator' }, { key: 'value', label: 'Value' },
    ], csvRows);
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">KPI Comparison</Typography>
          <Button size="small" startIcon={<DownloadIcon />} onClick={handleExport}>Export CSV</Button>
        </Stack>
      </Grid>
      <Grid item xs={12} md={7}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Operator KPI Matrix</Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>KPI</TableCell>
                    {operators.map((op) => (
                      <TableCell key={op} align="right">
                        <Chip size="small" label={op} sx={{ bgcolor: colorFor(op) + '33' }} />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {kpis.slice(page * 10, page * 10 + 10).map((k) => (
                    <TableRow key={k} hover>
                      <TableCell>{kpiName(k)}</TableCell>
                      {operators.map((op) => (
                        <TableCell key={op} align="right">{fmt(cell(op, k))}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <TablePagination component="div" count={kpis.length} page={page} rowsPerPage={10}
              rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={5}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>QoS Radar (%)</Typography>
            {!radarData.length ? <EmptyState message="No percentage KPIs to plot." /> : (
              <ResponsiveContainer width="100%" height={360}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="kpi" tick={{ fontSize: 10 }} />
                  {operators.map((op, i) => (
                    <Radar key={op} dataKey={op} stroke={colorFor(op, i)} fill={colorFor(op, i)} fillOpacity={0.15} />
                  ))}
                  <Legend />
                  <Tooltip contentStyle={tip} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
