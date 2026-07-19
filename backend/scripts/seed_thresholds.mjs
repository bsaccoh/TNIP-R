import { query } from '../src/config/db.js';

await query(`CREATE TABLE IF NOT EXISTS signal_thresholds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  technology VARCHAR(10) NOT NULL,
  metric VARCHAR(20) NOT NULL,
  label VARCHAR(50) NOT NULL,
  unit VARCHAR(10) NOT NULL DEFAULT '',
  pass_value DECIMAL(10,2),
  pass_direction ENUM('gte','lte') NOT NULL DEFAULT 'gte',
  bins JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tech_metric (technology, metric)
)`);

const defaults = [
  {
    technology: '3G', metric: 'rsrp', label: 'RSCP', unit: 'dBm',
    pass_value: -70, pass_direction: 'gte',
    bins: [
      { min: -70,  color: '#00AA00', label: 'Above -70 dBm',     tier: 'Good' },
      { min: -90,  color: '#FFFF00', label: '-90 to -70 dBm',    tier: 'Fair' },
      { min: -105, color: '#FF8C00', label: '-105 to -90 dBm',   tier: 'Fair/Poor' },
      { min: -200, color: '#CC0000', label: 'Below -105 dBm',    tier: 'Very Weak' },
    ],
  },
  {
    technology: '3G', metric: 'rsrq', label: 'Ec/No', unit: 'dB',
    pass_value: -10, pass_direction: 'gte',
    bins: [
      { min:  -6, color: '#00AA00', label: '>= -6 dB',       tier: 'Excellent' },
      { min: -12, color: '#FFFF00', label: '-12 to -6 dB',   tier: 'Good' },
      { min: -15, color: '#FF8C00', label: '-15 to -12 dB',  tier: 'Fair' },
      { min: -30, color: '#CC0000', label: 'Below -15 dB',   tier: 'Poor' },
    ],
  },
  {
    technology: '4G', metric: 'rsrp', label: 'RSRP', unit: 'dBm',
    pass_value: -100, pass_direction: 'gte',
    bins: [
      { min:  -80, color: '#00AA00', label: '>= -80 dBm',         tier: 'Excellent' },
      { min:  -90, color: '#FFFF00', label: '-90 to -80 dBm',     tier: 'Good' },
      { min: -100, color: '#FF8C00', label: '-100 to -90 dBm',    tier: 'Fair' },
      { min: -200, color: '#CC0000', label: 'Below -100 dBm',     tier: 'Poor' },
    ],
  },
  {
    technology: '4G', metric: 'rsrq', label: 'RSRQ', unit: 'dB',
    pass_value: -10, pass_direction: 'gte',
    bins: [
      { min: -10, color: '#00AA00', label: '>= -10 dB',      tier: 'Excellent' },
      { min: -15, color: '#FFFF00', label: '-15 to -10 dB',  tier: 'Good' },
      { min: -20, color: '#FF8C00', label: '-20 to -15 dB',  tier: 'Fair' },
      { min: -40, color: '#CC0000', label: 'Below -20 dB',   tier: 'Poor' },
    ],
  },
  {
    technology: '4G', metric: 'sinr', label: 'SINR', unit: 'dB',
    pass_value: 0, pass_direction: 'gte',
    bins: [
      { min:  20, color: '#00AA00', label: '>= 20 dB',    tier: 'Excellent' },
      { min:  13, color: '#FFFF00', label: '13 to 20 dB', tier: 'Good' },
      { min:   0, color: '#FF8C00', label: '0 to 13 dB',  tier: 'Fair' },
      { min: -20, color: '#CC0000', label: 'Below 0 dB',  tier: 'Poor' },
    ],
  },
  {
    technology: '2G', metric: 'rsrq', label: 'RxQual', unit: '',
    pass_value: 3, pass_direction: 'lte',
    bins: [
      { max: 1, color: '#00AA00', label: '0 - 1', tier: 'Excellent' },
      { max: 3, color: '#FFFF00', label: '2 - 3', tier: 'Good' },
      { max: 5, color: '#FF8C00', label: '4 - 5', tier: 'Fair' },
      { max: 7, color: '#CC0000', label: '6 - 7', tier: 'Poor' },
    ],
  },
  {
    technology: 'ALL', metric: 'dl_throughput', label: 'DL Throughput', unit: 'Kbps',
    pass_value: 10000, pass_direction: 'gte',
    bins: [
      { min: 20000, color: '#00AA00', label: '>= 20 Mbps', tier: 'Excellent' },
      { min: 10000, color: '#FFFF00', label: '10 - 20 Mbps', tier: 'Good' },
      { min: 5000, color: '#FF8C00', label: '5 - 10 Mbps', tier: 'Fair' },
      { min: 1000, color: '#CC0000', label: '1 - 5 Mbps', tier: 'Poor' },
      { min: 0, color: '#660000', label: '< 1 Mbps', tier: 'Very Poor' },
    ],
  },
  {
    technology: 'ALL', metric: 'ul_throughput', label: 'UL Throughput', unit: 'Kbps',
    pass_value: 5000, pass_direction: 'gte',
    bins: [
      { min: 10000, color: '#00AA00', label: '>= 10 Mbps', tier: 'Excellent' },
      { min: 5000, color: '#FFFF00', label: '5 - 10 Mbps', tier: 'Good' },
      { min: 2000, color: '#FF8C00', label: '2 - 5 Mbps', tier: 'Fair' },
      { min: 500, color: '#CC0000', label: '0.5 - 2 Mbps', tier: 'Poor' },
      { min: 0, color: '#660000', label: '< 0.5 Mbps', tier: 'Very Poor' },
    ],
  },
];

for (const d of defaults) {
  await query(
    `INSERT INTO signal_thresholds (technology, metric, label, unit, pass_value, pass_direction, bins)
     VALUES (:technology, :metric, :label, :unit, :pass_value, :pass_direction, :bins)
     ON DUPLICATE KEY UPDATE label=VALUES(label), unit=VALUES(unit), pass_value=VALUES(pass_value),
       pass_direction=VALUES(pass_direction), bins=VALUES(bins)`,
    { ...d, bins: JSON.stringify(d.bins) }
  );
}

const rows = await query('SELECT technology, metric, label FROM signal_thresholds ORDER BY technology, metric');
console.log('Seeded:', rows.map(r => `${r.technology}/${r.metric} (${r.label})`).join(', '));
process.exit(0);
