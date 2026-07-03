import { Box, Paper, Stack, Typography } from '@mui/material';

/**
 * Consistent, restrained page header used across the app.
 *
 *   <PageHeader icon={<Icon/>} title="Spectrum Management"
 *               subtitle="Frequency assignments · interference tracking"
 *               actions={<Button/>} />
 *
 * Replaces the per-page full-bleed gradient banners with a neutral surface,
 * a subtle accent-tinted icon, and muted supporting text.
 */
export default function PageHeader({ icon, title, subtitle, actions }) {
  return (
    <Paper
      variant="outlined"
      sx={{ px: { xs: 2, md: 3 }, py: 2, mb: 3, borderRadius: 2 }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ flexWrap: 'wrap', rowGap: 1.5 }}
      >
        {icon && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 1.5,
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(59,130,246,0.14)' : 'rgba(37,99,235,0.10)'),
              color: 'primary.main',
              flexShrink: 0,
              '& svg': { fontSize: 24 },
            }}
          >
            {icon}
          </Box>
        )}

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h5" noWrap sx={{ lineHeight: 1.25 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {actions && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: 'center' }}>
            {actions}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
