export const COLORS = {
  excellent: '#2E7D32',
  good: '#558B2F',
  fair: '#F57F17',
  poor: '#BF360C',
  none: '#757575',
};

export function rsrpColor(rsrp: number | null): string {
  if (rsrp == null) return COLORS.none;
  if (rsrp >= -80) return COLORS.excellent;
  if (rsrp >= -90) return COLORS.good;
  if (rsrp >= -100) return COLORS.fair;
  return COLORS.poor;
}

export function rsrpLabel(rsrp: number | null): string {
  if (rsrp == null) return 'N/A';
  if (rsrp >= -80) return 'Excellent';
  if (rsrp >= -90) return 'Good';
  if (rsrp >= -100) return 'Fair';
  if (rsrp >= -110) return 'Poor';
  return 'No Signal';
}

export function sinrColor(sinr: number | null): string {
  if (sinr == null) return COLORS.none;
  if (sinr >= 20) return COLORS.excellent;
  if (sinr >= 10) return COLORS.good;
  if (sinr >= 0) return COLORS.fair;
  return COLORS.poor;
}

export function dlColor(dl: number | null): string {
  if (dl == null) return COLORS.none;
  if (dl >= 10000) return COLORS.excellent;
  if (dl >= 3000) return COLORS.good;
  if (dl >= 1000) return COLORS.fair;
  return COLORS.poor;
}
