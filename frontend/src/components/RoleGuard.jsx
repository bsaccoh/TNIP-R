import { Navigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../auth/AuthContext';

export default function RoleGuard({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <LockIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant="h5" fontWeight={700}>Access Restricted</Typography>
        <Typography color="text.secondary">
          Your role (<strong>{user.role}</strong>) does not have permission to view this page.
        </Typography>
        <Button variant="outlined" onClick={() => window.history.back()}>Go Back</Button>
      </Box>
    );
  }
  return children;
}
