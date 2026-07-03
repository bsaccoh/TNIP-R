import { Navigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../auth/AuthContext';

/**
 * Renders children if the user's role is in `roles` OR their effective
 * permissions include at least one entry from `permissions`.
 * Both props are optional; omitting both lets any authenticated user through.
 */
export default function RoleGuard({ roles, permissions: requiredPerms, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  // No guard at all → allow any authenticated user
  if (!roles?.length && !requiredPerms?.length) return children;

  const hasRole = roles?.includes(user.role) ?? false;
  const hasPerm = requiredPerms?.some((p) => user.permissions?.includes(p)) ?? false;

  if (!hasRole && !hasPerm) {
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
