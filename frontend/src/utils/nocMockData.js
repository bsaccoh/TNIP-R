export const COLORS = {
  Orange: '#FF7900',
  Africell: '#E3000F',
  Qcell: '#D32F2F',
  SierraTel: '#005B9F',
  Critical: '#ef4444',
  Major: '#f59e0b',
  Minor: '#eab308',
  Healthy: '#10b981',
  Warning: '#f59e0b',
  Down: '#ef4444',
  Operational: '#10b981',
  Degraded: '#f59e0b',
  Offline: '#ef4444'
};

export const mockAlarms = [
  { operator: 'Orange', Critical: 5, Major: 18, Minor: 51 },
  { operator: 'Africell', Critical: 4, Major: 16, Minor: 45 },
  { operator: 'Qcell', Critical: 2, Major: 7, Minor: 19 },
  { operator: 'SierraTel', Critical: 1, Major: 4, Minor: 13 },
];

export const mockOutages = [
  { time: '00:00', Orange: 1, Africell: 1, Qcell: 0, SierraTel: 0 },
  { time: '04:00', Orange: 0, Africell: 1, Qcell: 0, SierraTel: 0 },
  { time: '08:00', Orange: 2, Africell: 1, Qcell: 1, SierraTel: 0 },
  { time: '12:00', Orange: 6, Africell: 5, Qcell: 2, SierraTel: 1 },
  { time: '16:00', Orange: 3, Africell: 3, Qcell: 1, SierraTel: 1 },
  { time: '20:00', Orange: 1, Africell: 1, Qcell: 1, SierraTel: 0 },
  { time: '24:00', Orange: 1, Africell: 0, Qcell: 1, SierraTel: 0 },
];

export const mockRootCause = [
  { name: 'Transmission', size: 400, fill: '#005B9F' },
  { name: 'Radio', size: 300, fill: '#FF7900' },
  { name: 'Power', size: 200, fill: '#ef4444' },
  { name: 'Configuration', size: 100, fill: '#10b981' },
];

export const mockQos = [
  { operator: 'Orange', latency: 42, packetLoss: 0.1 },
  { operator: 'Africell', latency: 45, packetLoss: 0.15 },
  { operator: 'Qcell', latency: 55, packetLoss: 0.4 },
  { operator: 'SierraTel', latency: 70, packetLoss: 0.8 },
];

export const mockRegionalDcr = [
  { region: 'Western Area', Orange: 0.6, Africell: 0.7, Qcell: 1.1, SierraTel: 1.5 },
  { region: 'Bo', Orange: 0.9, Africell: 1.1, Qcell: 1.4, SierraTel: 1.8 },
  { region: 'Kenema', Orange: 1.1, Africell: 1.3, Qcell: 1.8, SierraTel: 2.2 },
  { region: 'Makeni', Orange: 1.4, Africell: 1.6, Qcell: 2.5, SierraTel: 3.1 },
  { region: 'Kono', Orange: 2.1, Africell: 2.5, Qcell: 3.8, SierraTel: 5.2 },
];

export const mockDcrTrend = [
  { time: '00:00', Orange: 0.5, Africell: 0.6, Qcell: 0.8, SierraTel: 1.2 },
  { time: '04:00', Orange: 0.4, Africell: 0.5, Qcell: 0.7, SierraTel: 1.1 },
  { time: '08:00', Orange: 0.7, Africell: 0.8, Qcell: 1.2, SierraTel: 1.8 },
  { time: '12:00', Orange: 0.9, Africell: 1.1, Qcell: 1.5, SierraTel: 2.5 },
  { time: '16:00', Orange: 0.8, Africell: 0.9, Qcell: 1.4, SierraTel: 2.2 },
  { time: '20:00', Orange: 0.6, Africell: 0.7, Qcell: 1.0, SierraTel: 1.5 },
  { time: '24:00', Orange: 0.5, Africell: 0.6, Qcell: 0.8, SierraTel: 1.2 },
];

