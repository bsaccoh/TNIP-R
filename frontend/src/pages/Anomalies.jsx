import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, Button, FormControl, InputLabel, Select, MenuItem,
  Alert, LinearProgress,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RadarIcon from '@mui/icons-material/Radar';
import RefreshIcon from '@mui/icons-material/Refresh';
import { get, post } from '../api/client';
import { Loading, EmptyState } from '../components/ui';

const SEV_COLOR = { HIGH: 'error', MEDIUM: 'warning', LOW: 'info' };

export default function Anomalies() {
  const [data, setData] = useState(null);
  const [operators, setOperators] = useState([]);
  const [filterOp, setFilterOp] = useState('');
  const [filterSev, setFilterSev] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const load = () => {
    const params = {};
    if (filterOp)  params.operatorId = filterOp;
    if (filterSev) params.severity = filterSev;
    get('/anomalies', params).then(r => setData(r.data?.rows ?? r.data)).catch(() => setData([]));
  };

  useEffect(() => { load(); }, [filterOp, filterSev]);
  useEffect(() => { get('/operators').then(r => setOperators(r.data || [])); }, []);

  const runScan = async () => {
    setScanning(true); setScanResult(null);
    try {
      const r = await post('/anomalies/scan', { minPct: 10 });
      setScanResult(r.data?.length ?? 0);
      load();
    } catch { setScanResult(-1); }
    finally { setScanning(false); }
  };

  const rows = Array.isArray(data) ? data : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <RadarIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Anomaly Detection</Typography>
          {rows.length > 0 && <Chip size="small" label={`${rows.length} detected`} color="warning" />}
        </Stack>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={runScan} disabled={scanning}>
          {scanning ? 'Scanning…' : 'Run Scan'}
        </Button>
      </Stack>

      {scanning && <LinearProgress />}

      {scanResult !== null && scanResult >= 0 && (
        <Alert severity={scanResult > 0 ? 'warning' : 'success'}>
          {scanResult > 0 ? `${scanResult} new anomaly${scanResult > 1 ? 'ies' : ''} detected and recorded.` : 'No new anomalies detected — all KPIs within normal range.'}
        </Alert>
      )}
      {scanResult === -1 && <Alert severity="error">Scan failed. Check backend logs.</Alert>}

      <Alert severity="info" icon={<WarningAmberIcon />}>
        Anomaly detection compares today's KPI values against the previous day. Any change ≥ 10% flags a detection.
        HIGH ≥ 30% · MEDIUM ≥ 15% · LOW ≥ 10%
      </Alert>

      <Stack direction="row" spacing={2}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Operator</InputLabel>
          <Select label="Operator" value={filterOp} onChange={e => setFilterOp(e.target.value)}>
            <MenuItem value="">All Operators</MenuItem>
            {operators.map(o => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Severity</InputLabel>
          <Select label="Severity" value={filterSev} onChange={e => setFilterSev(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="HIGH">HIGH</MenuItem>
            <MenuItem value="MEDIUM">MEDIUM</MenuItem>
            <MenuItem value="LOW">LOW</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Card>
        <CardContent sx={{ p: '0 !important' }}>
          {!data ? <Box p={3}><Loading /></Box> : !rows.length ? (
            <Box p={3}><EmptyState message="No anomalies detected." hint="Run a scan to check today's KPI values against yesterday." /></Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Detected</TableCell>
                  <TableCell>Operator</TableCell>
                  <TableCell>KPI</TableCell>
                  <TableCell>Today</TableCell>
                  <TableCell>Yesterday</TableCell>
                  <TableCell>Change</TableCell>
                  <TableCell>Direction</TableCell>
                  <TableCell>Severity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.anomaly_id} hover>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2" fontWeight={600}>{r.operator_name}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{r.kpi_key}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.kpi_name}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{Number(r.value).toFixed(2)}{r.unit}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{Number(r.expected).toFixed(2)}{r.unit}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}
                        color={r.deviation >= 30 ? 'error.main' : r.deviation >= 15 ? 'warning.main' : 'info.main'}>
                        {Number(r.deviation).toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={r.method === 'pct_change' ? (Number(r.value) < Number(r.expected) ? '↓ DROP' : '↑ SPIKE') : r.method}
                        color={Number(r.value) < Number(r.expected) ? 'error' : 'warning'} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={r.severity} color={SEV_COLOR[r.severity] || 'default'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
