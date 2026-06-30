import { Card, CardContent, Typography, Box, Chip, CircularProgress, Alert, useTheme } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { STATUS_COLOR } from '../theme';

/** Theme-aware Recharts <Tooltip> contentStyle (adapts to light/dark). */
export function useChartTip() {
  const theme = useTheme();
  return {
    background: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    color: theme.palette.text.primary,
  };
}

export function KpiCard({ label, value, unit, sub, color = 'primary.main', icon }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <Typography variant="overline" color="text.secondary">{label}</Typography>
          {icon}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color }}>
          {value ?? '—'}<Typography component="span" variant="h6" color="text.secondary">{unit}</Typography>
        </Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

export function StatusChip({ status, size = 'small' }) {
  const c = STATUS_COLOR[status] || '#888';
  return (
    <Chip size={size} label={status}
      sx={{ bgcolor: `${c}22`, color: c, fontWeight: 700, border: `1px solid ${c}` }} />
  );
}

export function Trend({ trend }) {
  if (trend === 'UP') return <TrendingUpIcon sx={{ color: 'success.main' }} />;
  if (trend === 'DOWN') return <TrendingDownIcon sx={{ color: 'error.main' }} />;
  return <TrendingFlatIcon sx={{ color: 'text.secondary' }} />;
}

export function Loading({ height = 200 }) {
  return <Box sx={{ display: 'grid', placeItems: 'center', height }}><CircularProgress /></Box>;
}

export function EmptyState({ message = 'No data yet.', hint }) {
  return (
    <Alert severity="info" sx={{ my: 2 }}>
      {message}{hint && <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>{hint}</Typography>}
    </Alert>
  );
}

export const fmt = (v, d = 2) => (v == null || isNaN(v) ? '—' : Number(v).toFixed(d));
