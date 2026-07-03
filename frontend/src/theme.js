import { createTheme } from '@mui/material/styles';

// Shared brand + status tokens (mode-independent).
export const OPERATOR_COLORS = {
  Orange: '#ff7900',    // brand orange
  Africell: '#8e24aa',  // brand purple (magenta-leaning, to stay distinct from Qcell)
  Qcell: '#5b2d8e',     // brand purple (deep violet)
  SierraTel: '#00a3e0', // brand blue
};
export const colorFor = (name, i = 0) =>
  OPERATOR_COLORS[name] || ['#3da9fc', '#ef6c00', '#2e9e5b', '#e0413b', '#9c27b0'][i % 5];

export const STATUS_COLOR = { PASS: '#2e9e5b', WARNING: '#e6a700', FAIL: '#e0413b' };

const common = {
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'Inter, Roboto, system-ui, sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
};

const palettes = {
  dark: {
    mode: 'dark',
    primary: { main: '#3da9fc' },
    secondary: { main: '#ef6c00' },
    success: { main: '#2e9e5b' },
    warning: { main: '#e6a700' },
    error: { main: '#e0413b' },
    background: { default: '#0e1626', paper: '#16203a' },
    divider: 'rgba(255,255,255,0.08)',
  },
  light: {
    mode: 'light',
    primary: { main: '#1565c0' },
    secondary: { main: '#ef6c00' },
    success: { main: '#2e7d32' },
    warning: { main: '#ed6c02' },
    error: { main: '#d32f2f' },
    background: { default: '#f4f6fb', paper: '#ffffff' },
    divider: 'rgba(0,0,0,0.10)',
  },
};

/** Build the MUI theme for a given mode ('light' | 'dark'). */
export function makeTheme(mode) {
  return createTheme({
    ...common,
    palette: palettes[mode] || palettes.dark,
    components: {
      ...common.components,
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({ border: `1px solid ${theme.palette.divider}` }),
        },
      },
    },
  });
}
