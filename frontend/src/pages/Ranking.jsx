import { useEffect, useState } from 'react';
import {
  Card, CardContent, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  Box, Button, Stack, Chip, TablePagination, TextField, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CalculateIcon from '@mui/icons-material/Calculate';
import DownloadIcon from '@mui/icons-material/Download';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from 'recharts';
import { get, post } from '../api/client';
import { Loading, EmptyState, Trend, fmt, useChartTip } from '../components/ui';
import { colorFor } from '../theme';
import { exportCsv } from '../utils/csv';

export default function Ranking() {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const tip = useChartTip();

  const load = () => get('/rankings').then((r) => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const compute = async () => {
    setBusy(true);
    try { await post('/rankings/compute', {}); load(); } finally { setBusy(false); }
  };

  if (!rows) return <Loading />;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Operator Ranking — Composite QoS Score</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<DownloadIcon />} disabled={!rows?.length}
            onClick={() => exportCsv('operator_ranking.csv', [
              { key: 'rank_position', label: 'Rank' }, { key: 'operator_name', label: 'Operator' },
              { key: 'qos_score', label: 'QoS Score' }, { key: 'period', label: 'Period' },
              { key: 'trend', label: 'Trend' },
            ], rows)}>Export</Button>
          <Button startIcon={<CalculateIcon />} variant="outlined" onClick={compute} disabled={busy}>
            {busy ? 'Computing…' : 'Recompute rankings'}
          </Button>
        </Stack>
      </Stack>

      {!rows.length ? (
        <EmptyState message="No rankings yet." hint="Ingest data, then click Recompute rankings." />
      ) : (() => {
        const filtered = rows.filter((r) =>
          !search || r.operator_name.toLowerCase().includes(search.toLowerCase())
        );
        return (
          <Stack spacing={2}>
            <Card>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rows} layout="vertical" margin={{ left: 24 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="operator_name" tick={{ fontSize: 12 }} width={90} />
                    <Tooltip contentStyle={tip} />
                    <Bar dataKey="qos_score" radius={[0, 6, 6, 0]}>
                      {rows.map((r) => <Cell key={r.operator_name} fill={colorFor(r.operator_name)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <TextField
                  size="small" placeholder="Search operator…" value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  sx={{ mb: 2, width: 240 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                />
                <Table size="small">
                  <TableHead>
                    <TableRow><TableCell>Rank</TableCell><TableCell>Operator</TableCell><TableCell align="right">QoS Score</TableCell><TableCell>Period</TableCell><TableCell align="center">Trend</TableCell></TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(page * 10, page * 10 + 10).map((r) => (
                      <TableRow key={r.operator_name} hover>
                        <TableCell><Chip size="small" label={`#${r.rank_position}`} /></TableCell>
                        <TableCell>{r.operator_name}</TableCell>
                        <TableCell align="right">{fmt(r.qos_score, 1)}</TableCell>
                        <TableCell>{r.period}</TableCell>
                        <TableCell align="center"><Trend trend={r.trend} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination component="div" count={filtered.length} page={page} rowsPerPage={10}
                  rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />
              </CardContent>
            </Card>
          </Stack>
        );
      })()}
    </Box>
  );
}
