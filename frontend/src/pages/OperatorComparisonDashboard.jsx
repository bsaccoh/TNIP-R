import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  LinearProgress, Alert, Chip, Stack
} from '@mui/material';
import { get } from '../api/client';
import { colorFor } from '../theme';

export default function OperatorComparisonDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/drive-tests/compare-operators/all')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LinearProgress />;
  if (!data) return <Alert severity="error">Failed to load comparison data</Alert>;

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', py: 4 }}>
      <Typography variant="h4" fontWeight={900} mb={3}>
        Operator Comparison Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Aggregated lifetime Drive Test metrics across all national operators.
      </Typography>

      <Card>
        <CardContent>
          <Table size="medium">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 800 }}>KPI</TableCell>
                {data.map(op => (
                  <TableCell key={op.operator} align="center" sx={{ fontWeight: 800 }}>
                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: colorFor(op.operator) }} />
                      <Typography variant="subtitle2" fontWeight={800}>{op.operator}</Typography>
                    </Stack>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                { label: 'Drive Tests', key: 'tests' },
                { label: 'Distance', key: 'distance' },
                { label: 'Avg RSRP', key: 'avgRsrp', suffix: ' dBm' },
                { label: 'Avg RSRQ', key: 'avgRsrq', suffix: ' dB' },
                { label: 'Avg SINR', key: 'avgSinr', suffix: ' dB' },
                { label: 'Avg DL', key: 'avgDl' },
                { label: 'Avg UL', key: 'avgUl' },
                { label: 'Latency', key: 'latency' },
                { label: 'QoS Score', key: 'qosScore', bold: true },
                { label: 'Compliance', key: 'compliance', chip: true }
              ].map(row => (
                <TableRow key={row.label} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{row.label}</TableCell>
                  {data.map(op => (
                    <TableCell key={op.operator} align="center" sx={{ fontWeight: row.bold ? 800 : 400 }}>
                      {row.chip ? (
                        <Chip 
                          label={op[row.key]} 
                          size="small" 
                          color={op[row.key] === 'Pass' ? 'success' : op[row.key] === 'Warning' ? 'warning' : 'error'} 
                        />
                      ) : (
                        `${op[row.key]}${row.suffix || ''}`
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
