import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, TextField, Button, Alert, Divider,
  Avatar, Chip,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import { put } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const ROLE_COLOR = {
  SYSTEM_ADMIN: 'error', REGULATOR_ADMIN: 'primary',
  REGULATOR_ANALYST: 'info', OPERATOR_USER: 'default', DRIVE_TEST_USER: 'success',
};

export default function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.fullName || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState(null);

  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);

  const saveName = async () => {
    if (!name.trim()) return;
    setNameSaving(true); setNameMsg(null);
    try {
      await put('/auth/profile', { fullName: name.trim() });
      setNameMsg({ type: 'success', text: 'Name updated successfully.' });
    } catch (e) {
      setNameMsg({ type: 'error', text: e?.response?.data?.error?.message || 'Update failed.' });
    } finally { setNameSaving(false); }
  };

  const savePassword = async () => {
    if (newPwd !== confirmPwd) { setPwdMsg({ type: 'error', text: 'Passwords do not match.' }); return; }
    if (newPwd.length < 8) { setPwdMsg({ type: 'error', text: 'Password must be at least 8 characters.' }); return; }
    setPwdSaving(true); setPwdMsg(null);
    try {
      await put('/auth/profile', { currentPassword: curPwd, newPassword: newPwd });
      setPwdMsg({ type: 'success', text: 'Password updated successfully.' });
      setCurPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e) {
      setPwdMsg({ type: 'error', text: e?.response?.data?.error?.message || 'Password update failed.' });
    } finally { setPwdSaving(false); }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, fontSize: 24 }}>
          {(user?.fullName || user?.email || '?')[0].toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700}>{user?.fullName || user?.email}</Typography>
          <Stack direction="row" spacing={1} mt={0.5}>
            <Chip size="small" label={user?.role} color={ROLE_COLOR[user?.role] || 'default'} />
            {user?.operatorName && <Chip size="small" label={user.operatorName} variant="outlined" />}
          </Stack>
        </Box>
      </Stack>

      {/* Display name */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <PersonIcon color="primary" />
            <Typography variant="h6">Profile</Typography>
          </Stack>
          <TextField fullWidth label="Email" value={user?.email || ''} disabled sx={{ mb: 2 }} />
          <TextField fullWidth label="Full Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ mb: 2 }} />
          {nameMsg && <Alert severity={nameMsg.type} sx={{ mb: 2 }}>{nameMsg.text}</Alert>}
          <Button variant="contained" onClick={saveName} disabled={nameSaving || !name.trim()}>
            {nameSaving ? 'Saving…' : 'Save Name'}
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <LockIcon color="primary" />
            <Typography variant="h6">Change Password</Typography>
          </Stack>
          <Stack spacing={2}>
            <TextField fullWidth label="Current Password" type="password" value={curPwd}
              onChange={(e) => setCurPwd(e.target.value)} />
            <TextField fullWidth label="New Password" type="password" value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)} helperText="Minimum 8 characters" />
            <TextField fullWidth label="Confirm New Password" type="password" value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)} />
          </Stack>
          {pwdMsg && <Alert severity={pwdMsg.type} sx={{ mt: 2, mb: 1 }}>{pwdMsg.text}</Alert>}
          <Button variant="contained" onClick={savePassword} disabled={pwdSaving || !curPwd || !newPwd} sx={{ mt: 2 }}>
            {pwdSaving ? 'Updating…' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