export const mockTraffic = [
  { time: '00:00', Orange_Up: 120, Orange_Down: 850, Africell_Up: 100, Africell_Down: 750, Qcell_Up: 40, Qcell_Down: 250, SierraTel_Up: 15, SierraTel_Down: 90 },
  { time: '04:00', Orange_Up: 80, Orange_Down: 450, Africell_Up: 70, Africell_Down: 400, Qcell_Up: 20, Qcell_Down: 150, SierraTel_Up: 10, SierraTel_Down: 50 },
  { time: '08:00', Orange_Up: 250, Orange_Down: 1500, Africell_Up: 220, Africell_Down: 1300, Qcell_Up: 80, Qcell_Down: 450, SierraTel_Up: 30, SierraTel_Down: 180 },
  { time: '12:00', Orange_Up: 350, Orange_Down: 2200, Africell_Up: 310, Africell_Down: 1900, Qcell_Up: 120, Qcell_Down: 700, SierraTel_Up: 45, SierraTel_Down: 250 },
  { time: '16:00', Orange_Up: 300, Orange_Down: 1800, Africell_Up: 270, Africell_Down: 1600, Qcell_Up: 100, Qcell_Down: 600, SierraTel_Up: 40, SierraTel_Down: 220 },
  { time: '20:00', Orange_Up: 400, Orange_Down: 2800, Africell_Up: 350, Africell_Down: 2400, Qcell_Up: 150, Qcell_Down: 900, SierraTel_Up: 60, SierraTel_Down: 350 },
  { time: '24:00', Orange_Up: 200, Orange_Down: 1200, Africell_Up: 180, Africell_Down: 1000, Qcell_Up: 60, Qcell_Down: 350, SierraTel_Up: 25, SierraTel_Down: 120 },
];

export const mockCellStatus = [
  { operator: 'Orange', Healthy: 1250, Warning: 140, Critical: 45, Down: 5 },
  { operator: 'Africell', Healthy: 1100, Warning: 120, Critical: 30, Down: 3 },
  { operator: 'Qcell', Healthy: 400, Warning: 50, Critical: 10, Down: 1 },
  { operator: 'SierraTel', Healthy: 150, Warning: 30, Critical: 8, Down: 2 },
];

export const mockSiteStatus = [
  { operator: 'Orange', Operational: 500, Degraded: 45, Offline: 2 },
  { operator: 'Africell', Operational: 450, Degraded: 30, Offline: 1 },
  { operator: 'Qcell', Operational: 150, Degraded: 15, Offline: 0 },
  { operator: 'SierraTel', Operational: 80, Degraded: 10, Offline: 2 },
];

export const mockCongestedCells = [
  { cellId: 'ORN-WA-014', operator: 'Orange', utilization: 98 },
  { cellId: 'AFR-BO-092', operator: 'Africell', utilization: 95 },
  { cellId: 'ORN-KN-033', operator: 'Orange', utilization: 92 },
  { cellId: 'QCL-WA-005', operator: 'Qcell', utilization: 89 },
  { cellId: 'AFR-MK-112', operator: 'Africell', utilization: 88 },
  { cellId: 'SRT-WA-002', operator: 'SierraTel', utilization: 86 },
  { cellId: 'ORN-WA-105', operator: 'Orange', utilization: 85 },
  { cellId: 'AFR-KN-044', operator: 'Africell', utilization: 84 },
  { cellId: 'QCL-BO-012', operator: 'Qcell', utilization: 82 },
  { cellId: 'ORN-MK-077', operator: 'Orange', utilization: 80 },
];

