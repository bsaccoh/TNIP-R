import { createTheme } from '@mui/material/styles';

// Operator brand colours — retained because they encode data (per-operator series).
export const OPERATOR_COLORS = {
  Orange: '#ea6a1e',
  Africell: '#7b3fa0',
  Qcell: '#5b2d8e',
  SierraTel: '#0284c7',
};
export const colorFor = (name, i = 0) =>
  OPERATOR_COLORS[name] || ['#2563eb', '#0891b2', '#16a34a', '#dc2626', '#7c3aed'][i % 5];

export const STATUS_COLOR = { PASS: '#16a34a', WARNING: '#d97706', FAIL: '#dc2626' };

// Neutral, professional accent used for headers/section rules.
export const ACCENT = '#2563eb';

const common = {
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: 'Inter, "Segoe UI", Roboto, system-ui, sans-serif',
    h4: { fontWeight: 600, fontSize: '1.5rem', letterSpacing: '-0.01em' },
    h5: { fontWeight: 600, fontSize: '1.25rem', letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-0.005em' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, fontSize: '0.8rem' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    overline: { fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.68rem' },
    caption: { letterSpacing: 0 },
  },
};

const palettes = {
  dark: {
    mode: 'dark',
    primary: { main: '#3b82f6' },
    secondary: { main: '#64748b' },
    success: { main: '#22c55e' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    info: { main: '#38bdf8' },
    background: { default: '#0b1120', paper: '#131a2b' },
    text: { primary: '#e6e9ef', secondary: '#94a3b8' },
    divider: 'rgba(148,163,184,0.16)',
  },
  light: {
    mode: 'light',
    primary: { main: '#2563eb' },
    secondary: { main: '#64748b' },
    success: { main: '#16a34a' },
    warning: { main: '#d97706' },
    error: { main: '#dc2626' },
    info: { main: '#0284c7' },
    background: { default: '#f6f7f9', paper: '#ffffff' },
    text: { primary: '#1f2937', secondary: '#6b7280' },
    divider: 'rgba(17,24,39,0.10)',
  },
};

/** Build the MUI theme for a given mode ('light' | 'dark'). */
export function makeTheme(mode) {
  const palette = palettes[mode] || palettes.dark;
  const isDark = palette.mode === 'dark';

  return createTheme({
    ...common,
    palette,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*::-webkit-scrollbar': { width: 8, height: 8 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? 'rgba(148,163,184,0.25)' : 'rgba(17,24,39,0.18)',
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: 'none',
            border: `1px solid ${theme.palette.divider}`,
          }),
          // Menus / popovers should keep a soft shadow, not a hard border.
          elevation8: { boxShadow: '0 8px 28px rgba(0,0,0,0.16)' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({ border: `1px solid ${theme.palette.divider}` }),
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500 },
          sizeSmall: { height: 22 },
          // Tone down filled status chips to soft tints.
          filledSuccess: ({ theme }) => softChip(theme.palette.success.main, isDark),
          filledWarning: ({ theme }) => softChip(theme.palette.warning.main, isDark),
          filledError:   ({ theme }) => softChip(theme.palette.error.main, isDark),
          filledInfo:    ({ theme }) => softChip(theme.palette.info.main, isDark),
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({ borderColor: theme.palette.divider }),
          head: ({ theme }) => ({
            fontWeight: 600,
            fontSize: '0.72rem',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            color: theme.palette.text.secondary,
            backgroundColor: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(17,24,39,0.03)',
          }),
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: ({ theme }) => ({ border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }),
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'default' },
      },
      MuiTab: {
        styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { fontSize: '0.72rem' } },
      },
      MuiListItemButton: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
    },
  });
}

// Soft-tinted status chip: low-saturation background + readable text.
function softChip(main, isDark) {
  return {
    backgroundColor: isDark ? `${main}26` : `${main}1f`,
    color: main,
    fontWeight: 600,
  };
}
