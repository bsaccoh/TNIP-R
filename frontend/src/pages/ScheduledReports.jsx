import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, FormControl,
  InputLabel, Alert, Switch, FormControlLabel, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { get, post, put, del } from '../api/client';
import Snackbar from '@mui/material/Snackbar';
import { Loading, EmptyState } from '../components/ui';

const FREQ_COLOR = { DAILY: 'info', WEEKLY: 'primary', MONTHLY: 'secondary' };
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function ScheduleDialog({ open, row, operators, onClose, onSaved }) {
  const blank = {
    name: '', report_type: 'compliance', operator_id: '',
    format: 'XLSX', frequency: 'MONTHLY',
    day_of_week: 1, day_of_month: 1,
    recipients: '', is_active: true,
  };
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(row ? {
        name: row.name, report_type: row.report_type, operator_id: row.operator_id ?? '',
        format: row.format, frequency: row.frequency,
        day_of_week: row.day_of_week ?? 1, day_of_month: row.day_of_month ?? 1,
        recipients: row.recipients ?? '', is_active: Boolean(row.is_active),
      } : { ...blank });
      setErr('');
    }
  }, [open, row]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name) { setErr('Name is required.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        ...form,
        operator_id: form.operator_id ? Number(form.operator_id) : null,
        day_of_week: form.frequency === 'WEEKLY' ? Number(form.day_of_week) : null,
        day_of_month: form.frequency === 'MONTHLY' ? Number(form.day_of_month) : null,
      };
      if (row) await put(`/reports/schedules/${row.schedule_id}`, payload);
      else await post('/reports/schedules', payload);
      onSaved(); onClose();
    } catch (e) {
      setErr(e?.response?.data?.error?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{row ? 'Edit Schedule' : 'New Scheduled Report'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {err && <Alert severity="error">{err}</Alert>}
        <TextField size="small" label="Schedule Name *" fullWidth value={form.name} onChange={set('name')} />
        <Stack direction="row" spacing={2}>
          <FormControl size="small" fullWidth>
            <InputLabel>Report Type</InputLabel>
            <Select label="Report Type" value={form.report_type} onChange={set('report_type')}>
              <MenuItem value="kpi">KPI Performance</MenuItem>
              <MenuItem value="compliance">Compliance Status</MenuItem>
              <MenuItem value="trend">KPI Trend</MenuItem>
              <MenuItem value="anomaly">Anomaly Detection</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Format</InputLabel>
            <Select label="Format" value={form.format} onChange={set('format')}>
              <MenuItem value="XLSX">Excel (.xlsx)</MenuItem>
              <MenuItem value="PDF">PDF</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <FormControl size="small" fullWidth>
          <InputLabel>Operator</InputLabel>
          <Select label="Operator" value={form.operator_id} onChange={set('operator_id')}>
            <MenuItem value="">All Operators</MenuItem>
            {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Frequency</InputLabel>
          <Select label="Frequency" value={form.frequency} onChange={set('frequency')}>
            <MenuItem value="DAILY">Daily (6:00 AM)</MenuItem>
            <MenuItem value="WEEKLY">Weekly</MenuItem>
            <MenuItem value="MONTHLY">Monthly</MenuItem>
          </Select>
        </FormControl>
        {form.frequency === 'WEEKLY' && (
          <FormControl size="small" fullWidth>
            <InputLabel>Day of Week</InputLabel>
            <Select label="Day of Week" value={form.day_of_week} onChange={set('day_of_week')}>
              {DAYS.map((d, i) => <MenuItem key={i} value={i}>{d}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        {form.frequency === 'MONTHLY' && (
          <TextField size="small" label="Day of Month (1–28)" type="number"
            inputProps={{ min: 1, max: 28 }} value={form.day_of_month} onChange={set('day_of_month')} />
        )}
        <TextField size="small" label="Email Recipients (comma-separated)" fullWidth multiline rows={2}
          value={form.recipients} onChange={set('recipients')}
          placeholder="compliance@tnipr.gov, admin@tnipr.gov" />
        <FormControlLabel
          control={<Switch checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />}
          label="Enabled" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ScheduledReports() {
  const [schedules, setSchedules] = useState(null);
  const [operators, setOperators] = useState([]);
  const [editRow, setEditRow] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [runningId, setRunningId] = useState(null);
  const [snack, setSnack] = useState('');

  const load = () => get('/reports/schedules').then((r) => setSchedules(r.data)).catch(() => setSchedules([]));
  useEffect(() => {
    load();
    get('/operators').then((r) => setOperators(r.data || []));
  }, []);

  if (!schedules) return <Loading />;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <ScheduleIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Scheduled Reports</Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditRow(null); setDialogOpen(true); }}>
          Add Schedule
        </Button>
      </Stack>

      <Card>
        <CardContent>
          {!schedules.length ? (
            <EmptyState message="No scheduled reports." hint="Add a schedule to automate report generation and email delivery." />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Operator</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Format</TableCell>
                  <TableCell>Next Run</TableCell>
                  <TableCell>Last Run</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {schedules.map((s) => (
                  <TableRow key={s.schedule_id} hover>
                    <TableCell><Typography variant="body2" fontWeight={600}>{s.name}</Typography></TableCell>
                    <TableCell><Chip size="small" label={s.report_type} variant="outlined" /></TableCell>
                    <TableCell>{s.operator_name || <Typography variant="caption" color="text.secondary">All</Typography>}</TableCell>
                    <TableCell><Chip size="small" label={s.frequency} color={FREQ_COLOR[s.frequency]} /></TableCell>
                    <TableCell>{s.format}</TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {s.next_run_at ? new Date(s.next_run_at).toLocaleString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {s.last_run_at ? new Date(s.last_run_at).toLocaleString() : 'Never'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={s.is_active ? 'Active' : 'Paused'}
                        color={s.is_active ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Run Now">
                        <span>
                          <IconButton size="small" color="primary"
                            disabled={runningId === s.schedule_id}
                            onClick={async () => {
                              setRunningId(s.schedule_id);
                              try {
                                await post(`/reports/schedules/${s.schedule_id}/run`);
                                setSnack(`"${s.name}" ran successfully.`);
                                load();
                              } catch {
                                setSnack('Run failed — check server logs.');
                              } finally { setRunningId(null); }
                            }}>
                            <PlayArrowIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => { setEditRow(s); setDialogOpen(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(s)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack('')}
        message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />

      <ScheduleDialog open={dialogOpen} row={editRow} operators={operators}
        onClose={() => setDialogOpen(false)} onSaved={load} />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle>Delete Schedule</DialogTitle>
        <DialogContent>
          <Typography>Delete schedule <strong>{deleteTarget?.name}</strong>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={async () => {
            await del(`/reports/schedules/${deleteTarget.schedule_id}`).catch(() => {});
            setDeleteTarget(null); load();
          }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
