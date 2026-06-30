import { useEffect, useState, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, Stack, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, Alert,
  Switch, FormControlLabel, TablePagination, InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import SearchIcon from '@mui/icons-material/Search';
import { get, post, put, del } from '../api/client';
import { Loading, EmptyState } from '../components/ui';
import { useAuth } from '../auth/AuthContext';

const ROLE_COLOR = {
  SYSTEM_ADMIN: 'error',
  REGULATOR_ADMIN: 'primary',
  REGULATOR_ANALYST: 'info',
  OPERATOR_USER: 'default',
};

function UserDialog({ open, user, roles, operators, onClose, onSaved }) {
  const isEdit = Boolean(user);
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', roleKey: 'REGULATOR_ANALYST',
    operatorId: '', isActive: true,
  });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        email: user.email, password: '', fullName: user.full_name || '',
        roleKey: user.role_key, operatorId: user.operator_id || '',
        isActive: Boolean(user.is_active),
      });
    } else {
      setForm({ email: '', password: '', fullName: '', roleKey: 'REGULATOR_ANALYST', operatorId: '', isActive: true });
    }
    setErr('');
  }, [user, open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      if (isEdit) {
        await put(`/users/${user.user_id}`, {
          fullName: form.fullName,
          roleKey: form.roleKey,
          operatorId: form.operatorId ? Number(form.operatorId) : null,
          isActive: form.isActive,
        });
      } else {
        if (!form.password) { setErr('Password is required'); setSaving(false); return; }
        await post('/users', {
          email: form.email, password: form.password, fullName: form.fullName,
          roleKey: form.roleKey,
          operatorId: form.operatorId ? Number(form.operatorId) : null,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit User' : 'Add User'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {err && <Alert severity="error">{err}</Alert>}
        {!isEdit && (
          <TextField label="Email" type="email" fullWidth value={form.email} onChange={set('email')} required />
        )}
        {!isEdit && (
          <TextField label="Password" type="password" fullWidth value={form.password} onChange={set('password')} required helperText="Minimum 8 characters" />
        )}
        <TextField label="Full Name" fullWidth value={form.fullName} onChange={set('fullName')} />
        <FormControl fullWidth>
          <InputLabel>Role</InputLabel>
          <Select label="Role" value={form.roleKey} onChange={set('roleKey')}>
            {roles.map((r) => <MenuItem key={r.role_key} value={r.role_key}>{r.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Operator (optional)</InputLabel>
          <Select label="Operator (optional)" value={form.operatorId} onChange={set('operatorId')}>
            <MenuItem value="">None</MenuItem>
            {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
          </Select>
        </FormControl>
        {isEdit && (
          <FormControlLabel
            control={<Switch checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />}
            label="Active"
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ResetPasswordDialog({ open, user, onClose }) {
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { setPwd(''); setErr(''); setDone(false); }, [open]);

  const save = async () => {
    if (pwd.length < 8) { setErr('Minimum 8 characters'); return; }
    setSaving(true);
    try {
      await post(`/users/${user.user_id}/reset-password`, { newPassword: pwd });
      setDone(true);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Reset Password — {user?.full_name || user?.email}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {done ? <Alert severity="success">Password reset successfully.</Alert> : (
          <>
            {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}
            <TextField label="New Password" type="password" fullWidth value={pwd}
              onChange={(e) => setPwd(e.target.value)} helperText="Minimum 8 characters" />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{done ? 'Close' : 'Cancel'}</Button>
        {!done && <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Reset'}</Button>}
      </DialogActions>
    </Dialog>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [roles, setRoles] = useState([]);
  const [operators, setOperators] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => get('/users').then((r) => setUsers(r.data)).catch(() => setUsers([]));

  useEffect(() => {
    load();
    get('/users/roles').then((r) => setRoles(r.data)).catch(() => {});
    get('/operators').then((r) => setOperators(r.data)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.toLowerCase();
    return users.filter((u) =>
      !q ||
      (u.full_name || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role_key.toLowerCase().includes(q) ||
      (u.operator_name || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await del(`/users/${deleteTarget.user_id}`).catch(() => {});
    setDeleteTarget(null);
    load();
  };

  if (!users) return <Loading />;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">User Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditUser(null); setEditOpen(true); }}>
          Add User
        </Button>
      </Stack>

      <Card>
        <CardContent>
          <TextField
            size="small" placeholder="Search by name, email, role…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ mb: 2, width: 320 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />

          {!filtered.length ? (
            <EmptyState message={search ? 'No users match your search.' : 'No users found.'} />
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Operator</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Last Login</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(page * 10, page * 10 + 10).map((u) => (
                      <TableRow key={u.user_id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{u.full_name || '—'}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{u.email}</TableCell>
                        <TableCell>
                          <Chip size="small" label={u.role_key} color={ROLE_COLOR[u.role_key] || 'default'} />
                        </TableCell>
                        <TableCell>{u.operator_name || '—'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={u.is_active ? 'Active' : 'Inactive'}
                            color={u.is_active ? 'success' : 'default'} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => { setEditUser(u); setEditOpen(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reset Password">
                            <IconButton size="small" onClick={() => setResetTarget(u)}>
                              <LockResetIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <span>
                              <IconButton size="small" color="error"
                                disabled={u.user_id === me?.userId}
                                onClick={() => setDeleteTarget(u)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <TablePagination component="div" count={filtered.length} page={page} rowsPerPage={10}
                rowsPerPageOptions={[10]} onPageChange={(_, p) => setPage(p)} />
            </>
          )}
        </CardContent>
      </Card>

      <UserDialog open={editOpen} user={editUser} roles={roles} operators={operators}
        onClose={() => setEditOpen(false)} onSaved={load} />

      <ResetPasswordDialog open={Boolean(resetTarget)} user={resetTarget}
        onClose={() => setResetTarget(null)} />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>Delete <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
