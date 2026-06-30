import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, TextField, Button, Typography, Alert, Stack } from '@mui/material';
import CellTowerIcon from '@mui/icons-material/CellTower';
import { useAuth } from '../auth/AuthContext';
import { useColorMode } from '../theme/ColorMode';

export default function Login() {
  const { login } = useAuth();
  const { mode } = useColorMode();
  const navigate = useNavigate();
  const bg = mode === 'dark'
    ? 'radial-gradient(1200px 600px at 50% -10%, #1b2c52 0%, #0e1626 60%)'
    : 'radial-gradient(1200px 600px at 50% -10%, #dce7f7 0%, #f4f6fb 60%)';
  const [email, setEmail] = useState('admin@tnipr.gov');
  const [password, setPassword] = useState('Admin@12345');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: bg }}>
      <Card sx={{ width: 400, maxWidth: '92vw' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack alignItems="center" spacing={1} mb={3}>
            <CellTowerIcon color="primary" sx={{ fontSize: 44 }} />
            <Typography variant="h5">TNIP-R</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Telecom Network Intelligence Platform — Regulatory Edition
            </Typography>
          </Stack>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={submit}>
            <Stack spacing={2}>
              <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth autoFocus />
              <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
              <Button type="submit" variant="contained" size="large" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign In'}
              </Button>
            </Stack>
          </form>
          <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={2}>
            Demo: admin@tnipr.gov / Admin@12345
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