export const mockMapData = [
  { cellId: 'ORN-WA-014', operator: 'Orange', lat: 8.460555, lng: -11.779889, status: 'Warning', label: 'Freetown (Central)', callDrops: 85, congestion: 90 },
  { cellId: 'AFR-BO-092', operator: 'Africell', lat: 7.960555, lng: -11.739889, status: 'Critical', label: 'Bo', callDrops: 120, congestion: 95 },
  { cellId: 'ORN-KN-033', operator: 'Orange', lat: 7.876543, lng: -11.189123, status: 'Healthy', label: 'Kenema', callDrops: 10, congestion: 40 },
  { cellId: 'QCL-WA-005', operator: 'Qcell', lat: 8.480555, lng: -11.759889, status: 'Healthy', label: 'Freetown (East)', callDrops: 5, congestion: 30 },
  { cellId: 'AFR-MK-112', operator: 'Africell', lat: 8.880555, lng: -12.039889, status: 'Warning', label: 'Makeni', callDrops: 75, congestion: 88 },
  { cellId: 'SRT-WA-002', operator: 'SierraTel', lat: 8.450555, lng: -11.809889, status: 'Down', label: 'Freetown (West)', callDrops: 200, congestion: 100 },
  { cellId: 'ORN-WA-105', operator: 'Orange', lat: 8.465555, lng: -11.785889, status: 'Healthy', label: 'Freetown (CBD)', callDrops: 15, congestion: 50 },
  { cellId: 'AFR-KN-044', operator: 'Africell', lat: 7.886543, lng: -11.199123, status: 'Healthy', label: 'Kenema North', callDrops: 8, congestion: 35 },
  { cellId: 'QCL-BO-012', operator: 'Qcell', lat: 7.970555, lng: -11.749889, status: 'Warning', label: 'Bo Central', callDrops: 60, congestion: 82 },
  { cellId: 'ORN-MK-077', operator: 'Orange', lat: 8.890555, lng: -12.049889, status: 'Healthy', label: 'Makeni East', callDrops: 12, congestion: 45 },
  { cellId: 'AFR-KO-021', operator: 'Africell', lat: 8.650000, lng: -10.983333, status: 'Critical', label: 'Koidu', callDrops: 150, congestion: 98 },
  { cellId: 'ORN-KO-045', operator: 'Orange', lat: 8.660000, lng: -10.973333, status: 'Down', label: 'Koidu South', callDrops: 180, congestion: 100 },
];

export const mockResourceUtil = {
  All: { CPU: 65, Memory: 60, CE: 72, PRB: 68, Transport: 75 },
  Orange: { CPU: 75, Memory: 68, CE: 82, PRB: 78, Transport: 85 },
  Africell: { CPU: 70, Memory: 65, CE: 75, PRB: 70, Transport: 80 },
  Qcell: { CPU: 55, Memory: 45, CE: 60, PRB: 50, Transport: 65 },
  SierraTel: { CPU: 80, Memory: 75, CE: 85, PRB: 88, Transport: 90 },
};

// --- NEW DATA (Network Inventory & Adv KPIs) ---

export const mockMonthlyPerformance = [
  { month: 'Jan', Orange: 98.1, Africell: 97.5, Qcell: 94.2, SierraTel: 88.5 },
  { month: 'Feb', Orange: 97.8, Africell: 96.9, Qcell: 95.1, SierraTel: 89.2 },
  { month: 'Mar', Orange: 99.2, Africell: 98.5, Qcell: 96.8, SierraTel: 90.1 },
  { month: 'Apr', Orange: 99.0, Africell: 98.1, Qcell: 95.5, SierraTel: 91.5 },
  { month: 'May', Orange: 98.5, Africell: 97.8, Qcell: 96.0, SierraTel: 90.8 },
  { month: 'Jun', Orange: 99.5, Africell: 98.9, Qcell: 97.2, SierraTel: 92.4 },
];

export const mockWeeklySparkline = [
  { day: 'Mon', value: 98 }, { day: 'Tue', value: 97.5 }, { day: 'Wed', value: 99 }, 
  { day: 'Thu', value: 98.5 }, { day: 'Fri', value: 99.2 }, { day: 'Sat', value: 98.8 }, { day: 'Sun', value: 99.5 }
];

export const mockVendorShare = [
  { name: 'Huawei', value: 45, fill: '#0ea5e9' },
  { name: 'Ericsson', value: 30, fill: '#8b5cf6' },
  { name: 'ZTE', value: 15, fill: '#ec4899' },
  { name: 'Nokia', value: 10, fill: '#14b8a6' },
];

export const mockCellsByTech = [
  { operator: 'Orange', '2G': 800, '3G': 1200, '4G': 1500, '5G': 100 },
  { operator: 'Africell', '2G': 750, '3G': 1100, '4G': 1300, '5G': 50 },
  { operator: 'Qcell', '2G': 300, '3G': 400, '4G': 500, '5G': 0 },
  { operator: 'SierraTel', '2G': 150, '3G': 200, '4G': 100, '5G': 0 },
];

