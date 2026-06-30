import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Table, TableHead, TableBody,
  TableRow, TableCell, TablePagination, Chip, TextField, Select, MenuItem,
  FormControl, InputLabel, IconButton, Tooltip, Collapse,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { get } from '../api/client';
import { Loading, EmptyState } from '../components/ui';

const ACTION_COLOR = {
  LOGIN: 'info', LOGOUT: 'default',
  OPERATOR_CREATE: 'success', OPERATOR_UPDATE: 'warning',
  PM_UPLOAD: 'primary', KPI_CALC: 'secondary',
  USER_CREATE: 'success', USER_UPDATE: 'warning', USER_DELETE: 'error',
  SETTINGS_UPDATE: 'warning', THRESHOLD_CREATE: 'success',
  SFTP_DELETE: 'error', LICENSE_CREATE: 'success',
};

function DetailRow({ detail }) {
  const [open, setOpen] = useState(false);
  if (!detail) return <Typography variant="caption" color="text.secondary">—</Typography>;
  const parsed = typeof detail === 'string' ? (() => { try { return JSON.parse(detail); } catch { return detail; } })() : detail;
  const preview = typeof parsed === 'object' ? Object.keys(parsed).slice(0, 2).map(k => `${k}: ${parsed[k]}`).join(', ') : String(parsed);
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 180 }}>{preview}</Typography>
        <IconButton size="small" onClick={() => setOpen(o => !o)} sx={{ p: 0 }}>
          {open ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
        </IconButton>
      </Stack>
      <Collapse in={open}>
        <Box component="pre" sx={{ fontSize: 10, mt: 0.5, p: 1, bgcolor: 'action.hover', borderRadius: 1, whiteSpace: 'pre-wrap', maxWidth: 300 }}>
          {JSON.stringify(parsed, null, 2)}
        </Box>
      </Collapse>
    </Box>
  );
}

export default function AuditLog() {
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [actions, setActions] = useState([]);
  const [filters, setFilters] = useState({ action: '', entityType: '', from: '', to: '' });
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(() => {
    const params = { limit: 10, offset: page * 10, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
    get('/audit-logs', params)
      .then(r => { setRows(r.data.rows); setTotal(r.data.total); })
      .catch(() => setRows([]));
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { get('/audit-logs/actions').then(r => setActions(r.data || [])).catch(() => {}); }, []);

  const setFilter = k => e => { setFilters(f => ({ ...f, [k]: e.target.value })); setPage(0); };

  if (!rows) return <Loading />;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <HistoryIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Audit Log</Typography>
          <Chip size="small" label={`${total.toLocaleString()} entries`} />
        </Stack>
        <Tooltip title="Filters">
          <IconButton onClick={() => setShowFilters(f => !f)}>
            <FilterListIcon color={showFilters ? 'primary' : 'inherit'} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Collapse in={showFilters}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Action</InputLabel>
                <Select label="Action" value={filters.action} onChange={setFilter('action')}>
                  <MenuItem value="">All Actions</MenuItem>
                  {actions.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" label="Entity Type" sx={{ width: 160 }}
                value={filters.entityType} onChange={setFilter('entityType')} placeholder="e.g. operator" />
              <TextField size="small" label="From" type="datetime-local" sx={{ width: 200 }}
                InputLabelProps={{ shrink: true }} value={filters.from} onChange={setFilter('from')} />
              <TextField size="small" label="To" type="datetime-local" sx={{ width: 200 }}
                InputLabelProps={{ shrink: true }} value={filters.to} onChange={setFilter('to')} />
            </Stack>
          </CardContent>
        </Card>
      </Collapse>

      <Card>
        <CardContent sx={{ p: '0 !important' }}>
          {!rows.length ? <Box p={3}><EmptyState message="No audit entries found." /></Box> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>Operator</TableCell>
                  <TableCell>IP</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.audit_id} hover>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontWeight={600}>{r.full_name || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={r.action}
                        color={ACTION_COLOR[r.action] || 'default'} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {r.entity_type && (
                        <Typography variant="caption">
                          {r.entity_type}{r.entity_id ? ` #${r.entity_id}` : ''}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{r.operator_name || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{r.ip_address || '—'}</Typography>
                    </TableCell>
                    <TableCell><DetailRow detail={r.detail} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <TablePagination component="div" count={total} page={page} rowsPerPage={10}
            rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />
        </CardContent>
      </Card>
    </Box>
  );
}
