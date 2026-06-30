import { useThemeContext } from '@/context/ThemeContext';

export const palette = {
  primary:       '#1565C0',
  primaryLight:  '#1976D2',
  primaryDark:   '#0D47A1',
  accent:        '#29B6F6',
  success:       '#2E7D32',
  successLight:  '#43A047',
  warning:       '#E65100',
  warningLight:  '#EF6C00',
  error:         '#C62828',
  errorLight:    '#E53935',
  purple:        '#6A1B9A',
};

export const light = {
  bg:         '#F0F4F8',
  surface:    '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  border:     '#E2E8F0',
  text:       '#1A202C',
  textSub:    '#64748B',
  textMuted:  '#94A3B8',
  inputBg:    '#F8FAFC',
  shadow:     '#000',
};

export const dark = {
  bg:         '#0F1117',
  surface:    '#1A1D27',
  surfaceAlt: '#222535',
  border:     '#2D3148',
  text:       '#F1F5F9',
  textSub:    '#94A3B8',
  textMuted:  '#64748B',
  inputBg:    '#222535',
  shadow:     '#000',
};

export function useTheme() {
  const { isDark } = useThemeContext();
  return { ...(isDark ? dark : light), isDark, palette };
}

export const radius = { sm: 8, md: 12, lg: 16, xl: 24 };
export const space  = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const shadow = {
  sm:  { elevation: 2, shadowOpacity: 0.06, shadowRadius: 4,  shadowOffset: { width: 0, height: 1 } },
  md:  { elevation: 4, shadowOpacity: 0.08, shadowRadius: 8,  shadowOffset: { width: 0, height: 2 } },
  lg:  { elevation: 8, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
};