export const mockSitesByTech = [
  { name: '2G Only', value: 400, fill: '#f43f5e' },
  { name: '3G Only', value: 800, fill: '#eab308' },
  { name: '4G Capable', value: 1800, fill: '#3b82f6' },
  { name: '5G Capable', value: 150, fill: '#10b981' },
];

export const mockSitesByOperator = [
  { operator: 'Orange', count: 1200 },
  { operator: 'Africell', count: 950 },
  { operator: 'Qcell', count: 400 },
  { operator: 'SierraTel', count: 150 },
];

export const mockUnknownCounters = [
  { category: 'Radio', count: 145 },
  { category: 'Core', count: 82 },
  { category: 'Transport', count: 48 },
  { category: 'Power', count: 12 },
];

export const mockCounterGrowth = [
  { date: '1st', Orange: 14000, Africell: 12000, Qcell: 5000, SierraTel: 2000 },
  { date: '8th', Orange: 14500, Africell: 12500, Qcell: 5200, SierraTel: 2100 },
  { date: '15th', Orange: 15200, Africell: 13000, Qcell: 5500, SierraTel: 2300 },
  { date: '22nd', Orange: 15800, Africell: 13500, Qcell: 6000, SierraTel: 2500 },
  { date: '29th', Orange: 16100, Africell: 14000, Qcell: 6500, SierraTel: 2800 },
];

export const mockAiAnomalies = [
  { time: '08:00', severity: 8, metric: 'Call Drops', duration: 15, operator: 'Orange' },
  { time: '09:30', severity: 4, metric: 'Latency', duration: 5, operator: 'Africell' },
  { time: '11:15', severity: 9, metric: 'Congestion', duration: 45, operator: 'Orange' },
  { time: '14:00', severity: 6, metric: 'Throughput', duration: 20, operator: 'Qcell' },
  { time: '16:45', severity: 3, metric: 'Call Drops', duration: 10, operator: 'Africell' },
  { time: '19:10', severity: 7, metric: 'Packet Loss', duration: 25, operator: 'SierraTel' },
  { time: '22:00', severity: 2, metric: 'Latency', duration: 5, operator: 'Qcell' },
];

export const mockThroughputTrend = [
  { time: '00:00', DL: 120, UL: 45 },
  { time: '04:00', DL: 90, UL: 30 },
  { time: '08:00', DL: 350, UL: 120 },
  { time: '12:00', DL: 480, UL: 160 },
  { time: '16:00', DL: 450, UL: 150 },
  { time: '20:00', DL: 500, UL: 180 },
  { time: '24:00', DL: 200, UL: 80 },
];

export const mockCssrTrend = [
  { time: '00:00', Orange: 99.5, Africell: 99.2, Qcell: 98.1, SierraTel: 95.0 },
  { time: '04:00', Orange: 99.6, Africell: 99.3, Qcell: 98.2, SierraTel: 95.5 },
  { time: '08:00', Orange: 98.1, Africell: 97.5, Qcell: 96.0, SierraTel: 91.0 },
  { time: '12:00', Orange: 97.5, Africell: 96.8, Qcell: 95.5, SierraTel: 89.5 },
  { time: '16:00', Orange: 97.8, Africell: 97.0, Qcell: 96.1, SierraTel: 90.5 },
  { time: '20:00', Orange: 98.5, Africell: 98.0, Qcell: 97.2, SierraTel: 92.5 },
  { time: '24:00', Orange: 99.2, Africell: 98.8, Qcell: 97.5, SierraTel: 94.0 },
];

export const mockKpiRadar = [
  { subject: 'Availability', Orange: 99, Africell: 98, Qcell: 95, SierraTel: 85, fullMark: 100 },
  { subject: 'Accessibility', Orange: 98, Africell: 97, Qcell: 96, SierraTel: 88, fullMark: 100 },
  { subject: 'Retainability', Orange: 97, Africell: 96, Qcell: 94, SierraTel: 86, fullMark: 100 },
  { subject: 'Throughput', Orange: 95, Africell: 92, Qcell: 85, SierraTel: 70, fullMark: 100 },
  { subject: 'Mobility', Orange: 96, Africell: 95, Qcell: 90, SierraTel: 80, fullMark: 100 },
  { subject: 'Latency', Orange: 94, Africell: 93, Qcell: 92, SierraTel: 82, fullMark: 100 },
];
