import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, Alert, Tooltip,
  IconButton,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import UpdateIcon from '@mui/icons-material/Update';
import { get, post, put } from '../api/client';
import { Loading, EmptyState } from '../components/ui';

const STATUS_COLOR = { DRAFT: 'default', ISSUED: 'warning', ACKNOWLEDGED: 'info', CLOSED: 'success' };

function IssueDialog({ operators, open, onClose, onIssued }) {
  const [operatorId, setOperatorId] = useState('');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const issue = async () => {
    if (!operatorId) return;
    setSaving(true); setResult(null);
    try {
      const r = await post('/compliance/notices', { operatorId: Number(operatorId), period });
      setResult(r.data);
    } catch (e) {
      setResult({ error: e?.response?.data?.error?.message || 'Failed to issue notice.' });
    } finally { setSaving(false); }
  };

  const handleClose = () => { setResult(null); setOperatorId(''); onClose(); if (result && !result.error) onIssued(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Issue Compliance Notice</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {!result ? (
          <>
            <Alert severity="info">
              A notice will be issued for all current KPI breaches for the selected operator and period.
            </Alert>
            <FormControl size="small" fullWidth>
              <InputLabel>Operator *</InputLabel>
              <Select label="Operator *" value={operatorId} onChange={e => setOperatorId(e.target.value)}>
                {operators.map(o => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel shrink>Period</InputLabel>
              <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
                style={{ marginTop: 16, padding: '8px 12px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'inherit', fontSize: 14 }} />
            </FormControl>
          </>
        ) : result.error ? (
          <Alert severity="error">{result.error}</Alert>
        ) : (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Notice <strong>{result.notice_ref}</strong> issued for <strong>{result.operator_name}</strong>.
            </Alert>
            <Typography variant="subtitle2" gutterBottom>KPI Breaches included ({result.breaches?.length || 0}):</Typography>
            {result.breaches?.length ? result.breaches.map((b, i) => (
              <Typography key={i} variant="caption" display="block" color="error.main">
                • {b.kpi_key}: {b.value}{b.unit} (required {b.comparator} {b.required_value}{b.unit})
              </Typography>
            )) : <Typography variant="caption" color="text.secondary">No active breaches found.</Typography>}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{result ? 'Close' : 'Cancel'}</Button>
        {!result && <Button variant="contained" onClick={issue} disabled={saving || !operatorId}>{saving ? 'Issuing…' : 'Issue Notice'}</Button>}
      </DialogActions>
    </Dialog>
  );
}

export default function ComplianceNotices() {
  const [notices, setNotices] = useState(null);
  const [operators, setOperators] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);

  const load = () => get('/compliance/notices').then(r => setNotices(r.data)).catch(() => setNotices([]));
  useEffect(() => { load(); get('/operators').then(r => setOperators(r.data || [])); }, []);

  const downloadNotice = (id, ref, format = 'xlsx') => {
    const token = localStorage.getItem('tnipr_access');
    const url = `/api/v1/compliance/notices/${id}/download?format=${format}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Notice_${ref}.${format}`;
        a.click();
      });
  };

  if (!notices) return <Loading />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <GavelIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Compliance Notices</Typography>
          <Chip size="small" label={`${notices.length} notices`} />
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Issue Notice
        </Button>
      </Stack>

      <Card>
        <CardContent sx={{ p: '0 !important' }}>
          {!notices.length ? (
            <Box p={3}><EmptyState message="No compliance notices issued." hint="Issue a notice when an operator fails to meet KPI thresholds." /></Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Operator</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Breaches</TableCell>
                  <TableCell>Issued</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notices.map(n => {
                  const breaches = typeof n.breaches === 'string' ? JSON.parse(n.breaches || '[]') : n.breaches || [];
                  return (
                    <TableRow key={n.notice_id} hover>
                      <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{n.notice_ref}</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight={600}>{n.operator_name}</Typography></TableCell>
                      <TableCell>{n.period}</TableCell>
                      <TableCell>
                        <Chip size="small" label={`${breaches.length} KPI${breaches.length !== 1 ? 's' : ''}`}
                          color={breaches.length > 0 ? 'error' : 'default'} variant="outlined" />
                      </TableCell>
                      <TableCell><Typography variant="caption">{new Date(n.created_at).toLocaleString()}</Typography></TableCell>
                      <TableCell>
                        <Chip size="small" label={n.status} color={STATUS_COLOR[n.status] || 'default'} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Download Excel">
                          <IconButton size="small" onClick={() => downloadNotice(n.notice_id, n.notice_ref, 'xlsx')}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download PDF">
                          <IconButton size="small" color="error" onClick={() => downloadNotice(n.notice_id, n.notice_ref, 'pdf')}>
                            <PictureAsPdfIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Update Status">
                          <IconButton size="small" onClick={() => setStatusTarget(n)}>
                            <UpdateIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <IssueDialog open={dialogOpen} operators={operators} onClose={() => setDialogOpen(false)} onIssued={load} />

      <Dialog open={Boolean(statusTarget)} onClose={() => setStatusTarget(null)} maxWidth="xs">
        <DialogTitle>Update Notice Status</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>New Status</InputLabel>
            <Select label="New Status" defaultValue={statusTarget?.status || 'ISSUED'}
              onChange={async e => {
                await put(`/compliance/notices/${statusTarget.notice_id}/status`, { status: e.target.value }).catch(() => {});
                setStatusTarget(null); load();
              }}>
              <MenuItem value="ISSUED">ISSUED</MenuItem>
              <MenuItem value="ACKNOWLEDGED">ACKNOWLEDGED</MenuItem>
              <MenuItem value="CLOSED">CLOSED</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions><Button onClick={() => setStatusTarget(null)}>Cancel</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
